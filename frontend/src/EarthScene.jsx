import { useMemo, useRef, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  EARTH_RADIUS,
  ACTIVE_DISASTERS,
  latLonToVector,
} from './disasterData'
import {
  clusterDisastersIntoRegions,
  REGION_SURFACE_RADIUS,
} from './regionGeometry'

/* Sun world position illuminating Earth from upper-left in front of the planet */
const SUN_WORLD_POS = new THREE.Vector3(-5.8, 4.0, 4.5)
const SUN_DIR_NORM = SUN_WORLD_POS.clone().normalize()

/* ── Realistic Sunburst Starburst Flare in Deep Space (Softened Glare) ── */
function createSunFlareTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const center = 256

  // Soft, restrained natural radial glow without blinding glare
  const grad = ctx.createRadialGradient(center, center, 0, center, center, 170)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  grad.addColorStop(0.06, 'rgba(255, 245, 215, 0.65)')
  grad.addColorStop(0.18, 'rgba(255, 210, 120, 0.22)')
  grad.addColorStop(0.38, 'rgba(255, 160, 60, 0.05)')
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0)')
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  // 8 fine starburst diffraction spikes with moderated intensity
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(angle)

    const spikeGrad = ctx.createLinearGradient(-150, 0, 150, 0)
    spikeGrad.addColorStop(0, 'rgba(255, 240, 180, 0)')
    spikeGrad.addColorStop(0.46, 'rgba(255, 248, 220, 0.12)')
    spikeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.38)')
    spikeGrad.addColorStop(0.54, 'rgba(255, 248, 220, 0.12)')
    spikeGrad.addColorStop(1, 'rgba(255, 240, 180, 0)')

    ctx.fillStyle = spikeGrad
    ctx.fillRect(-150, -0.8, 300, 1.6)
    ctx.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/* ── Realistic Sun Light & Visual Starburst in Space ─────── */
function RealisticSunLighting() {
  const flareTexture = useMemo(() => createSunFlareTexture(), [])
  const sunSpritePos = [-3.5, 2.4, -0.4]

  return (
    <group>
      {/* 1. Natural Directional Sunlight shining from upper-left with moderated glare */}
      <directionalLight
        position={[SUN_WORLD_POS.x, SUN_WORLD_POS.y, SUN_WORLD_POS.z]}
        intensity={2.1}
        color="#fff5e6"
      />

      {/* 2. Soft Ambient Starlight fill so night side is not completely crushed */}
      <ambientLight intensity={0.16} color="#08121a" />

      {/* 3. Restrained Sun Sprite in deep space */}
      <group position={sunSpritePos}>
        <sprite scale={[1.35, 1.35, 1]}>
          <spriteMaterial
            map={flareTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Crisp central white-gold core */}
        <mesh>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  )
}

/* ── Photorealistic Day/Night Earth Shader Material ───────── */
const EarthPhotorealShader = {
  uniforms: {
    dayMap:       { value: null },
    nightMap:     { value: null },
    normalMap:    { value: null },
    specularMap:  { value: null },
    sunDirection: { value: SUN_DIR_NORM },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      // Normal and position in world space
      vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform sampler2D normalMap;
    uniform sampler2D specularMap;
    uniform vec3 sunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vPosition);

      // Light incidence from sun (in world space)
      float NdotL = dot(normal, sunDirection);

      // Smooth, natural day/night terminator transition
      float dayFactor = smoothstep(-0.10, 0.18, NdotL);

      vec4 dayTex = texture2D(dayMap, vUv);
      vec4 nightTex = texture2D(nightMap, vUv);
      vec4 specTex = texture2D(specularMap, vUv);

      // Balanced starlight & earthglow ambient fill so the globe never disappears into blackness
      vec3 nightAmbient = vec3(0.24, 0.28, 0.35);
      vec3 dayAmbient = vec3(0.12, 0.14, 0.18);
      vec3 ambient = mix(nightAmbient, dayAmbient, dayFactor);

      // 1. Daytime illumination with realistic solar color
      vec3 sunlight = vec3(1.18, 1.14, 1.05);
      vec3 dayLit = dayTex.rgb * (max(NdotL, 0.0) * sunlight + ambient);

      // 2. Ocean specular sun glint (only on daylit oceans)
      vec3 halfVec = normalize(sunDirection + viewDir);
      float specAngle = max(dot(normal, halfVec), 0.0);
      float specular = pow(specAngle, 34.0) * specTex.r * 1.6 * dayFactor;
      vec3 specColor = vec3(1.0, 0.96, 0.88) * specular;

      // 3. Sunset / twilight warm reddish glow along the day/night boundary
      float terminator = smoothstep(-0.15, 0.0, NdotL) * (1.0 - smoothstep(0.0, 0.18, NdotL));
      vec3 twilightGlow = vec3(0.90, 0.38, 0.12) * terminator * 0.42;

      // 4. City lights on the dark night-side continents
      float nightFactor = 1.0 - dayFactor;
      vec3 nightLit = nightTex.rgb * vec3(1.4, 1.25, 0.85) * nightFactor * 1.5;

      // 5. Delicate atmospheric Fresnel limb glow (cyan/blue) ensuring globe silhouette is always defined
      float fresnel = pow(clamp(1.0 - max(dot(normal, viewDir), 0.0), 0.0, 1.0), 3.2);
      vec3 atmosphereRim = vec3(0.32, 0.65, 1.0) * fresnel * (dayFactor * 0.65 + 0.35);

      vec3 finalColor = dayLit + specColor + nightLit + twilightGlow + atmosphereRim;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
}

/* ── Realistic Complete Spherical Earth ──────────────────── */
function SphericalEarthGlobe({ isRotating = true, rotationRef }) {
  const textures = useTexture({
    day:      '/textures/earth_atmos_2048.jpg',
    night:    '/textures/earth_lights_2048.png',
    normal:   '/textures/earth_normal_2048.jpg',
    specular: '/textures/earth_specular_2048.jpg',
    clouds:   '/textures/earth_clouds_1024.png',
  })

  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap:       { value: textures.day },
        nightMap:     { value: textures.night },
        normalMap:    { value: textures.normal },
        specularMap:  { value: textures.specular },
        sunDirection: { value: SUN_DIR_NORM },
      },
      vertexShader: EarthPhotorealShader.vertexShader,
      fragmentShader: EarthPhotorealShader.fragmentShader,
    })
  }, [textures])

  const cloudsRef = useRef()

  useFrame((_, delta) => {
    if (isRotating && rotationRef.current) {
      // Natural smooth axial rotation
      rotationRef.current.rotation.y += delta * 0.018
    }
    if (isRotating && cloudsRef.current) {
      // Clouds drift slightly faster
      cloudsRef.current.rotation.y += delta * 0.024
    }
  })

  return (
    <group>
      {/* 1. Main Realistic 3D Earth Surface */}
      <mesh material={earthMaterial}>
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
      </mesh>

      {/* 2. Realistic Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.006, 96, 96]} />
        <meshStandardMaterial
          map={textures.clouds}
          transparent
          opacity={0.36}
          blending={THREE.NormalBlending}
          depthWrite={false}
          color="#f8fafc"
          roughness={0.9}
        />
      </mesh>

      {/* 3. Subtle Outer Atmospheric Limb Ring (tight, NOT oversized) */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.014, 64, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ── Fallback Globe ──────────────────────────────────────── */
function FallbackGlobe() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.012, 48, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ── Highly Detailed International Space Station (ISS) Model ── */
function InternationalSpaceStation({
  name = 'OrbitRelay ISS',
  orbitRadius = 1.82,
  orbitTilt = [0.55, 0.20, 0.08],
  speed = 0.042,
  initialAngle = 0.9,
  livePosition = null,
  earthRotationRef = null,
  onSelect,
}) {
  const stationRef = useRef()
  const solarGimbalRef = useRef()
  const strobeRef = useRef()

  const orbitEuler = useMemo(
    () => new THREE.Euler(orbitTilt[0], orbitTilt[1], orbitTilt[2], 'XYZ'),
    [orbitTilt]
  )

  useFrame(({ clock }) => {
    if (!stationRef.current) return
    const t = clock.elapsedTime * speed + initialAngle

    let targetPos
    let tangent

    // 1. If valid live telemetry coordinates are supplied, plot station at real geographic location
    const hasLiveCoords =
      livePosition &&
      typeof livePosition.latitude === 'number' &&
      typeof livePosition.longitude === 'number' &&
      !isNaN(livePosition.latitude) &&
      !isNaN(livePosition.longitude)

    if (hasLiveCoords) {
      // Calculate 3D sphere coordinate directly above Earth's geographic surface
      const geoVec = latLonToVector(livePosition.latitude, livePosition.longitude, orbitRadius)

      // Align with Earth's current dynamic axial rotation
      if (earthRotationRef && earthRotationRef.current) {
        geoVec.applyEuler(earthRotationRef.current.rotation)
      }

      // Smooth interpolation so position transitions cleanly on periodic telemetry updates
      stationRef.current.position.lerp(geoVec, 0.05)
      targetPos = stationRef.current.position

      // Compute forward tangent based on orbital inclination
      tangent = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t)).applyEuler(orbitEuler).normalize()
    } else {
      // Documented Keplerian orbit fallback
      targetPos = new THREE.Vector3(Math.cos(t) * orbitRadius, 0, Math.sin(t) * orbitRadius)
      targetPos.applyEuler(orbitEuler)
      stationRef.current.position.copy(targetPos)

      tangent = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t)).applyEuler(orbitEuler).normalize()
    }

    // 2. Local Vertical Local Horizontal (LVLH) flight orientation:
    // Nadir vector towards Earth center (0, 0, 0)
    const nadir = targetPos.clone().negate().normalize()
    // Truss axis (perpendicular to flight direction and nadir)
    const trussAxis = new THREE.Vector3().crossVectors(tangent, nadir).normalize()
    // Recomputed zenith vector (away from Earth, pointing up)
    const zenith = new THREE.Vector3().crossVectors(trussAxis, tangent).normalize()

    // Matrix basis: X = trussAxis, Y = zenith, Z = tangent (forward flight direction)
    const rotMatrix = new THREE.Matrix4().makeBasis(trussAxis, zenith, tangent)
    stationRef.current.quaternion.setFromRotationMatrix(rotMatrix)

    // 3. SARJ solar array slow tracking oscillation
    if (solarGimbalRef.current) {
      solarGimbalRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.25 - 0.2
    }

    // 4. Navigational beacon flashing
    if (strobeRef.current) {
      const flash = Math.sin(clock.elapsedTime * 4.5) > 0.8 ? 1.0 : 0.05
      strobeRef.current.material.opacity = flash
    }
  })

  // Reusable materials
  const moduleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        metalness: 0.88,
        roughness: 0.22,
      }),
    []
  )

  const darkMetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#334155',
        metalness: 0.92,
        roughness: 0.35,
      }),
    []
  )

  const goldThermalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        metalness: 0.85,
        roughness: 0.28,
        emissive: '#713f12',
        emissiveIntensity: 0.22,
      }),
    []
  )

  const solarPanelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#081b33',
        metalness: 0.65,
        roughness: 0.2,
        emissive: '#102a54',
        emissiveIntensity: 0.35,
      }),
    []
  )

  const solarFrameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d97706',
        metalness: 0.86,
        roughness: 0.3,
      }),
    []
  )

  const radiatorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        metalness: 0.15,
        roughness: 0.55,
      }),
    []
  )

  return (
    <group ref={stationRef}>
      {/* Invisible click hit-sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          if (onSelect) onSelect(name)
        }}
      >
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── 1. CENTRAL PRESSURIZED MODULE CLUSTER (Along Z-axis) ── */}
      <group>
        {/* US Destiny Laboratory */}
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={moduleMat}>
          <cylinderGeometry args={[0.022, 0.022, 0.075, 20]} />
        </mesh>
        {/* Destiny micrometeorite shield ribs */}
        {[-0.012, 0.02, 0.052].map((z, idx) => (
          <mesh key={`rib-${idx}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
            <cylinderGeometry args={[0.0232, 0.0232, 0.005, 20]} />
          </mesh>
        ))}

        {/* Unity Node 1 */}
        <mesh position={[0, 0, -0.032]} rotation={[Math.PI / 2, 0, 0]} material={moduleMat}>
          <cylinderGeometry args={[0.024, 0.024, 0.030, 16]} />
        </mesh>

        {/* Harmony Node 2 */}
        <mesh position={[0, 0, 0.072]} rotation={[Math.PI / 2, 0, 0]} material={moduleMat}>
          <cylinderGeometry args={[0.024, 0.024, 0.028, 16]} />
        </mesh>

        {/* Pressurized Mating Adapter (PMA-2) & Forward Docking Port */}
        <mesh position={[0, 0, 0.096]} rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
          <cylinderGeometry args={[0.014, 0.021, 0.020, 16]} />
        </mesh>

        {/* Docked Visiting Spacecraft (Crew Capsule) */}
        <group position={[0, 0, 0.12]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={moduleMat}>
            <cylinderGeometry args={[0.006, 0.016, 0.026, 16]} />
          </mesh>
          <mesh position={[0, 0, -0.018]} rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 16]} />
          </mesh>
        </group>

        {/* Columbus Laboratory (Starboard side +X) */}
        <mesh position={[0.038, 0, 0.072]} rotation={[0, 0, Math.PI / 2]} material={moduleMat}>
          <cylinderGeometry args={[0.020, 0.020, 0.048, 16]} />
        </mesh>
        {/* Columbus end-cone */}
        <mesh position={[0.066, 0, 0.072]} rotation={[0, 0, -Math.PI / 2]} material={darkMetalMat}>
          <coneGeometry args={[0.020, 0.014, 16]} />
        </mesh>

        {/* Kibo Japanese Experiment Module (Port side -X) */}
        <mesh position={[-0.042, 0, 0.072]} rotation={[0, 0, Math.PI / 2]} material={moduleMat}>
          <cylinderGeometry args={[0.022, 0.022, 0.056, 16]} />
        </mesh>
        {/* Kibo Exposed Facility Porch Platform */}
        <mesh position={[-0.076, 0, 0.072]} material={darkMetalMat}>
          <boxGeometry args={[0.022, 0.016, 0.028]} />
        </mesh>

        {/* Cupola Observation Dome (Facing Nadir: -Y toward Earth!) */}
        <group position={[0, -0.024, 0.015]}>
          {/* Cupola metallic mount collar */}
          <mesh material={darkMetalMat}>
            <cylinderGeometry args={[0.016, 0.018, 0.010, 12]} />
          </mesh>
          {/* Multi-faceted observation window dome */}
          <mesh position={[0, -0.007, 0]}>
            <cylinderGeometry args={[0.013, 0.016, 0.008, 8]} />
            <meshStandardMaterial
              color="#38bdf8"
              metalness={0.96}
              roughness={0.08}
              transparent
              opacity={0.88}
              emissive="#0284c7"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>

        {/* Zarya Functional Cargo Block (FGB) with Gold Thermal Foil */}
        <mesh position={[0, 0, -0.072]} rotation={[Math.PI / 2, 0, 0]} material={goldThermalMat}>
          <cylinderGeometry args={[0.020, 0.020, 0.052, 16]} />
        </mesh>

        {/* Zvezda Service Module (Aft Command Module) */}
        <mesh position={[0, 0, -0.125]} rotation={[Math.PI / 2, 0, 0]} material={moduleMat}>
          <cylinderGeometry args={[0.023, 0.018, 0.056, 16]} />
        </mesh>
        {/* Zvezda aft propulsion engine nozzles */}
        {[-0.007, 0.007].map((offset, idx) => (
          <mesh key={`engine-${idx}`} position={[offset, -0.004, -0.158]} rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
            <cylinderGeometry args={[0.004, 0.006, 0.012, 12]} />
          </mesh>
        ))}
      </group>

      {/* ── 2. INTEGRATED TRUSS STRUCTURE (ITS) (Across X-axis) ── */}
      <group>
        {/* Central S0 Truss Bridge above Destiny */}
        <mesh position={[0, 0.028, 0.02]} material={darkMetalMat}>
          <boxGeometry args={[0.052, 0.018, 0.022]} />
        </mesh>

        {/* Main Transverse Girder Backbone (Span: 0.60 units) */}
        <mesh position={[0, 0.028, 0.02]} material={darkMetalMat}>
          <boxGeometry args={[0.60, 0.011, 0.013]} />
        </mesh>

        {/* Structural Truss Rings / Bulkheads */}
        {[-0.26, -0.20, -0.14, -0.08, 0.08, 0.14, 0.20, 0.26].map((x, idx) => (
          <mesh key={`truss-ring-${idx}`} position={[x, 0.028, 0.02]} material={moduleMat}>
            <boxGeometry args={[0.008, 0.017, 0.019]} />
          </mesh>
        ))}

        {/* Solar Alpha Rotary Joints (SARJ) Port and Starboard */}
        {[-0.15, 0.15].map((x, idx) => (
          <mesh key={`sarj-${idx}`} position={[x, 0.028, 0.02]} rotation={[0, 0, Math.PI / 2]} material={darkMetalMat}>
            <cylinderGeometry args={[0.015, 0.015, 0.016, 16]} />
          </mesh>
        ))}

        {/* Canadarm2 Robotic Manipulator Arm */}
        <group position={[0.05, 0.036, 0.022]}>
          <mesh material={moduleMat}>
            <cylinderGeometry args={[0.004, 0.004, 0.038, 8]} />
          </mesh>
          <mesh position={[0.012, 0.022, 0]} rotation={[0, 0, -0.7]} material={moduleMat}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.042, 8]} />
          </mesh>
          <mesh position={[0.026, 0.036, 0]} material={goldThermalMat}>
            <sphereGeometry args={[0.0045, 8, 8]} />
          </mesh>
        </group>

        {/* Space-to-Ground Parabolic Communications Dish Antenna */}
        <group position={[0.02, 0.052, -0.015]} rotation={[-0.45, 0.25, 0]}>
          {/* Antenna mast boom */}
          <mesh position={[0, -0.014, 0]} material={moduleMat}>
            <cylinderGeometry args={[0.002, 0.002, 0.026, 8]} />
          </mesh>
          {/* Parabolic reflector dish */}
          <mesh rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.024, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.85} roughness={0.22} side={THREE.DoubleSide} />
          </mesh>
          {/* Antenna feed horn */}
          <mesh position={[0, -0.012, 0]} material={solarFrameMat}>
            <cylinderGeometry args={[0.0018, 0.003, 0.014, 8]} />
          </mesh>
        </group>
      </group>

      {/* ── 3. MASSIVE PHOTOVOLTAIC SOLAR ARRAY WINGS (SAW) ── */}
      <group ref={solarGimbalRef} position={[0, 0.028, 0.02]}>
        {/* 4 Solar Array Wing pairs (8 wings total: 4 Starboard S4/S6, 4 Port P4/P6) */}
        {[
          { x: -0.25, z: 0.036, side: 'port' },
          { x: -0.25, z: -0.036, side: 'port' },
          { x: 0.25, z: 0.036, side: 'starboard' },
          { x: 0.25, z: -0.036, side: 'starboard' },
        ].map((saw, pairIdx) => (
          <group key={`saw-pair-${pairIdx}`} position={[saw.x, 0, saw.z]}>
            {/* Array structural deployment mast */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMetalMat}>
              <cylinderGeometry args={[0.003, 0.003, 0.155, 8]} />
            </mesh>
            {/* Mast canister base */}
            <mesh material={solarFrameMat}>
              <boxGeometry args={[0.016, 0.012, 0.016]} />
            </mesh>

            {/* Upper and Lower Solar Panel Blankets */}
            {[-1, 1].map((direction) => (
              <group key={`blanket-${direction}`} position={[0, 0, direction * 0.046]}>
                {/* Photovoltaic deep-blue solar cells */}
                <mesh material={solarPanelMat}>
                  <boxGeometry args={[0.052, 0.003, 0.065]} />
                </mesh>
                {/* Gold Kapton solar border frame */}
                <mesh material={solarFrameMat}>
                  <boxGeometry args={[0.055, 0.0022, 0.068]} />
                </mesh>
                {/* Subtle solar cell division grid strip */}
                <mesh position={[0, 0.002, 0]} material={solarPanelMat}>
                  <boxGeometry args={[0.048, 0.002, 0.060]} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* ── 4. THERMAL RADIATOR PANELS (Aft Heat Dissipation) ── */}
      <group position={[0, 0.028, -0.01]}>
        {[-0.09, 0, 0.09].map((x, idx) => (
          <group key={`radiator-${idx}`} position={[x, 0, -0.042]} rotation={[0.3, 0, 0]}>
            <mesh material={radiatorMat}>
              <boxGeometry args={[0.034, 0.003, 0.068]} />
            </mesh>
            {/* Radiator mount beam */}
            <mesh position={[0, 0, 0.038]} material={darkMetalMat}>
              <cylinderGeometry args={[0.0025, 0.0025, 0.018, 8]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 5. NAVIGATION LIGHTS & STROBE BEACONS ── */}
      {/* Starboard navigation beacon (Green LED at wingtip) */}
      <mesh position={[0.29, 0.028, 0.02]}>
        <sphereGeometry args={[0.0045, 8, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      {/* Port navigation beacon (Red LED at wingtip) */}
      <mesh position={[-0.29, 0.028, 0.02]}>
        <sphereGeometry args={[0.0045, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Zenith white flashing strobe beacon */}
      <mesh ref={strobeRef} position={[0, 0.045, 0.02]}>
        <sphereGeometry args={[0.0055, 8, 8]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

/* ── Restrained Glowing Orbital Path Rings ───────────────── */
function OrbitalRing({ radius, tilt = [0, 0, 0], color = '#38bdf8', opacity = 0.26 }) {
  const curve = useMemo(() => {
    const points = []
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius])

  return (
    <group rotation={tilt}>
      <lineLoop geometry={curve}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          linewidth={1}
          depthWrite={false}
        />
      </lineLoop>
    </group>
  )
}

/* ── Disaster Event Marker & Surface Region ────────────────── */
function SolidDisasterRegion({ region, selected, onSelect }) {
  const centerPos = useMemo(
    () => latLonToVector(region.centerLat, region.centerLon, REGION_SURFACE_RADIUS + 0.003),
    [region.centerLat, region.centerLon]
  )

  // Surface material for genuine polygon regions
  const fillMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: region.color,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: selected ? 0.92 : 0.82,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0,
      depthWrite: false, // Ensures overlays never occlude or black out the Earth surface
    })
  }, [region.color, selected])

  const borderMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: selected ? '#ffffff' : region.color,
      transparent: true,
      opacity: selected ? 1.0 : 0.88,
      linewidth: 1.5,
      depthWrite: false,
    })
  }, [region.color, selected])

  return (
    <group>
      {/* Genuine NASA EONET Polygon Surface Mesh (rendered only when authentic boundary exists) */}
      {region.hasReliablePolygon && region.fillGeometry && (
        <group>
          <mesh
            geometry={region.fillGeometry}
            material={fillMaterial}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(selected ? null : region.primaryDisasterId)
            }}
          />
          {region.borderGeometry && (
            <lineLoop geometry={region.borderGeometry} material={borderMaterial} />
          )}
        </group>
      )}

      {/* Solid Surface Marker & Single Compact Popup */}
      <Html
        distanceFactor={5.5}
        position={centerPos}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="globe-marker-anchor">
          {/* Subtle Center Reticle or Cyclone Animated Spiral */}
          <div
            className={`globe-region-reticle ${region.isCyclone ? 'is-cyclone' : ''} ${selected ? 'is-selected-hit' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(selected ? null : region.primaryDisasterId)
            }}
            title={`${region.sanskritName} — ${region.location}`}
          >
            {region.isCyclone ? (
              <div className="cyclone-spiral-wrap">
                <svg viewBox="0 0 24 24" className="cyclone-spiral-spin" width="16" height="16">
                  <path
                    d="M12 2.5a9.5 9.5 0 0 1 9.15 6.8c.27.95-.53 1.85-1.5 1.76-.83-.08-1.48-.75-1.61-1.57A6.5 6.5 0 0 0 8.5 4.34c-.87-.45-1.07-1.58-.4-2.27.4-.41.98-.6 1.54-.53A9.5 9.5 0 0 1 12 2.5zm-7.3 4.2c.74-.56 1.8-.3 2.16.56.32.76.06 1.66-.6 2.16A6.5 6.5 0 0 0 4.34 16.5c-.45.87-1.58 1.07-2.27.4-.41-.4-.6-.98-.53-1.54A9.5 9.5 0 0 1 4.7 6.7zm10.1 14.8c-.74.56-1.8.3-2.16-.56-.32-.76-.06-1.66.6-2.16A6.5 6.5 0 0 0 20.66 8.5c.45-.87 1.58-1.07 2.27-.4.41.4.6.98.53 1.54A9.5 9.5 0 0 1 14.8 21.5z"
                    fill="#f97316"
                  />
                  <circle cx="12" cy="12" r="3" fill="#ffffff" />
                </svg>
              </div>
            ) : (
              <div
                className="region-center-dot"
                style={{ backgroundColor: region.color }}
              />
            )}
          </div>

          {/* ONLY ONE COMPACT POPUP WHEN THIS REGION IS CLICKED */}
          {selected && (
            <div
              className="globe-single-compact-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="compact-popup-header">
                <div className="compact-popup-tag-wrap">
                  <span
                    className="compact-popup-indicator"
                    style={{ backgroundColor: region.color }}
                  />
                  <strong className="compact-popup-title">
                    {region.sanskritName}
                  </strong>
                </div>
                <button
                  className="compact-popup-close-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(null)
                  }}
                  title="Band Kara"
                  aria-label="Band Kara"
                >
                  &times;
                </button>
              </div>

              <div className="compact-popup-body">
                <div className="compact-popup-loc">{region.location}</div>
                <div className="compact-popup-coords">{region.coordsFormatted}</div>
                <div className="compact-popup-type-note">
                  {region.hasReliablePolygon
                    ? 'Satya Nondvileli Seema (Verified Impact Area)'
                    : 'Nirdisht Sthan (Reported Location)'}
                </div>
              </div>

              <div className="compact-popup-footer">
                <span className={`recency-tag ${region.isRecent ? 'recency-recent' : 'recency-recorded'}`}>
                  {region.isRecent ? 'Navin' : 'Abhilikhita'}
                </span>
                {region.sourceUrl && (
                  <a
                    href={region.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="compact-popup-source"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Srot ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

/* ── Scene Camera Observer ───────────────────────────────── */
function SceneCameraObserver({ onHeadingChange }) {
  const { camera } = useThree()
  const lastHeadingRef = useRef(-999)

  useFrame(() => {
    if (onHeadingChange) {
      const angle = (Math.atan2(camera.position.x, camera.position.z) * 180) / Math.PI
      const rounded = Math.round((angle + 360) % 360)
      if (Math.abs(rounded - lastHeadingRef.current) >= 1) {
        lastHeadingRef.current = rounded
        onHeadingChange(rounded)
      }
    }
  })

  return null
}

/* ── Public EarthScene Component ─────────────────────────── */
export default function EarthScene({
  selectedId = 'landslide-1',
  onSelect = () => {},
  autoRotate = true,
  onToggleRotate = () => {},
  disasters = ACTIVE_DISASTERS,
  issPosition = null,
}) {
  const [heading, setHeading] = useState(0)
  const controlsRef = useRef()
  const earthRotationRef = useRef()

  // Aggregate nearby events into geographically appropriate solid surface regions
  const regions = useMemo(() => clusterDisastersIntoRegions(disasters), [disasters])

  // Zoom In button handler
  const handleZoomIn = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.22)
      controlsRef.current.update()
    }
  }, [])

  // Zoom Out button handler
  const handleZoomOut = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.22)
      controlsRef.current.update()
    }
  }, [])

  // Reset view button handler (brings Asia & India front-and-center)
  const handleResetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    if (earthRotationRef.current) {
      earthRotationRef.current.rotation.set(0.20, -Math.PI * 0.44, 0)
    }
  }, [])

  return (
    <div className="earth-scene-container-inner">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 38, near: 0.1, far: 1000 }}
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1.25, 1.25)]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#030608', 1)
          gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        <color attach="background" args={['#030608']} />

        {/* Realistic Sun and natural directional lighting from upper-left */}
        <RealisticSunLighting />

        {/* Dense Starfield in Deep Space */}
        <Stars
          radius={95}
          depth={65}
          count={3200}
          factor={2.4}
          saturation={0.15}
          fade
          speed={0.06}
        />

        {/* One Large, Highly Detailed Satellite inspired by the International Space Station (ISS) */}
        <InternationalSpaceStation
          name="OrbitRelay ISS"
          orbitRadius={1.82}
          orbitTilt={[0.55, 0.20, 0.08]}
          speed={0.042}
          initialAngle={0.9}
          livePosition={issPosition}
          earthRotationRef={earthRotationRef}
          onSelect={onSelect}
        />

        {/* Dedicated smooth orbital trajectory path for the space station */}
        <OrbitalRing radius={1.82} tilt={[0.55, 0.20, 0.08]} color="#38bdf8" opacity={0.34} />

        {/* Rotating Planet Group (Oriented to feature Asia & India on load) */}
        <group ref={earthRotationRef} rotation={[0.20, -Math.PI * 0.44, 0]}>
          <Suspense fallback={<FallbackGlobe />}>
            <SphericalEarthGlobe isRotating={autoRotate} rotationRef={earthRotationRef} />
          </Suspense>

          {/* Solid Affected Regions Conforming directly to Earth's Spherical Surface */}
          {regions.map((region) => {
            const isSelected =
              selectedId === region.primaryDisasterId ||
              region.cluster.some((c) => c.id === selectedId)
            return (
              <SolidDisasterRegion
                key={region.id}
                region={region}
                selected={isSelected}
                onSelect={onSelect}
              />
            )
          })}
        </group>

        <SceneCameraObserver onHeadingChange={setHeading} />

        {/* Orbit Controls with smooth damping */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          minDistance={2.6}
          maxDistance={6.0}
          rotateSpeed={0.65}
          zoomSpeed={0.7}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* ── Bottom Controls Floating Toolbar (Sanskrit in Roman letters) ── */}
      <div className="earth-viewport-toolbar">
        <button
          className="toolbar-btn"
          onClick={handleZoomIn}
          title="Nikata (+)"
          aria-label="Nikata"
        >
          +
        </button>
        <button
          className="toolbar-btn"
          onClick={handleZoomOut}
          title="Dura (−)"
          aria-label="Dura"
        >
          &minus;
        </button>
        <button
          className="toolbar-btn"
          onClick={handleResetView}
          title="Kendra Sthiti (Bharat)"
          aria-label="Kendra Sthiti"
        >
          &#x2316;
        </button>

        <div className="toolbar-divider" />

        <div
          className="toolbar-toggle-block"
          onClick={onToggleRotate}
          title="Prithvi Bhraman Chalu/Band Kara"
        >
          <span className="toggle-label">Prithvi Bhraman</span>
          <div className={`switch-pill ${autoRotate ? 'is-on' : 'is-off'}`}>
            <span className="switch-thumb" />
          </div>
        </div>
      </div>

      {/* ── Circular Tactical Compass Rose (Bottom Right) ──────── */}
      <div className="earth-viewport-compass">
        <div
          className="compass-disc"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          <span className="compass-mark mark-n">N</span>
          <span className="compass-mark mark-e">E</span>
          <span className="compass-mark mark-s">S</span>
          <span className="compass-mark mark-w">W</span>
          <div className="compass-cross-h" />
          <div className="compass-cross-v" />
          <div className="compass-arrow-n" />
        </div>
        <div className="compass-reticle-center" />
      </div>
    </div>
  )
}