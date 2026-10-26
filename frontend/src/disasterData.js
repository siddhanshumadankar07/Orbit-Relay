import * as THREE from 'three'

export const EARTH_RADIUS = 1.22

/* ── Disaster Modules ─────────────────────────────────────── */
export const SANSKRIT_MODULES = [
  {
    id: 'drishti',
    code: 'Observation',
    title: 'Environment & All Hazards',
    description: 'Earth observation and environmental data.',
    iconName: 'Radar',
    color: '#22c55e',
    activeCount: 14,
  },
  {
    id: 'varuna',
    code: 'Water',
    title: 'Floods & Water Hazards',
    description: 'Flood maps, river flows, and ocean conditions.',
    iconName: 'Waves',
    color: '#38bdf8',
    activeCount: 3,
  },
  {
    id: 'agni',
    code: 'Fire',
    title: 'Wildfires & Heat',
    description: 'Fire anomalies, active wildfire boundaries, and smoke.',
    iconName: 'Flame',
    color: '#ef4444',
    activeCount: 2,
  },
  {
    id: 'prithvi',
    code: 'Earth',
    title: 'Earthquakes & Agriculture',
    description: 'Ground motion, soil moisture, and regional analysis.',
    iconName: 'Sprout',
    color: '#eab308',
    activeCount: 4,
  },
  {
    id: 'vayu',
    code: 'Weather',
    title: 'Cyclones & Weather',
    description: 'Tropical cyclone tracking and wind speeds.',
    iconName: 'Wind',
    color: '#f97316',
    activeCount: 1,
  },
  {
    id: 'parvat',
    code: 'Terrain',
    title: 'Landslides & Mountain Hazards',
    description: 'Slope stability, debris flows, and landslide data.',
    iconName: 'Mountain',
    color: '#a855f7',
    activeCount: 1,
  },
]

/* ── Active Baseline Disasters ────────────────────────────── */
export const ACTIVE_DISASTERS = [
  {
    id: 'landslide-1',
    name: 'Landslide',
    sanskritName: 'Landslide',
    location: 'Uttarakhand, India',
    lat: 30.39,
    lon: 79.06,
    coordsFormatted: '30.39°N, 79.06°E',
    severity: 'High',
    time: '2h ago',
    module: 'parvat',
    moduleTitle: 'Terrain',
    type: 'bhuskhalan',
    color: '#a855f7', // Purple: Bhuskhalan
    source: 'ISRO Disaster Management Support',
    detail: 'A landslide along a Himalayan mountain road has blocked traffic with debris.',
    riskMetric: 'High risk',
  },
  {
    id: 'flood-1',
    name: 'Flood',
    sanskritName: 'Flood',
    location: 'Gujarat, India',
    lat: 22.30,
    lon: 72.60,
    coordsFormatted: '22.30°N, 72.60°E',
    severity: 'High',
    time: '3h ago',
    module: 'varuna',
    moduleTitle: 'Water',
    type: 'jalaplav',
    color: '#38bdf8', // Blue: Varuna
    source: 'Central Water Commission & Sentinel SAR',
    detail: 'Flood levels in the coastal region have risen by 1.8 m. A flood warning is active.',
    riskMetric: 'Severe conditions',
  },
  {
    id: 'wildfire-1',
    name: 'Wildfire',
    sanskritName: 'Wildfire',
    location: 'Mongolia',
    lat: 46.86,
    lon: 103.85,
    coordsFormatted: '46.86°N, 103.85°E',
    severity: 'Medium',
    time: '5h ago',
    module: 'agni',
    moduleTitle: 'Fire',
    type: 'vanagni',
    color: '#ef4444', // Red: Agni
    source: 'MODIS & VIIRS Thermal Hotspot Detection',
    detail: 'A steppe wildfire has spread across 310 km² in Arkhangai Province, with winds driving it eastward.',
    riskMetric: 'Expansion in progress',
  },
  {
    id: 'drought-1',
    name: 'Drought',
    sanskritName: 'Drought',
    location: 'Australia',
    lat: -24.27,
    lon: 133.78,
    coordsFormatted: '24.27°S, 133.78°E',
    severity: 'Medium',
    time: '7h ago',
    module: 'drishti',
    moduleTitle: 'Observation',
    type: 'paryavaran',
    color: '#22c55e', // Green: Paryavaran
    source: 'Bureau of Meteorology NDVI Index',
    detail: 'Low soil moisture is causing dry conditions across vegetation and agricultural areas.',
    riskMetric: 'Water shortage',
  },
  {
    id: 'cyclone-1',
    name: 'Cyclone',
    sanskritName: 'Cyclone',
    location: 'Bay of Bengal',
    lat: 14.20,
    lon: 88.10,
    coordsFormatted: '14.20°N, 88.10°E',
    severity: 'High',
    time: '8h ago',
    module: 'vayu',
    moduleTitle: 'Weather',
    type: 'chakravat',
    color: '#f97316', // Orange: Chakravat
    source: 'India Meteorological Department',
    detail: 'A severe cyclone is forming in the Bay of Bengal, with wind speeds of 125 km/h.',
    riskMetric: 'Severe winds',
  },
  {
    id: 'earthquake-1',
    name: 'Earthquake',
    sanskritName: 'Earthquake',
    location: 'Sumatra, Indian Ocean',
    lat: -0.78,
    lon: 100.35,
    coordsFormatted: '0.78°S, 100.35°E',
    severity: 'Medium',
    time: '12h ago',
    module: 'prithvi',
    moduleTitle: 'Earth',
    type: 'bhukampa',
    color: '#eab308', // Yellow: Bhukampa
    source: 'BMKG & USGS',
    detail: 'A magnitude 5.8 earthquake occurred. Ground shaking has been recorded.',
    riskMetric: 'Earthquake hazard',
  },
]

/* ── Satellite Fleet Information ─────────────────────────── */
export const SATELLITE_FLEET = [
  {
    category: 'Earth Observation (EO)',
    onlineCount: 6,
    totalCount: 6,
    statusDot: 'green',
    satellites: ['SENTINEL-2A', 'SENTINEL-2B', 'LANDSAT-8', 'LANDSAT-9', 'RESOURCESAT-2A', 'CARTOSAT-3'],
  },
  {
    category: 'Weather & Climate',
    onlineCount: 4,
    totalCount: 4,
    statusDot: 'green',
    satellites: ['INSAT-3DR', 'INSAT-3DS', 'AQUA (MODIS)', 'TERRA'],
  },
  {
    category: 'Disaster Monitoring',
    onlineCount: 2,
    totalCount: 4,
    statusDot: 'green',
    satellites: ['RISAT-1A (SAR)', 'EOS-04', 'OCEANSAT-3 (Adaptive)', 'RISAT-2BR1 (Ready)'],
  },
  {
    category: 'Communications',
    onlineCount: 0,
    totalCount: 0,
    statusDot: 'gray',
    satellites: ['GSAT-7A (Secure)', 'GSAT-30 (Relay)'],
  },
]

/* ── Mission Queue ───────────────────────────────────────── */
export const MISSION_QUEUE_DATA = [
  {
    id: 'MSN-WILD-01',
    title: 'Wildfire Monitoring',
    location: 'Mongolia',
    satellite: 'TERRA-1 • EO',
    status: 'Processing',
    statusClass: 'status-processing',
    type: 'vanagni',
    module: 'agni',
    priority: 'Medium',
  },
  {
    id: 'MSN-FLD-02',
    title: 'Flood Assessment',
    location: 'Gujarat',
    satellite: 'AQUA-2 • Weather',
    status: 'Queued',
    statusClass: 'status-queued',
    type: 'jalaplav',
    module: 'varuna',
    priority: 'High',
  },
  {
    id: 'MSN-LAND-03',
    title: 'Landslide Analysis',
    location: 'Uttarakhand',
    satellite: 'SENTINEL-3 • EO',
    status: 'Queued',
    statusClass: 'status-queued',
    type: 'bhuskhalan',
    module: 'parvat',
    priority: 'High',
  },
]

/* ── Spherical Coordinate Conversion ─────────────────────── */
export function latLonToVector(lat, lon, radius = EARTH_RADIUS + 0.02) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return new THREE.Vector3(x, y, z)
}

/* ── NASA EONET Category to Disaster Module & Color Mapping ─ */
/**
 * Red: Fire — fires and wildfires.
 * Orange: Weather — cyclones and hurricanes.
 * Blue: Water — floods and water hazards.
 * Yellow: Earth — earthquakes.
 * Purple: Terrain — landslides.
 * Green: Observation — other environmental events.
 */
export function mapEonetCategoryToModule(categories = []) {
  const catLower = categories.map((c) => String(c).toLowerCase()).join(' ')

  if (catLower.includes('fire') || catLower.includes('wildfire') || catLower.includes('volcano')) {
    return {
      module: 'agni',
      moduleTitle: 'Fire',
      sanskritName: catLower.includes('volcano') ? 'Volcano' : 'Wildfire',
      type: 'vanagni',
      color: '#ef4444', // Red: Agni
      severity: 'High',
      riskMetric: catLower.includes('volcano') ? 'Volcanic eruption' : 'Wildfire boundary',
    }
  }
  if (
    catLower.includes('storm') ||
    catLower.includes('cyclone') ||
    catLower.includes('hurricane') ||
    catLower.includes('typhoon')
  ) {
    return {
      module: 'vayu',
      moduleTitle: 'Weather',
      sanskritName: 'Cyclone',
      type: 'chakravat',
      color: '#f97316', // Orange: Chakravat
      severity: 'High',
      riskMetric: 'Cyclone winds',
    }
  }
  if (catLower.includes('flood') || catLower.includes('water') || catLower.includes('ice')) {
    return {
      module: 'varuna',
      moduleTitle: 'Water',
      sanskritName: catLower.includes('ice') ? 'Ice hazard' : 'Flood',
      type: 'jalaplav',
      color: '#38bdf8', // Blue: Varuna
      severity: 'High',
      riskMetric: catLower.includes('ice') ? 'Ice monitoring' : 'Flood alert',
    }
  }
  if (catLower.includes('earthquake') || catLower.includes('seismic')) {
    return {
      module: 'prithvi',
      moduleTitle: 'Earth',
      sanskritName: 'Earthquake',
      type: 'bhukampa',
      color: '#eab308', // Yellow: Bhukampa
      severity: 'High',
      riskMetric: 'Seismic activity',
    }
  }
  if (catLower.includes('landslide') || catLower.includes('debris') || catLower.includes('mudslide')) {
    return {
      module: 'parvat',
      moduleTitle: 'Terrain',
      sanskritName: 'Landslide',
      type: 'bhuskhalan',
      color: '#a855f7', // Purple: Bhuskhalan
      severity: 'High',
      riskMetric: 'Landslide risk',
    }
  }

  // Fallback: other environmental events, including temperature extremes and drought
  return {
    module: 'drishti',
    moduleTitle: 'Observation',
    sanskritName: 'Environmental event',
    type: 'paryavaran',
    color: '#22c55e', // Green: Paryavaran
    severity: 'Medium',
    riskMetric: 'Environmental monitoring',
  }
}

/* ── NASA EONET Data Transformer ─────────────────────────── */
export function transformEonetDisaster(event) {
  const coordsList = Array.isArray(event.coordinates) ? event.coordinates : []
  const latestCoord = coordsList.length > 0 ? coordsList[coordsList.length - 1] : null
  const lat = latestCoord ? Number(latestCoord.latitude) : null
  const lon = latestCoord ? Number(latestCoord.longitude) : null

  let coordsFormatted = 'Coordinates unavailable'
  if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    const ns = lat >= 0 ? 'N' : 'S'
    const ew = lon >= 0 ? 'E' : 'W'
    coordsFormatted = `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`
  }

  const categories = Array.isArray(event.categories) ? event.categories : []
  const moduleMeta = mapEonetCategoryToModule(categories)

  const eventTitle = event.title || moduleMeta.sanskritName
  const titleParts = eventTitle.split(',')
  const name = titleParts[0].trim()
  const location =
    titleParts.length > 1
      ? titleParts.slice(1).join(', ').trim()
      : event.description || 'Global monitoring'

  const dateStr = event.updated || (latestCoord && latestCoord.date)
  let time = 'New'
  let isRecent = true
  let fullDate = 'Date unavailable'

  if (dateStr) {
    try {
      const eventTime = new Date(dateStr)
      const now = new Date()
      const diffMs = Math.max(0, now.getTime() - eventTime.getTime())
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffHours < 1) {
        time = 'Just now'
      } else if (diffHours < 24) {
        time = `${diffHours}h ago`
      } else if (diffDays <= 7) {
        time = `${diffDays}d ago`
      } else if (diffDays <= 60) {
        time = `${diffDays}d ago`
      } else {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        time = `${eventTime.getUTCDate()} ${months[eventTime.getUTCMonth()]}`
      }

      isRecent = diffDays <= 60
      fullDate = eventTime.toUTCString()
    } catch {
      time = 'Recorded'
      isRecent = false
    }
  }

  const sources = Array.isArray(event.sources) ? event.sources : []
  const primarySource = sources[0] || {}
  const sourceName = primarySource.id
    ? `NASA EONET (${primarySource.id})`
    : 'NASA EONET'
  const sourceUrl =
    primarySource.url ||
    `https://eonet.gsfc.nasa.gov/api/v3/events/${event.id}`

  return {
    id: event.id,
    name,
    sanskritName: moduleMeta.sanskritName,
    location,
    lat,
    lon,
    coordsFormatted,
    severity: moduleMeta.severity,
    time,
    date: dateStr,
    fullDate,
    isRecent,
    module: moduleMeta.module,
    moduleTitle: moduleMeta.moduleTitle,
    type: moduleMeta.type,
    color: moduleMeta.color,
    source: sourceName,
    sourceUrl,
    detail:
      event.description ||
      `Active disaster recorded by NASA EONET in the ${moduleMeta.moduleTitle} module.`,
    riskMetric: moduleMeta.riskMetric,
    categories,
    coordinates: coordsList,
    isLiveEonet: true,
  }
}
