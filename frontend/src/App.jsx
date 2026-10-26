import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import EarthScene from './EarthScene'
import {
  ACTIVE_DISASTERS,
  SANSKRIT_MODULES,
  SATELLITE_FLEET,
  MISSION_QUEUE_DATA,
  transformEonetDisaster,
} from './disasterData'
import {
  Home,
  Globe2,
  AlertTriangle,
  Radio,
  BarChart3,
  FileText,
  Settings,
  Search,
  User,
  Bell,
  ChevronRight,
  Flame,
  Waves,
  Wind,
  Sprout,
  Mountain,
  Sparkles,
  Plus,
  X,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import './App.css'

/* ── Backend API Endpoints ───────────────────────────────── */
const BACKEND_BASE = 'http://127.0.0.1:8001'

/* ── Backend Health Hook ─────────────────────────────────── */
function useBackendHealth() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        let res
        try {
          res = await fetch('/health', { signal: AbortSignal.timeout(2500) })
        } catch {
          res = await fetch(`${BACKEND_BASE}/health`, { signal: AbortSignal.timeout(2500) })
        }
        if (!cancelled) setOnline(Boolean(res && res.ok))
      } catch {
        if (!cancelled) setOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return online
}

/* ── NASA EONET Disaster Data Hook ───────────────────────── */
function useDisasterData() {
  const [disasters, setDisasters] = useState(ACTIVE_DISASTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [meta, setMeta] = useState({
    source: 'NASA EONET',
    fetchedAt: null,
    count: ACTIVE_DISASTERS.length,
    endpointUsed: 'http://127.0.0.1:8001/disasters (via /disasters proxy)',
  })

  useEffect(() => {
    let cancelled = false

    const loadDisasters = async () => {
      const candidateEndpoints = [
        { url: '/disasters', label: 'http://127.0.0.1:8001/disasters (Vite proxy /disasters)' },
        { url: `${BACKEND_BASE}/disasters`, label: 'http://127.0.0.1:8001/disasters (Direct CORS)' },
      ]

      let succeeded = false
      let lastError = null

      for (const ep of candidateEndpoints) {
        try {
          const response = await fetch(ep.url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(14000),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          const rawList = Array.isArray(data.disasters) ? data.disasters : []

          if (!cancelled) {
            if (rawList.length > 0) {
              const transformed = rawList.map(transformEonetDisaster)
              setDisasters(transformed)
              setMeta({
                source: data.source || 'NASA EONET',
                fetchedAt: data.fetched_at || new Date().toISOString(),
                count: transformed.length,
                endpointUsed: ep.label,
              })
            } else {
              setDisasters(ACTIVE_DISASTERS)
              setMeta((prev) => ({
                ...prev,
                fetchedAt: data.fetched_at || new Date().toISOString(),
                count: ACTIVE_DISASTERS.length,
                endpointUsed: ep.label,
              }))
            }
            setError(null)
            setLoading(false)
          }

          succeeded = true
          break
        } catch (err) {
          lastError = err
        }
      }

      if (!succeeded && !cancelled) {
        setError(lastError ? lastError.message : 'Connection to FastAPI backend at http://127.0.0.1:8001 failed')
        setDisasters(ACTIVE_DISASTERS)
        setLoading(false)
      }
    }

    loadDisasters()

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setRetryKey((k) => k + 1)
  }, [])

  return { disasters, loading, error, meta, refetch }
}

/* ── Live ISS Telemetry Hook ──────────────────────────────── */
function useLiveIssPosition() {
  const [issPosition, setIssPosition] = useState({
    latitude: 45.12,
    longitude: 12.34,
    altitude: 420.0,
    velocity: 27600.0,
    visibility: 'daylight',
    timestamp: 1792995400,
    source: 'WhereTheISSAt (NORAD #25544)',
    is_live: false,
    status: 'connecting',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchPosition = async () => {
      try {
        const candidateEndpoints = [
          '/iss-position',
          `${BACKEND_BASE}/iss-position`,
        ]
        let data = null
        for (const ep of candidateEndpoints) {
          try {
            const res = await fetch(ep, { signal: AbortSignal.timeout(6000) })
            if (res.ok) {
              data = await res.json()
              break
            }
          } catch {
            // try next endpoint
          }
        }
        if (!cancelled && data && typeof data.latitude === 'number') {
          setIssPosition(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPosition()
    const timer = setInterval(fetchPosition, 8000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return { issPosition, loading }
}

/* ── Honest AI Analysis Hook (Local Ollama / Factual) ─────── */

function useAiAnalysis() {
  const [analysis, setAnalysis] = useState({
    summary: 'Connecting to local Llama analysis...',
    model: 'Connecting...',
    ollama_connected: false,
    timestamp: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function fetchAnalysis() {
      try {
        const res = await fetch(`${BACKEND_BASE}/ai-analysis`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`Backend returned HTTP ${res.status}`)
        }

        const data = await res.json()

        if (!data.summary) {
          throw new Error('No summary returned by backend')
        }

        if (!cancelled) setAnalysis(data)
      } catch (error) {
        if (!cancelled) {
          setAnalysis({
            summary: `Could not load Llama analysis: ${error.message}`,
            model: 'Connection error',
            ollama_connected: false,
            timestamp: null,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAnalysis()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { analysis, loading }
}


export default function App() {
  const [activeNav, setActiveNav] = useState('home')
  const [selectedDisasterId, setSelectedDisasterId] = useState(null)
  const [activeModuleFilter, setActiveModuleFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRotate, setAutoRotate] = useState(true)
  const [missions, setMissions] = useState(MISSION_QUEUE_DATA)
  const [showNewMissionModal, setShowNewMissionModal] = useState(false)
  const [showFleetModal, setShowFleetModal] = useState(false)
  const [selectedFleetCategory, setSelectedFleetCategory] = useState(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [currentUtcTime, setCurrentUtcTime] = useState(() => new Date().toISOString())
  const searchInputRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentUtcTime(new Date().toISOString()), 1000)
    return () => clearInterval(timer)
  }, [])

  const backendOnline = useBackendHealth()
  const { issPosition } = useLiveIssPosition()
  const { analysis: aiAnalysis } = useAiAnalysis()
  const {
    disasters,
    loading: disastersLoading,
    error: disastersError,
    meta: disastersMeta,
    refetch: refetchDisasters,
  } = useDisasterData()

  // Derive current active disaster id cleanly
  const activeDisasterId = useMemo(() => {
    if (selectedDisasterId && disasters.some((d) => d.id === selectedDisasterId)) {
      return selectedDisasterId
    }
    return disasters[0]?.id || 'landslide-1'
  }, [disasters, selectedDisasterId])

  // Selected disaster object
  const selectedDisaster = useMemo(() => {
    return (
      disasters.find((d) => d.id === activeDisasterId) ||
      disasters[0] ||
      ACTIVE_DISASTERS[0]
    )
  }, [disasters, activeDisasterId])

  // Dynamically compute module counts from real disasters
  const dynamicModules = useMemo(() => {
    return SANSKRIT_MODULES.map((mod) => {
      const count =
        mod.id === 'drishti'
          ? disasters.length
          : disasters.filter((d) => d.module === mod.id).length
      return {
        ...mod,
        activeCount: count,
      }
    })
  }, [disasters])

  // Filtered disaster list (by search query or selected module)
  const filteredDisasters = useMemo(() => {
    let list = disasters

    if (activeModuleFilter) {
      list = list.filter((d) => d.module === activeModuleFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.location && d.location.toLowerCase().includes(q)) ||
          (d.coordsFormatted && d.coordsFormatted.toLowerCase().includes(q)) ||
          (d.type && d.type.toLowerCase().includes(q)) ||
          (d.severity && d.severity.toLowerCase().includes(q)) ||
          (d.moduleTitle && d.moduleTitle.toLowerCase().includes(q)) ||
          (d.detail && d.detail.toLowerCase().includes(q))
      )
    }

    return list
  }, [disasters, searchQuery, activeModuleFilter])

  // Top 5 Recent Alerts (sorted by recency)
  const recentAlerts = useMemo(() => {
    return [...disasters]
      .sort((a, b) => {
        if (a.isRecent && !b.isRecent) return -1
        if (!a.isRecent && b.isRecent) return 1
        return 0
      })
      .slice(0, 5)
  }, [disasters])

  // Disaster selection handler
  const handleSelectDisaster = useCallback((id) => {
    setSelectedDisasterId(id)
  }, [])

  // Toggle module filter
  const handleModuleClick = (moduleId) => {
    if (activeModuleFilter === moduleId) {
      setActiveModuleFilter(null)
    } else {
      setActiveModuleFilter(moduleId)
      const firstMatch = disasters.find((d) => d.module === moduleId)
      if (firstMatch) {
        setSelectedDisasterId(firstMatch.id)
      }
    }
  }

  // Keyboard shortcut Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Create new mission handler
  const handleCreateMission = (e) => {
    e.preventDefault()
    const form = e.target
    const newMission = {
      id: `MSN-${Math.floor(100 + Math.random() * 900)}`,
      title: form.title.value,
      location: form.location.value,
      satellite: form.satellite.value,
      status: 'Queued',
      statusClass: 'status-queued',
      type: 'observation',
      module: 'drishti',
      priority: form.priority.value,
    }
    setMissions((prev) => [newMission, ...prev])
    setShowNewMissionModal(false)
  }

  return (
    <div className="orbit-dashboard">
      {/* ═══════════════════════════════════════════════════════════
         TOP BAR matching Reference Image
         ═══════════════════════════════════════════════════════════ */}
      <header className="topbar">
        {/* Left: OrbitRelay Logo & Tagline */}
        <div className="topbar-branding">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 32 32" fill="none" className="orbit-logo-svg">
              <ellipse cx="16" cy="16" rx="14" ry="6.5" transform="rotate(-30 16 16)" stroke="#22c55e" strokeWidth="2.4" />
              <circle cx="16" cy="16" r="6" fill="#15803d" />
              <circle cx="16" cy="16" r="3.2" fill="#86efac" />
              <circle cx="25" cy="11" r="2.8" fill="#4ade80" />
            </svg>
          </div>
          <div className="brand-titles">
            <span className="brand-name">OrbitRelay</span>
            <span className="brand-sub">Rapid Satellites. A Safer Earth.</span>
          </div>
        </div>

        {/* Center: Search bar with Ctrl+K badge */}
        <div className="topbar-search">
          <div className="search-input-pill">
            <Search className="search-icon" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search locations, disasters, or coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery ? (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            ) : (
              <span className="search-kbd-badge">Ctrl + K</span>
            )}
          </div>
        </div>

        {/* Right: Status, Timestamp, Bell, Profile */}
        <div className="topbar-actions">
          <div className="system-status-indicator">
            <div className="status-top-line">
              <span className={`status-glow-dot ${backendOnline ? 'online' : 'simulated'}`} />
              <span className="status-text">System Operational</span>
            </div>
            <span className="status-sub-text">Live satellite and weather data</span>
          </div>

          <div className="topbar-datetime">
            <span className="date-line">
              {new Date(currentUtcTime).toUTCString().slice(5, 16)}
            </span>
            <span className="time-line">
              {currentUtcTime.slice(11, 19)} UTC
            </span>
          </div>

          <button
            className="icon-action-btn"
            title="Recent alerts"
            onClick={() => setShowAnalysisModal(true)}
            aria-label="Recent alerts"
          >
            <Bell size={17} />
          </button>

          <div
            className="profile-avatar-btn"
            title="Mission control (fleet and missions)"
            onClick={() => setShowFleetModal(true)}
            role="button"
            tabIndex={0}
            aria-label="Mission control"
          >
            <User size={17} />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
         MAIN BODY (LEFT SIDEBAR + DASHBOARD GRID)
         ═══════════════════════════════════════════════════════════ */}
      <div className="dashboard-body">
        {/* ── LEFT NAVIGATION SIDEBAR ── */}
        <aside className="left-sidebar">
          {/* Main Navigation links */}
          <nav className="nav-menu">
            <button
              className={`nav-btn ${activeNav === 'home' ? 'active' : ''}`}
              onClick={() => { setActiveNav('home'); setActiveModuleFilter(null); }}
            >
              <Home size={17} className="nav-btn-icon" />
              <span>Home</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'live-earth' ? 'active' : ''}`}
              onClick={() => setActiveNav('live-earth')}
            >
              <Globe2 size={17} className="nav-btn-icon" />
              <span>Live Earth</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'disaster-analysis' ? 'active' : ''}`}
              onClick={() => setActiveNav('disaster-analysis')}
            >
              <AlertTriangle size={17} className="nav-btn-icon" />
              <span>Disaster Analysis</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'satellites' ? 'active' : ''}`}
              onClick={() => { setActiveNav('satellites'); setShowFleetModal(true); }}
            >
              <Radio size={17} className="nav-btn-icon" />
              <span>Satellites</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveNav('analytics')}
            >
              <BarChart3 size={17} className="nav-btn-icon" />
              <span>Analytics</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveNav('reports')}
            >
              <FileText size={17} className="nav-btn-icon" />
              <span>Reports</span>
            </button>

            <button
              className={`nav-btn ${activeNav === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveNav('settings')}
            >
              <Settings size={17} className="nav-btn-icon" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Section Divider: Disaster Modules */}
          <div className="sanskrit-modules-section">
            <span className="section-label">DISASTER MODULES</span>

            <div className="sanskrit-modules-list">
              {dynamicModules.map((mod) => (
                <button
                  key={mod.id}
                  className={`sanskrit-module-btn ${activeModuleFilter === mod.id ? 'is-selected' : ''}`}
                  onClick={() => handleModuleClick(mod.id)}
                  title={`${mod.description} (${mod.activeCount} active)`}
                >
                  <div className="module-icon-circle" style={{ backgroundColor: `${mod.color}22`, color: mod.color }}>
                    {mod.id === 'drishti' && <Radio size={14} />}
                    {mod.id === 'varuna' && <Waves size={14} />}
                    {mod.id === 'agni' && <Flame size={14} />}
                    {mod.id === 'prithvi' && <Sprout size={14} />}
                    {mod.id === 'vayu' && <Wind size={14} />}
                    {mod.id === 'parvat' && <Mountain size={14} />}
                  </div>

                  <div className="module-text-cluster">
                    <span className="module-title-en">{mod.code}</span>
                    <span className="module-subtitle">{mod.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Footer Branding */}
          <div className="sidebar-footer">
            <div className="footer-brand-row">
              <span className="footer-dot-icon" />
              <div className="footer-brand-text">
                <strong>OrbitRelay v1.0</strong>
                <small>Built for a Safer Future</small>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN DASHBOARD GRID (Left + Right Columns) ── */}
        <main className="dashboard-grid">
          {/* ════ LEFT COLUMN: Earth Scene + Bottom Panels ════ */}
          <div className="grid-left-column">
            {/* 3D Earth Planetary Visualization Container */}
            <section className="earth-viewport-card" aria-label="Live Earth observation">
              <EarthScene
                selectedId={selectedDisasterId}
                onSelect={handleSelectDisaster}
                autoRotate={autoRotate}
                onToggleRotate={() => setAutoRotate((prev) => !prev)}
                disasters={disasters}
                issPosition={issPosition}
              />
            </section>

            {/* Bottom Row under Earth: 3 Aligned Information Panels */}
            <div className="bottom-panels-row">
              {/* Bottom Card 1: Earth Details */}
              <div className="dashboard-panel panel-earth-info">
                <div className="panel-header">
                  <div className="title-with-badge">
                    <span className="info-globe-icon">🌐</span>
                    <h3 className="panel-title">Earth Details</h3>
                    <span className="badge-live-dot-tag">
                      <span className="live-dot" /> Live
                    </span>
                  </div>
                </div>

                <div className="earth-info-body">
                  {/* Mini Globe Thumbnail */}
                  <div className="mini-earth-thumb-wrap">
                    <div className="mini-earth-circle">
                      <div className="mini-earth-day" />
                      <div className="mini-earth-night" />
                      <div className="mini-earth-lights" />
                      <div className="mini-earth-atmosphere" />
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="earth-info-metrics">
                    <div className="info-metric-item">
                      <span className="metric-icon-pin">⌖</span>
                      <div className="metric-texts">
                        <span className="metric-label">Selected Target</span>
                        <strong className="metric-val">{selectedDisaster.name}</strong>
                        <span className="metric-val text-dim">{selectedDisaster.location}</span>
                      </div>
                    </div>

                    <div className="info-metric-item">
                      <span className="metric-icon-pin">📍</span>
                      <div className="metric-texts">
                        <span className="metric-label">Coordinates</span>
                        <strong className="metric-val">{selectedDisaster.coordsFormatted}</strong>
                      </div>
                    </div>

                    <div className="info-metric-item">
                      <span className="metric-icon-pin">✦</span>
                      <div className="metric-texts">
                        <span className="metric-label">Source</span>
                        <strong className="metric-val">{selectedDisaster.source}</strong>
                        {selectedDisaster.sourceUrl && (
                          <a
                            href={selectedDisaster.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hazard-source-link"
                            style={{ marginTop: 3, display: 'inline-flex', alignSelf: 'flex-start' }}
                          >
                            View source record <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="info-metric-item">
                      <span className="metric-icon-pin">☀</span>
                      <div className="metric-texts">
                        <span className="metric-label">Observation Date</span>
                        <strong className="metric-val">{selectedDisaster.time}</strong>
                        <span className="metric-val text-dim">{selectedDisaster.fullDate || 'Live observation'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card 2: Recent Alerts */}
              <div className="dashboard-panel panel-recent-alerts">
                <div className="panel-header">
                  <div className="title-with-badge">
                    <span className="header-alert-icon">⚠️</span>
                    <h3 className="panel-title">Recent Alerts</h3>
                    <span className="badge-count-red">{recentAlerts.length}</span>
                  </div>
                  <button className="panel-link-btn" onClick={() => setActiveNav('disaster-analysis')}>
                    View All
                  </button>
                </div>

                <div className="recent-alerts-list">
                  {recentAlerts.map((d) => (
                    <div
                      key={d.id}
                      className={`recent-alert-row ${activeDisasterId === d.id ? 'active' : ''}`}
                      onClick={() => handleSelectDisaster(d.id)}
                    >
                      <div className="alert-badge-icon" style={{ backgroundColor: `${d.color}22`, color: d.color }}>
                        {d.type === 'landslide' && <ShieldAlert size={14} />}
                        {d.type === 'flood' && <Waves size={14} />}
                        {d.type === 'wildfire' && <Flame size={14} />}
                        {d.type === 'cyclone' && <Wind size={14} />}
                        {d.type === 'drought' && <Sprout size={14} />}
                        {!['landslide', 'flood', 'wildfire', 'cyclone', 'drought'].includes(d.type) && <AlertTriangle size={14} />}
                      </div>

                      <div className="alert-text-group">
                        <span className="alert-name-location">
                          <strong>{d.name}</strong> &mdash; {d.location}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                          <span className={`recency-tag ${d.isRecent ? 'recency-recent' : 'recency-recorded'}`}>
                            {d.isRecent ? 'New' : 'Recorded'}
                          </span>
                          {d.sourceUrl && (
                            <a
                              href={d.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hazard-source-link"
                              onClick={(e) => e.stopPropagation()}
                              title={`Source: ${d.source}`}
                            >
                              Source <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </div>

                      <span className="alert-time-tag">{d.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Card 3: AI Analysis */}
              <div className="dashboard-panel panel-ai-analysis">
                <div className="panel-header">
                  <div className="title-with-badge">
                    <Sparkles size={15} className="ai-header-spark" />
                    <h3 className="panel-title">AI Analysis</h3>
                  </div>
                  <button className="panel-link-btn" onClick={() => setShowAnalysisModal(true)}>
                    View All
                  </button>
                </div>

                <div className="ai-analysis-body">
                  <div className="ai-headline-row">
                    <span className="ai-cyan-dot">•</span>
                    <strong className="ai-headline-text">Global Risk Assessment</strong>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '9px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: aiAnalysis.ollama_connected
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: aiAnalysis.ollama_connected ? '#86efac' : '#fde047',
                        border: `1px solid ${aiAnalysis.ollama_connected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                      }}
                    >
                      {aiAnalysis.ollama_connected ? 'Ollama Active' : 'Factual Digest'}
                    </span>
                  </div>

                  <p className="ai-analysis-text">
                    {aiAnalysis.summary}
                  </p>

                  {/* 4 Risk Category Boxes */}
                  <div className="ai-risk-grid">
                    <div className="risk-pill-box">
                      <span className="risk-box-label">Flood Risk</span>
                      <strong className="risk-box-status text-danger">• High</strong>
                    </div>

                    <div className="risk-pill-box">
                      <span className="risk-box-label">Cyclone Risk</span>
                      <strong className="risk-box-status text-danger">• High</strong>
                    </div>

                    <div className="risk-pill-box">
                      <span className="risk-box-label">Wildfire Risk</span>
                      <strong className="risk-box-status text-amber">• Medium</strong>
                    </div>

                    <div className="risk-pill-box">
                      <span className="risk-box-label">Environmental Risk</span>
                      <strong className="risk-box-status text-amber">• Medium</strong>
                    </div>
                  </div>

                  <div className="ai-analysis-footer">
                    <span>
                      {aiAnalysis.model} &bull; Last updated:{' '}
                      {aiAnalysis.timestamp
                        ? new Date(aiAnalysis.timestamp).toLocaleTimeString()
                        : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Active Disasters, Satellite Status, Mission Queue ════ */}
          <div className="grid-right-column">
            {/* Card 1: Active Disasters */}
            <div className="dashboard-panel panel-active-disasters">
              <div className="panel-header">
                <div className="title-with-badge">
                  <ShieldAlert size={16} className="header-shield-icon" />
                  <h3 className="panel-title">Active Disasters</h3>
                  <span className="badge-count-red">{filteredDisasters.length}</span>
                  {disastersMeta.source && (
                    <span
                      className="badge-live-source"
                      title={`Telemetry: ${disastersMeta.endpointUsed}\nFetched at: ${disastersMeta.fetchedAt || 'Live'}`}
                    >
                      <span className="live-dot" /> {disastersMeta.source}
                    </span>
                  )}
                </div>
                <button
                  className="panel-link-btn"
                  onClick={() => setActiveModuleFilter(null)}
                >
                  View All
                </button>
              </div>

              {disastersLoading ? (
                <div className="disaster-loading-box">
                  <div className="telemetry-spinner" />
                  <span>Loading NASA EONET data...</span>
                </div>
              ) : disastersError ? (
                <div className="disaster-error-box">
                  <div className="error-text-row">
                    <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Error: NASA EONET source unavailable ({disastersError}). Showing baseline records.</span>
                  </div>
                  <button className="retry-btn" onClick={refetchDisasters}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : null}

              <div className="disasters-card-list">
                {filteredDisasters.map((d) => (
                  <div
                    key={d.id}
                    className={`disaster-card-row ${activeDisasterId === d.id ? 'active' : ''}`}
                    onClick={() => handleSelectDisaster(d.id)}
                  >
                    <div className="hazard-row-icon-wrap" style={{ backgroundColor: `${d.color}22`, color: d.color }}>
                      {d.type === 'landslide' && <ShieldAlert size={16} />}
                      {d.type === 'flood' && <Waves size={16} />}
                      {d.type === 'wildfire' && <Flame size={16} />}
                      {d.type === 'drought' && <Sprout size={16} />}
                      {d.type === 'cyclone' && <Wind size={16} />}
                      {!['landslide', 'flood', 'wildfire', 'drought', 'cyclone'].includes(d.type) && <AlertTriangle size={16} />}
                    </div>

                    <div className="hazard-row-info">
                      <div className="hazard-row-top">
                        <strong className="hazard-row-name">{d.name}</strong>
                        <span className="hazard-row-dash">&mdash;</span>
                        <span className="hazard-row-loc">{d.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span className="hazard-row-coords">{d.coordsFormatted}</span>
                        <span className={`recency-tag ${d.isRecent ? 'recency-recent' : 'recency-recorded'}`}>
                          {d.isRecent ? 'New' : 'Recorded'}
                        </span>
                        {d.sourceUrl && (
                          <a
                            href={d.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hazard-source-link"
                            onClick={(e) => e.stopPropagation()}
                            title={`Official source: ${d.source}`}
                          >
                            Source <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="hazard-row-right">
                      <span className={`severity-tag severity-${d.severity.toLowerCase()}`}>
                        {d.severity}
                      </span>
                      <span className="hazard-row-time">{d.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Satellite and ISS Status */}
            <div className="dashboard-panel panel-satellite-status">
              <div className="panel-header">
                <div className="title-with-badge">
                  <Radio size={16} className="header-radio-icon" />
                  <h3 className="panel-title">Satellite Status</h3>
                </div>
                <button
                  className="status-summary-green"
                  onClick={() => setShowFleetModal(true)}
                >
                  <span className="green-dot-pulse" /> 12/14 Operational
                </button>
              </div>

              {/* Genuine Live ISS Telemetry Card */}
              <div className="iss-live-telemetry-box">
                <div className="iss-box-top">
                  <div className="iss-title-group">
                    <Radio size={13} className="iss-icon" />
                    <strong>International Space Station (ISS)</strong>
                  </div>
                  <span className={`iss-live-pill ${issPosition?.is_live ? 'is-live' : 'is-sim'}`}>
                    <span className="live-dot" /> {issPosition?.is_live ? 'Live telemetry' : 'Simulated'}
                  </span>
                </div>

                <div className="iss-metrics-grid">
                  <div className="iss-metric">
                    <span className="iss-metric-label">Coordinates</span>
                    <strong className="iss-metric-val">
                      {issPosition?.latitude != null
                        ? `${Math.abs(issPosition.latitude).toFixed(2)}°${issPosition.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(issPosition.longitude).toFixed(2)}°${issPosition.longitude >= 0 ? 'E' : 'W'}`
                        : '45.12°N, 12.34°E (Sim)'}
                    </strong>
                  </div>
                  <div className="iss-metric">
                    <span className="iss-metric-label">Altitude</span>
                    <strong className="iss-metric-val">{issPosition?.altitude || 429.8} km</strong>
                  </div>
                  <div className="iss-metric">
                    <span className="iss-metric-label">Orbital Velocity</span>
                    <strong className="iss-metric-val">{issPosition?.velocity || 27560} km/h</strong>
                  </div>
                  <div className="iss-metric">
                    <span className="iss-metric-label">Status</span>
                    <strong className="iss-metric-val">
                      {issPosition?.visibility === 'daylight'
                        ? 'Daylight'
                        : issPosition?.visibility === 'eclipsed'
                        ? "Earth's shadow"
                        : 'Active'}
                    </strong>
                  </div>
                </div>

                <div className="iss-footer-row">
                  <span className="iss-source-tag">Source: {issPosition?.source || 'WhereTheISSAt (NORAD #25544)'}</span>
                  <span className="iss-time-tag">
                    {issPosition?.updated_at
                      ? new Date(issPosition.updated_at).toLocaleTimeString()
                      : 'Live'}
                  </span>
                </div>
              </div>

              <div className="satellite-categories-list">
                {SATELLITE_FLEET.map((fleet) => (
                  <div
                    key={fleet.category}
                    className="satellite-category-row"
                    onClick={() => { setSelectedFleetCategory(fleet); setShowFleetModal(true); }}
                  >
                    <div className="cat-row-left">
                      <span className={`cat-status-dot dot-${fleet.statusDot}`} />
                      <span className="cat-name">{fleet.category}</span>
                    </div>

                    <div className="cat-row-right">
                      <span className="cat-ratio">{fleet.onlineCount}/{fleet.totalCount}</span>
                      <ChevronRight size={14} className="cat-chevron" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Mission Queue */}
            <div className="dashboard-panel panel-mission-queue">
              <div className="panel-header">
                <div className="title-with-badge">
                  <Radio size={16} className="header-queue-icon" />
                  <h3 className="panel-title">Mission Queue</h3>
                  <span className="badge-count-red">3</span>
                </div>
                <button
                  className="panel-link-btn"
                  onClick={() => setShowNewMissionModal(true)}
                >
                  &bull; View All
                </button>
              </div>

              <div className="mission-queue-items-list">
                {missions.slice(0, 3).map((m) => (
                  <div key={m.id} className="mission-queue-card">
                    <div className="mission-type-icon-box">
                      {m.type === 'wildfire' && <Flame size={15} style={{ color: '#f97316' }} />}
                      {m.type === 'flood' && <Waves size={15} style={{ color: '#38bdf8' }} />}
                      {m.type === 'landslide' && <ShieldAlert size={15} style={{ color: '#ef4444' }} />}
                      {!['wildfire', 'flood', 'landslide'].includes(m.type) && <Radio size={15} />}
                    </div>

                    <div className="mission-details-block">
                      <div className="mission-top-line">
                        <strong className="mission-name">{m.title}</strong>
                        <span className="mission-dash">&mdash;</span>
                        <span className="mission-target">{m.location}</span>
                      </div>
                      <span className="mission-sat-tag">{m.satellite}</span>
                    </div>

                    <div className="mission-status-badge">
                      <span className={`status-dot-indicator dot-${m.status.toLowerCase()}`} />
                      <span className={`status-text-label text-${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modal: Schedule New Mission ──────────────────────── */}
      {showNewMissionModal && (
        <div className="modal-backdrop" onClick={() => setShowNewMissionModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-heading-cluster">
                <Radio size={18} className="modal-lead-icon" />
                <h3>Schedule Mission (Demo)</h3>
              </div>
              <button
                className="modal-close-icon"
                onClick={() => setShowNewMissionModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="modal-form">
              <label className="form-field">
                <span>Mission Title</span>
                <input
                  name="title"
                  required
                  placeholder="e.g., Brahmaputra Flood Monitoring"
                  defaultValue="Thermal Infrared Hotspot Mapping"
                />
              </label>

              <label className="form-field">
                <span>Target Region</span>
                <input
                  name="location"
                  required
                  placeholder="e.g., Central Mongolia"
                  defaultValue="Mongolia"
                />
              </label>

              <div className="form-split-row">
                <label className="form-field">
                  <span>Assigned Satellite</span>
                  <select name="satellite">
                    <option value="TERRA-1 • EO">TERRA-1 • EO</option>
                    <option value="AQUA-2 • Weather">AQUA-2 • Weather</option>
                    <option value="SENTINEL-3 • EO">SENTINEL-3 • EO</option>
                    <option value="LANDSAT-9 • EO">LANDSAT-9 • EO</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Priority</span>
                  <select name="priority">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowNewMissionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  <Plus size={16} /> Schedule Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Satellite Fleet Status ────────────────────── */}
      {showFleetModal && (
        <div className="modal-backdrop" onClick={() => setShowFleetModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-heading-cluster">
                <Radio size={18} className="modal-lead-icon" />
                <h3>
                  {selectedFleetCategory
                    ? `${selectedFleetCategory.category} Satellite Status`
                    : 'OrbitRelay Satellite Status'}
                </h3>
              </div>
              <button
                className="modal-close-icon"
                onClick={() => { setShowFleetModal(false); setSelectedFleetCategory(null); }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-modal-content">
              {(selectedFleetCategory ? [selectedFleetCategory] : SATELLITE_FLEET).map((cat) => (
                <div key={cat.category} className="fleet-cat-block">
                  <div className="fleet-cat-head">
                    <strong className="fleet-cat-title">{cat.category}</strong>
                    <span className="fleet-cat-count">{cat.onlineCount} / {cat.totalCount} operational</span>
                  </div>
                  <div className="fleet-sat-pills">
                    {cat.satellites.map((sat) => (
                      <span key={sat} className="fleet-sat-pill">
                        <span className="sat-dot-live" /> {sat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Global AI Analysis Report ─────────────────── */}
      {showAnalysisModal && (
        <div className="modal-backdrop" onClick={() => setShowAnalysisModal(false)}>
          <div className="modal-container modal-container-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-heading-cluster">
                <Sparkles size={18} className="modal-lead-icon text-cyan" />
                <h3>Global Risk Assessment &amp; AI Analysis</h3>
              </div>
              <button
                className="modal-close-icon"
                onClick={() => setShowAnalysisModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="analysis-modal-details">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '11px', color: '#f8fafc' }}>{aiAnalysis.model}</strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                    {aiAnalysis.ollama_connected
                      ? 'Local Ollama LLM Connection: Active & Verified'
                      : 'Ollama Offline: Rule-based factual digest active'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: aiAnalysis.ollama_connected
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                    color: aiAnalysis.ollama_connected ? '#86efac' : '#fde047',
                    border: `1px solid ${aiAnalysis.ollama_connected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  }}
                >
                  {aiAnalysis.ollama_connected ? 'Ollama Active' : 'Factual Digest'}
                </span>
              </div>

              <h4>Active Event Details: {selectedDisaster.name} ({selectedDisaster.location})</h4>
              <p className="incident-detail-p">{selectedDisaster.detail}</p>
              <div className="incident-meta-grid">
                <div><span>Module:</span> <strong>{selectedDisaster.moduleTitle}</strong></div>
                <div><span>Coordinates:</span> <strong>{selectedDisaster.coordsFormatted}</strong></div>
                <div><span>Observation Date:</span> <strong>{selectedDisaster.time}</strong></div>
                <div><span>Source:</span> <strong>{selectedDisaster.source}</strong></div>
                {selectedDisaster.sourceUrl && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span>Official Record:</span>{' '}
                    <a
                      href={selectedDisaster.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal-source-link"
                    >
                      Open NASA event record ↗
                    </a>
                  </div>
                )}
              </div>

              <div className="analysis-report-box">
                <h5>AI &amp; Integrated Earth Observation Analysis</h5>
                <p style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: 1.5, marginBottom: '8px' }}>
                  {aiAnalysis.summary}
                </p>
                <div style={{ fontSize: '9.5px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginBottom: '8px' }}>
                  <strong>Observation vs. Forecast:</strong> Directly recorded facts (NASA EONET telemetry) are observations; potential future impacts are forecast recommendations.
                </div>
                <ul>
                  <li><CheckCircle2 size={14} /> Schedule a Sentinel-1 SAR orbital pass to map flood boundaries along the Gujarat coast.</li>
                  <li><CheckCircle2 size={14} /> Run six-hourly infrared scans to monitor wildfire temperatures in Mongolia's Arkhangai region.</li>
                  <li><CheckCircle2 size={14} /> Continue monitoring cyclone wind speed and direction in the Bay of Bengal using INSAT-3DR.</li>
                  <li><CheckCircle2 size={14} /> Issue a landslide warning for transport routes in Uttarakhand.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
