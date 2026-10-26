import * as THREE from 'three'
import { EARTH_RADIUS, latLonToVector } from './disasterData'

/* Surface offset radius: sits right on the spherical surface, below clouds */
export const REGION_SURFACE_RADIUS = EARTH_RADIUS + 0.0028
export const BORDER_SURFACE_RADIUS = EARTH_RADIUS + 0.0034

/**
 * Prepares real disaster visual representations on the 3D Earth.
 * - Point events are mapped to their EXACT reported coordinates with clean, restrained surface markers.
 * - Solid surface regions are generated ONLY when genuine polygon boundary geometry is supplied by the data source.
 * - Artificial track swaths, giant circle approximations, and excessive clustering are completely eliminated.
 */
export function prepareDisasterVisuals(disasters = []) {
  const validDisasters = disasters.filter(
    (d) =>
      typeof d.lat === 'number' &&
      typeof d.lon === 'number' &&
      !isNaN(d.lat) &&
      !isNaN(d.lon) &&
      d.lat >= -89 &&
      d.lat <= 89 &&
      d.lon >= -180 &&
      d.lon <= 180 &&
      // Exclude null island (0, 0) defaults unless specifically in the Gulf of Guinea
      !(Math.abs(d.lat) < 0.001 && Math.abs(d.lon) < 0.001)
  )

  if (validDisasters.length === 0) return []

  // Deduplicate events with identical IDs or co-located events (within 0.05 deg ~ 5 km)
  const seenIds = new Set()
  const uniqueEvents = []

  validDisasters.forEach((d) => {
    if (d.id && seenIds.has(d.id)) return
    if (d.id) seenIds.add(d.id)

    // Check for near-identical duplicate coordinate in same category
    const isDuplicate = uniqueEvents.some(
      (u) =>
        u.type === d.type &&
        Math.abs(u.lat - d.lat) < 0.04 &&
        Math.abs(u.lon - d.lon) < 0.04
    )

    if (!isDuplicate) {
      uniqueEvents.push(d)
    }
  })

  const regions = uniqueEvents.map((event) => {
    const isCyclone =
      event.type === 'chakravat' ||
      event.module === 'vayu' ||
      (event.name && event.name.toLowerCase().includes('chakravat'))

    // Check if reliable polygon geometry is supplied by NASA EONET
    const hasPolygonData =
      Array.isArray(event.coordinates) &&
      event.coordinates.some((c) => Array.isArray(c.polygon) && c.polygon.length >= 3)

    let fillGeometry = null
    let borderGeometry = null
    let hasReliablePolygon = false

    if (hasPolygonData) {
      const polyCoord = event.coordinates.find((c) => Array.isArray(c.polygon) && c.polygon.length >= 3)
      if (polyCoord) {
        const polyResult = createSphericalPolygonGeometry(polyCoord.polygon)
        if (polyResult) {
          fillGeometry = polyResult.geometry
          borderGeometry = polyResult.borderGeometry
          hasReliablePolygon = true
        }
      }
    }

    return {
      id: `disaster-${event.id}`,
      primaryDisasterId: event.id,
      primaryDisaster: event,
      cluster: [event],
      clusterCount: 1,
      centerLat: event.lat,
      centerLon: event.lon,
      color: event.color,
      sanskritName: event.sanskritName || event.name,
      module: event.module,
      moduleTitle: event.moduleTitle,
      type: event.type,
      severity: event.severity,
      location: event.location,
      coordsFormatted: event.coordsFormatted || `${Math.abs(event.lat).toFixed(2)}°${event.lat >= 0 ? 'N' : 'S'}, ${Math.abs(event.lon).toFixed(2)}°${event.lon >= 0 ? 'E' : 'W'}`,
      source: event.source,
      sourceUrl: event.sourceUrl,
      isRecent: event.isRecent,
      time: event.time,
      isCyclone,
      hasReliablePolygon,
      fillGeometry,
      borderGeometry,
    }
  })

  return regions
}

// Backward-compatibility alias
export const clusterDisastersIntoRegions = prepareDisasterVisuals

/**
 * Creates a spherical polygon mesh geometry strictly from verified polygon boundary coordinates.
 * Vertices: array of [latitude, longitude].
 */
export function createSphericalPolygonGeometry(polygonCoords) {
  if (!polygonCoords || polygonCoords.length < 3) return null

  // Calculate polygon centroid
  let sumLat = 0
  let sumLon = 0
  polygonCoords.forEach((p) => {
    sumLat += p[0]
    sumLon += p[1]
  })
  const centLat = sumLat / polygonCoords.length
  const centLon = sumLon / polygonCoords.length

  const positions = []
  const normals = []
  const indices = []

  // Centroid vertex (index 0)
  const centVec = latLonToVector(centLat, centLon, REGION_SURFACE_RADIUS)
  positions.push(centVec.x, centVec.y, centVec.z)
  const cNorm = centVec.clone().normalize()
  normals.push(cNorm.x, cNorm.y, cNorm.z)

  // Outer ring vertices
  const borderPoints = []
  polygonCoords.forEach((p, idx) => {
    const v = latLonToVector(p[0], p[1], REGION_SURFACE_RADIUS)
    positions.push(v.x, v.y, v.z)
    const n = v.clone().normalize()
    normals.push(n.x, n.y, n.z)

    borderPoints.push(latLonToVector(p[0], p[1], BORDER_SURFACE_RADIUS))

    const currentIdx = idx + 1
    const nextIdx = idx + 1 === polygonCoords.length ? 1 : idx + 2
    indices.push(0, currentIdx, nextIdx)
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)

  const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints)

  return { geometry, borderGeometry }
}
