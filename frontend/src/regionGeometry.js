import * as THREE from 'three'
import { EARTH_RADIUS, latLonToVector } from './disasterData'

/* Surface offset radius: sits right on the spherical surface, below clouds */
export const REGION_SURFACE_RADIUS = EARTH_RADIUS + 0.0028
export const BORDER_SURFACE_RADIUS = EARTH_RADIUS + 0.0034

/**
 * Cluster raw disasters by hazard module and geographic proximity.
 * Aggregates nearby events of the same type within 3.5 degrees into one regional area.
 * Keeps region footprints geographically modest (1.0° - 2.4°) to prevent over-coloring entire countries.
 */
export function clusterDisastersIntoRegions(disasters = []) {
  const validDisasters = disasters.filter(
    (d) =>
      typeof d.lat === 'number' &&
      typeof d.lon === 'number' &&
      !isNaN(d.lat) &&
      !isNaN(d.lon) &&
      d.lat >= -89 &&
      d.lat <= 89 &&
      d.lon >= -180 &&
      d.lon <= 180
  )

  if (validDisasters.length === 0) return []

  // Group by module first so different hazard types remain distinct
  const byModule = {}
  validDisasters.forEach((d) => {
    const mod = d.module || 'drishti'
    if (!byModule[mod]) byModule[mod] = []
    byModule[mod].push(d)
  })

  const regions = []
  let regionCounter = 1

  Object.entries(byModule).forEach(([_mod, events]) => {
    const visited = new Set()

    events.forEach((event, idx) => {
      if (visited.has(idx)) return

      const cluster = [event]
      visited.add(idx)

      // Cluster events within spatial proximity (3.5 degrees ~380 km)
      for (let j = idx + 1; j < events.length; j++) {
        if (visited.has(j)) continue
        const other = events[j]
        const dLat = event.lat - other.lat
        const cosLat = Math.cos(((event.lat + other.lat) / 2) * (Math.PI / 180))
        let dLon = Math.abs(event.lon - other.lon)
        if (dLon > 180) dLon = 360 - dLon
        const distDeg = Math.sqrt(dLat * dLat + (dLon * cosLat) * (dLon * cosLat))

        if (distDeg <= 3.5) {
          cluster.push(other)
          visited.add(j)
        }
      }

      // Compute cluster centroid
      let sumLat = 0
      let sumLon = 0
      cluster.forEach((c) => {
        sumLat += c.lat
        sumLon += c.lon
      })

      const centerLat = sumLat / cluster.length
      const centerLon = sumLon / cluster.length

      const primary = cluster[0]
      const isCyclone =
        primary.type === 'chakravat' ||
        primary.module === 'vayu' ||
        (primary.name && primary.name.toLowerCase().includes('chakravat'))

      // Modest, geographically realistic angular radius in degrees:
      // Single event: 1.1 degrees (~120 km)
      // Clustered events: up to 2.4 degrees (~260 km)
      const clusterSpan = Math.min(1.3, (cluster.length - 1) * 0.25)
      const radiusDeg = Math.min(2.4, Math.max(1.0, 1.1 + clusterSpan))

      // Only check for cyclone track if it's actually a cyclone and supplied by official API
      let validCycloneTrack = null
      if (isCyclone && Array.isArray(primary.coordinates) && primary.coordinates.length >= 2) {
        // Validate that points are strictly consecutive and local (< 3.5 deg apart, no antimeridian jumps)
        const pts = primary.coordinates
          .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
          .map((p) => ({ lat: p.latitude, lon: p.longitude }))

        let valid = true
        for (let i = 0; i < pts.length - 1; i++) {
          const dLt = pts[i + 1].lat - pts[i].lat
          const dLn = Math.abs(pts[i + 1].lon - pts[i].lon)
          if (Math.sqrt(dLt * dLt + dLn * dLn) > 3.5 || dLn > 5.0) {
            valid = false
            break
          }
        }
        if (valid && pts.length >= 2) {
          validCycloneTrack = pts
        }
      }

      regions.push({
        id: `region-${primary.id || regionCounter++}`,
        primaryDisasterId: primary.id,
        primaryDisaster: primary,
        cluster,
        clusterCount: cluster.length,
        centerLat,
        centerLon,
        radiusDeg,
        color: primary.color,
        sanskritName: primary.sanskritName || primary.name,
        module: primary.module,
        moduleTitle: primary.moduleTitle,
        type: primary.type,
        severity: primary.severity,
        location: primary.location,
        coordsFormatted: `${Math.abs(centerLat).toFixed(2)}°${centerLat >= 0 ? 'N' : 'S'}, ${Math.abs(centerLon).toFixed(2)}°${centerLon >= 0 ? 'E' : 'W'}`,
        source: primary.source,
        sourceUrl: primary.sourceUrl,
        isRecent: cluster.some((c) => c.isRecent),
        time: primary.time,
        isCyclone,
        hasRealTrack: Boolean(validCycloneTrack),
        trackCoords: validCycloneTrack,
        isApproximate: !validCycloneTrack,
      })
    })
  })

  return regions
}

/**
 * Creates a spherical polygon mesh geometry that conforms strictly to the Earth sphere.
 * Generates an organic boundary polygon and triangulates it into spherical cap rings.
 */
export function createSphericalCapGeometry(
  centerLat,
  centerLon,
  radiusDeg,
  numSides = 32,
  seed = 1,
  isCyclone = false
) {
  const geometry = new THREE.BufferGeometry()
  const positions = []
  const normals = []
  const indices = []

  // Center vertex
  const centerVec = latLonToVector(centerLat, centerLon, REGION_SURFACE_RADIUS)
  positions.push(centerVec.x, centerVec.y, centerVec.z)
  const cNorm = centerVec.clone().normalize()
  normals.push(cNorm.x, cNorm.y, cNorm.z)

  // Cosine of latitude to scale longitude offset accurately, clamped to prevent blowup
  const cosLat = Math.max(0.2, Math.cos(centerLat * (Math.PI / 180)))
  const maxDeltaLon = Math.min(3.8, radiusDeg / cosLat)

  // Generate boundary points in lat/lon
  const boundaryLatLons = []
  for (let i = 0; i < numSides; i++) {
    const alpha = (i / numSides) * Math.PI * 2

    let pert = 1.0 + 0.06 * Math.sin(3 * alpha + seed) + 0.03 * Math.cos(5 * alpha + seed * 1.5)
    if (isCyclone) {
      pert = 1.0 + 0.10 * Math.sin(2 * alpha + seed)
    }

    const bLat = Math.max(-88, Math.min(88, centerLat + radiusDeg * Math.cos(alpha) * pert))
    const bLon = centerLon + maxDeltaLon * Math.sin(alpha) * pert

    boundaryLatLons.push({ lat: bLat, lon: bLon })
  }

  // 3 concentric rings of vertices for spherical curvature conformity
  const numRings = 3
  for (let r = 1; r <= numRings; r++) {
    const frac = r / numRings
    for (let i = 0; i < numSides; i++) {
      const b = boundaryLatLons[i]
      const vLat = centerLat + (b.lat - centerLat) * frac
      const vLon = centerLon + (b.lon - centerLon) * frac

      const v = latLonToVector(vLat, vLon, REGION_SURFACE_RADIUS)
      positions.push(v.x, v.y, v.z)
      const n = v.clone().normalize()
      normals.push(n.x, n.y, n.z)
    }
  }

  // Indices:
  // Ring 0 is center (index 0)
  // Inner fan: center to ring 1
  for (let i = 0; i < numSides; i++) {
    const next = (i + 1) % numSides
    indices.push(0, 1 + i, 1 + next)
  }

  // Connecting intermediate rings
  for (let r = 1; r < numRings; r++) {
    const innerStart = 1 + (r - 1) * numSides
    const outerStart = 1 + r * numSides

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides
      const inCurrent = innerStart + i
      const inNext = innerStart + next
      const outCurrent = outerStart + i
      const outNext = outerStart + next

      indices.push(inCurrent, outCurrent, outNext)
      indices.push(inCurrent, outNext, inNext)
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)

  return { geometry, boundaryLatLons }
}

/**
 * Creates a crisp border contour line loop geometry hugging the perimeter of the region.
 */
export function createBoundaryOutlineGeometry(boundaryLatLons) {
  const points = boundaryLatLons.map((p) =>
    latLonToVector(p.lat, p.lon, BORDER_SURFACE_RADIUS)
  )
  return new THREE.BufferGeometry().setFromPoints(points)
}

/**
 * Creates a subtle trajectory line on the sphere for storms with verified consecutive track coordinates.
 */
export function createTrackLineGeometry(trackCoords) {
  if (!trackCoords || trackCoords.length < 2) return null
  const points = trackCoords.map((p) =>
    latLonToVector(p.lat, p.lon, BORDER_SURFACE_RADIUS)
  )
  return new THREE.BufferGeometry().setFromPoints(points)
}
