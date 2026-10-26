import * as THREE from 'three'

export const EARTH_RADIUS = 1.22

/* ── Sanskrit Disaster Modules (in Roman/English Letters) ──── */
export const SANSKRIT_MODULES = [
  {
    id: 'drishti',
    code: 'Drishti',
    title: 'Paryavaran & Sarva Aapada',
    description: 'Bhoomi nirikshan tatha paryavaran jankari.',
    iconName: 'Radar',
    color: '#22c55e',
    activeCount: 14,
  },
  {
    id: 'varuna',
    code: 'Varuna',
    title: 'Jalaplav & Jala Sankat',
    description: 'Jalaplav manchitra, nadi pravah, tatha samudra suchana.',
    iconName: 'Waves',
    color: '#38bdf8',
    activeCount: 3,
  },
  {
    id: 'agni',
    code: 'Agni',
    title: 'Vanagni & Ushna Sankat',
    description: 'Agni vishamata, sakriya vanagni seema tatha dhooma.',
    iconName: 'Flame',
    color: '#ef4444',
    activeCount: 2,
  },
  {
    id: 'prithvi',
    code: 'Prithvi',
    title: 'Bhukampa & Krishi',
    description: 'Bhoomi kampa, mridha aadrata tatha kshetrīya vishleshan.',
    iconName: 'Sprout',
    color: '#eab308',
    activeCount: 4,
  },
  {
    id: 'vayu',
    code: 'Vayu',
    title: 'Chakravat & Vayu Sankat',
    description: 'Ushnakatibandhiya chakravat gati tatha vayu vega.',
    iconName: 'Wind',
    color: '#f97316',
    activeCount: 1,
  },
  {
    id: 'parvat',
    code: 'Parvat',
    title: 'Bhuskhalan & Parvat Sankat',
    description: 'Parvat dhalan sthirata, malba pravah tatha bhuskhalan jankari.',
    iconName: 'Mountain',
    color: '#a855f7',
    activeCount: 1,
  },
]

/* ── 5 Active Baseline Disasters (Sanskrit in Roman letters) ─ */
export const ACTIVE_DISASTERS = [
  {
    id: 'landslide-1',
    name: 'Bhuskhalan',
    sanskritName: 'Bhuskhalan',
    location: 'Uttarakhand, Bharat',
    lat: 30.39,
    lon: 79.06,
    coordsFormatted: '30.39°N, 79.06°E',
    severity: 'Uchha',
    time: '2h purvi',
    module: 'parvat',
    moduleTitle: 'Parvat',
    type: 'bhuskhalan',
    color: '#a855f7', // Purple: Bhuskhalan
    source: 'ISRO Disaster Management Support / Nirdarshan',
    detail: 'Himalaya parvatiya margavar bhuskhalan. Margavar malba pasarlyamule yatayat band.',
    riskMetric: 'Uchha Sankat',
  },
  {
    id: 'flood-1',
    name: 'Jalaplav',
    sanskritName: 'Jalaplav',
    location: 'Gujarat, Bharat',
    lat: 22.30,
    lon: 72.60,
    coordsFormatted: '22.30°N, 72.60°E',
    severity: 'Uchha',
    time: '3h purvi',
    module: 'varuna',
    moduleTitle: 'Varuna',
    type: 'jalaplav',
    color: '#38bdf8', // Blue: Varuna
    source: 'Central Water Commission & Sentinel SAR / Nirdarshan',
    detail: 'Kinarpatti kshetramadhye jalaplav patali 1.8m ne vadhli. Jalaplav chetavni sakriya.',
    riskMetric: 'Gambhira Sthiti',
  },
  {
    id: 'wildfire-1',
    name: 'Vanagni',
    sanskritName: 'Vanagni',
    location: 'Mongolia',
    lat: 46.86,
    lon: 103.85,
    coordsFormatted: '46.86°N, 103.85°E',
    severity: 'Madhyam',
    time: '5h purvi',
    module: 'agni',
    moduleTitle: 'Agni',
    type: 'vanagni',
    color: '#ef4444', // Red: Agni
    source: 'MODIS & VIIRS Thermal Hotspot Detection / Nirdarshan',
    detail: 'Arkhangai prantat steppe vanagni 310 km² kshetravarti pasarli. Vayu veg mule purvekade vistaran.',
    riskMetric: 'Vistaran Chalu',
  },
  {
    id: 'drought-1',
    name: 'Paryavaran',
    sanskritName: 'Paryavaran',
    location: 'Australia',
    lat: -24.27,
    lon: 133.78,
    coordsFormatted: '24.27°S, 133.78°E',
    severity: 'Madhyam',
    time: '7h purvi',
    module: 'drishti',
    moduleTitle: 'Drishti',
    type: 'paryavaran',
    color: '#22c55e', // Green: Paryavaran
    source: 'Bureau of Meteorology NDVI Index / Nirdarshan',
    detail: 'Mridha aadrata kamtarta. Vanaspati aani krishi kshetramadhye shushkata sthiti.',
    riskMetric: 'Jala Nyunata',
  },
  {
    id: 'cyclone-1',
    name: 'Chakravat',
    sanskritName: 'Chakravat',
    location: 'Bangaal Upasagar',
    lat: 14.20,
    lon: 88.10,
    coordsFormatted: '14.20°N, 88.10°E',
    severity: 'Uchha',
    time: '8h purvi',
    module: 'vayu',
    moduleTitle: 'Vayu',
    type: 'chakravat',
    color: '#f97316', // Orange: Chakravat
    source: 'IMD Chakravat Vibhag / Nirdarshan',
    detail: 'Bangaal upasagarat teevra chakravat nirmiti, vayu vega 125 km/h.',
    riskMetric: 'Teevra Vayu',
  },
  {
    id: 'earthquake-1',
    name: 'Bhukampa',
    sanskritName: 'Bhukampa',
    location: 'Sumatra, Hind Mahasagar',
    lat: -0.78,
    lon: 100.35,
    coordsFormatted: '0.78°S, 100.35°E',
    severity: 'Madhyam',
    time: '12h purvi',
    module: 'prithvi',
    moduleTitle: 'Prithvi',
    type: 'bhukampa',
    color: '#eab308', // Yellow: Bhukampa
    source: 'BMKG & USGS / Nirdarshan',
    detail: 'Bhoomi kampa 5.8 tivrata. Mridha kampan nondavle gele.',
    riskMetric: 'Bhukampa Dhoka',
  },
]

/* ── Satellite Fleet Information (Sanskrit in Roman letters) ─ */
export const SATELLITE_FLEET = [
  {
    category: 'Prithvi Nirikshan (EO)',
    onlineCount: 6,
    totalCount: 6,
    statusDot: 'green',
    satellites: ['SENTINEL-2A', 'SENTINEL-2B', 'LANDSAT-8', 'LANDSAT-9', 'RESOURCESAT-2A', 'CARTOSAT-3'],
  },
  {
    category: 'Vayu & Jalvayu',
    onlineCount: 4,
    totalCount: 4,
    statusDot: 'green',
    satellites: ['INSAT-3DR', 'INSAT-3DS', 'AQUA (MODIS)', 'TERRA'],
  },
  {
    category: 'Aapada Nirikshan',
    onlineCount: 2,
    totalCount: 4,
    statusDot: 'green',
    satellites: ['RISAT-1A (SAR)', 'EOS-04', 'OCEANSAT-3 (Anukulan)', 'RISAT-2BR1 (Sajjata)'],
  },
  {
    category: 'Sanchar',
    onlineCount: 0,
    totalCount: 0,
    statusDot: 'gray',
    satellites: ['GSAT-7A (Surakshit)', 'GSAT-30 (Punarprasaran)'],
  },
]

/* ── Mission Queue (Sanskrit in Roman letters) ────────────── */
export const MISSION_QUEUE_DATA = [
  {
    id: 'MSN-WILD-01',
    title: 'Vanagni Nirikshan',
    location: 'Mongolia',
    satellite: 'TERRA-1 • EO',
    status: 'Prakriya Chalu',
    statusClass: 'status-processing',
    type: 'vanagni',
    module: 'agni',
    priority: 'Madhyam',
  },
  {
    id: 'MSN-FLD-02',
    title: 'Jalaplav Mulyankan',
    location: 'Gujarat',
    satellite: 'AQUA-2 • Vayu',
    status: 'Panktibaddha',
    statusClass: 'status-queued',
    type: 'jalaplav',
    module: 'varuna',
    priority: 'Uchha',
  },
  {
    id: 'MSN-LAND-03',
    title: 'Bhuskhalan Vishleshan',
    location: 'Uttarakhand',
    satellite: 'SENTINEL-3 • EO',
    status: 'Panktibaddha',
    statusClass: 'status-queued',
    type: 'bhuskhalan',
    module: 'parvat',
    priority: 'Uchha',
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

/* ── NASA EONET Category to Sanskrit Module & Color Mapping ─ */
/**
 * Red: Agni — fires and wildfires.
 * Orange: Chakravat — cyclones and hurricanes.
 * Blue: Varuna — floods and water hazards.
 * Yellow: Bhukampa — earthquakes.
 * Purple: Bhuskhalan — landslides.
 * Green: Paryavaran — other environmental events.
 */
export function mapEonetCategoryToModule(categories = []) {
  const catLower = categories.map((c) => String(c).toLowerCase()).join(' ')

  if (catLower.includes('fire') || catLower.includes('wildfire') || catLower.includes('volcano')) {
    return {
      module: 'agni',
      moduleTitle: 'Agni',
      sanskritName: catLower.includes('volcano') ? 'Jwalamukhi' : 'Vanagni',
      type: 'vanagni',
      color: '#ef4444', // Red: Agni
      severity: 'Uchha',
      riskMetric: catLower.includes('volcano') ? 'Jwalamukhi Utpat' : 'Vanagni Seema',
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
      moduleTitle: 'Vayu',
      sanskritName: 'Chakravat',
      type: 'chakravat',
      color: '#f97316', // Orange: Chakravat
      severity: 'Uchha',
      riskMetric: 'Chakravat Vayu',
    }
  }
  if (catLower.includes('flood') || catLower.includes('water') || catLower.includes('ice')) {
    return {
      module: 'varuna',
      moduleTitle: 'Varuna',
      sanskritName: catLower.includes('ice') ? 'Himakshetra' : 'Jalaplav',
      type: 'jalaplav',
      color: '#38bdf8', // Blue: Varuna
      severity: 'Uchha',
      riskMetric: catLower.includes('ice') ? 'Hima Nirikshan' : 'Jalaplav Suchana',
    }
  }
  if (catLower.includes('earthquake') || catLower.includes('seismic')) {
    return {
      module: 'prithvi',
      moduleTitle: 'Prithvi',
      sanskritName: 'Bhukampa',
      type: 'bhukampa',
      color: '#eab308', // Yellow: Bhukampa
      severity: 'Uchha',
      riskMetric: 'Bhukampa Tarang',
    }
  }
  if (catLower.includes('landslide') || catLower.includes('debris') || catLower.includes('mudslide')) {
    return {
      module: 'parvat',
      moduleTitle: 'Parvat',
      sanskritName: 'Bhuskhalan',
      type: 'bhuskhalan',
      color: '#a855f7', // Purple: Bhuskhalan
      severity: 'Uchha',
      riskMetric: 'Bhuskhalan Sankat',
    }
  }

  // Fallback: Paryavaran (other environmental events including temperature extremes, drought)
  return {
    module: 'drishti',
    moduleTitle: 'Drishti',
    sanskritName: 'Paryavaran',
    type: 'paryavaran',
    color: '#22c55e', // Green: Paryavaran
    severity: 'Madhyam',
    riskMetric: 'Paryavaran Nirikshan',
  }
}

/* ── Name Sanitizer for Roman Sanskrit Vocabulary ─────────── */
function sanitizeEventTitle(rawTitle, defaultSanskritName) {
  if (!rawTitle) return defaultSanskritName

  let t = rawTitle
    .replace(/\bWildfire\b/gi, 'Vanagni')
    .replace(/\bFire\b/gi, 'Agni')
    .replace(/\bVolcano\b/gi, 'Jwalamukhi')
    .replace(/\bCyclone\b/gi, 'Chakravat')
    .replace(/\bHurricane\b/gi, 'Chakravat')
    .replace(/\bTyphoon\b/gi, 'Chakravat')
    .replace(/\bStorm\b/gi, 'Chakravat')
    .replace(/\bFlood\b/gi, 'Jalaplav')
    .replace(/\bFloods\b/gi, 'Jalaplav')
    .replace(/\bFlooding\b/gi, 'Jalaplav')
    .replace(/\bEarthquake\b/gi, 'Bhukampa')
    .replace(/\bLandslide\b/gi, 'Bhuskhalan')
    .replace(/\bWind\b/gi, 'Vayu')
    .replace(/\bIce\b/gi, 'Hima')

  // If the title didn't match any hazard keyword, prefix with the Sanskrit hazard type
  const lower = t.toLowerCase()
  if (
    !lower.includes('vanagni') &&
    !lower.includes('agni') &&
    !lower.includes('chakravat') &&
    !lower.includes('jalaplav') &&
    !lower.includes('bhukampa') &&
    !lower.includes('bhuskhalan') &&
    !lower.includes('paryavaran')
  ) {
    t = `${defaultSanskritName} — ${t}`
  }

  return t
}

/* ── NASA EONET Data Transformer ─────────────────────────── */
export function transformEonetDisaster(event) {
  const coordsList = Array.isArray(event.coordinates) ? event.coordinates : []
  const latestCoord = coordsList.length > 0 ? coordsList[coordsList.length - 1] : null
  const lat = latestCoord ? Number(latestCoord.latitude) : null
  const lon = latestCoord ? Number(latestCoord.longitude) : null

  let coordsFormatted = 'Nirdeshanka Anuplabdha'
  if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    const ns = lat >= 0 ? 'N' : 'S'
    const ew = lon >= 0 ? 'E' : 'W'
    coordsFormatted = `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`
  }

  const categories = Array.isArray(event.categories) ? event.categories : []
  const moduleMeta = mapEonetCategoryToModule(categories)

  const rawTitle = event.title || moduleMeta.sanskritName
  const sanitizedTitle = sanitizeEventTitle(rawTitle, moduleMeta.sanskritName)
  const titleParts = sanitizedTitle.split(',')
  const name = titleParts[0].trim()
  const location =
    titleParts.length > 1
      ? titleParts.slice(1).join(', ').trim()
      : event.description || 'Jagatik Nirikshan'

  const dateStr = event.updated || (latestCoord && latestCoord.date)
  let time = 'Navin'
  let isRecent = true
  let fullDate = 'Dinank Anuplabdha'

  if (dateStr) {
    try {
      const eventTime = new Date(dateStr)
      const now = new Date()
      const diffMs = Math.max(0, now.getTime() - eventTime.getTime())
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffHours < 1) {
        time = 'Adhuna'
      } else if (diffHours < 24) {
        time = `${diffHours}h purvi`
      } else if (diffDays <= 7) {
        time = `${diffDays}d purvi`
      } else if (diffDays <= 60) {
        time = `${diffDays}d purvi`
      } else {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        time = `${eventTime.getUTCDate()} ${months[eventTime.getUTCMonth()]}`
      }

      isRecent = diffDays <= 60
      fullDate = eventTime.toUTCString()
    } catch {
      time = 'Abhilikhita'
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
      `NASA EONET aani ${moduleMeta.moduleTitle} vibhagantargat nondvileli sakriya aapada.`,
    riskMetric: moduleMeta.riskMetric,
    categories,
    coordinates: coordsList,
    isLiveEonet: true,
  }
}
