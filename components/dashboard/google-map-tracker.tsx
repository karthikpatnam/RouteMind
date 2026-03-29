'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { type Route } from '@/lib/mock-data'

interface GoogleMapTrackerProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect?: (route: Route | null) => void
}

// Haversine distance in km
function calcDist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Interpolate a position along a multi-waypoint path given a 0..1 progress
function interpolateOnPath(waypoints: { lat: number; lng: number }[], t: number) {
  if (waypoints.length < 2) return waypoints[0] ?? { lat: 0, lng: 0 }
  
  // Compute total length
  const segments: number[] = []
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = calcDist(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng)
    segments.push(d)
    total += d
  }

  let target = t * total
  for (let i = 0; i < segments.length; i++) {
    if (target <= segments[i]) {
      const frac = target / segments[i]
      return {
        lat: waypoints[i].lat + frac * (waypoints[i + 1].lat - waypoints[i].lat),
        lng: waypoints[i].lng + frac * (waypoints[i + 1].lng - waypoints[i].lng),
      }
    }
    target -= segments[i]
  }
  return waypoints[waypoints.length - 1]
}

// Bearing between two points (degrees)
function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

// Generate a rerouted path that arcs further south to avoid a danger zone
function generateAlternativePath(waypoints: { lat: number; lng: number }[]) {
  if (!waypoints || waypoints.length < 2) return []
  const mid = waypoints[Math.floor(waypoints.length / 2)]
  const altMid = { lat: mid.lat - 12, lng: mid.lng + 5 }
  return [
    waypoints[0],
    { lat: waypoints[0].lat - 6, lng: (waypoints[0].lng + waypoints[waypoints.length - 1].lng) / 2 - 10 },
    altMid,
    waypoints[waypoints.length - 1],
  ]
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#556070' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#09141f' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2c3d50' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1a2233' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2d3d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#253040' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e2d3d' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
]

// SVG ship icon rotated to bearing
function shipSvgIcon(color: string, bearing: number, scale = 1, selected = false) {
  const size = Math.round(26 * scale)
  const glow = selected ? `drop-shadow(0 0 6px ${color})` : ''
  // Ship hull SVG path (pointing up = 0°)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' style='transform:rotate(${bearing}deg);filter:${glow}'>
    <path d='M12 2 L8 18 L12 15 L16 18 Z' fill='${color}' stroke='#000' stroke-width='1.2'/>
    <circle cx='12' cy='12' r='3' fill='${color}' opacity='0.3'/>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: size, height: size, equals: () => false },
    anchor: { x: size / 2, y: size / 2, equals: () => false },
  }
}

function portSvgIcon(color: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>
    <circle cx='12' cy='12' r='9' fill='${color}22' stroke='${color}' stroke-width='2'/>
    <circle cx='12' cy='12' r='4' fill='${color}'/>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 16, height: 16, equals: () => false },
    anchor: { x: 8, y: 8, equals: () => false },
  }
}

function statusColor(status: string) {
  if (status === 'critical') return '#ef4444'
  if (status === 'warning') return '#f59e0b'
  return '#10b981'
}

// ─────────────────────────────────────────────
// Inner component that has access to useMap()
// ─────────────────────────────────────────────
function MapContents({ routes, selectedRoute, onRouteSelect }: GoogleMapTrackerProps) {
  const map = useMap()
  
  // progress[routeId] = 0..1 through their waypoints
  const progressRef = useRef<Record<string, number>>({})
  const markersRef = useRef<Record<string, google.maps.Marker>>({})
  const polylinesRef = useRef<Record<string, google.maps.Polyline[]>>({})
  const portMarkersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(Date.now())

  // Initialize progress from existing currentLocation
  useEffect(() => {
    routes.forEach(route => {
      if (progressRef.current[route.id] === undefined) {
        const wp = route.waypoints
        if (wp && wp.length >= 2) {
          const total = route.distanceTotal ?? 1
          const covered = route.distanceCovered ?? 0
          progressRef.current[route.id] = Math.min(covered / total, 0.95)
        } else {
          progressRef.current[route.id] = 0.2
        }
      }
    })
  }, [routes])

  // Pan/zoom when selected route changes
  useEffect(() => {
    if (!map) return
    if (selectedRoute) {
      const wp = selectedRoute.waypoints
      if (wp && wp.length >= 2) {
        const bounds = new google.maps.LatLngBounds()
        wp.forEach(p => bounds.extend(p))
        map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 })
      }
    } else {
      map.setZoom(3)
      map.panTo({ lat: 20, lng: 10 })
    }
  }, [map, selectedRoute])

  // Main update loop: draws routes, port markers, vessel markers
  const updateMap = useCallback(() => {
    if (!map) return
    const now = Date.now()
    const dt = (now - lastTickRef.current) / 1000
    lastTickRef.current = now

    // Speed: vessels move through path at ~0.3% per second normally, faster for demo
    const SPEED = 0.0015 * dt

    // Clear old port markers
    portMarkersRef.current.forEach(m => m.setMap(null))
    portMarkersRef.current = []

    const routeIds = routes.map(r => r.id)

    // Remove stale polylines for routes no longer present
    Object.keys(polylinesRef.current).forEach(id => {
      if (!routeIds.includes(id)) {
        polylinesRef.current[id]?.forEach(p => p.setMap(null))
        delete polylinesRef.current[id]
      }
    })
    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!routeIds.includes(id)) {
        markersRef.current[id]?.setMap(null)
        delete markersRef.current[id]
      }
    })

    routes.forEach(route => {
      const wp = route.waypoints
      if (!wp || wp.length < 2) return

      const isSelected = selectedRoute?.id === route.id
      const color = statusColor(route.status)

      // ── Advance progress ──
      progressRef.current[route.id] = Math.min(
        (progressRef.current[route.id] ?? 0.1) + SPEED,
        0.96
      )
      const progress = progressRef.current[route.id]

      // ── Draw / update polyline ──
      const existingLines = polylinesRef.current[route.id]
      if (existingLines) {
        existingLines.forEach(l => l.setMap(null))
      }

      // Travelled segment (bright)
      const travelledWps: google.maps.LatLngLiteral[] = []
      const pos = interpolateOnPath(wp, progress)
      // approximate: just use start to current
      travelledWps.push(wp[0])
      // walk through waypoints up to current position
      for (let i = 1; i < wp.length - 1; i++) {
        const segEnd = i / (wp.length - 1)
        if (progress > segEnd) travelledWps.push(wp[i])
        else break
      }
      travelledWps.push(pos)

      const remainingWps: google.maps.LatLngLiteral[] = [pos, ...wp.slice(
        wp.findIndex((_, i) => (i / (wp.length - 1)) > progress) === -1 ? wp.length - 1 : wp.findIndex((_, i) => (i / (wp.length - 1)) > progress)
      )]
      remainingWps.push(wp[wp.length - 1])

      const travelledLine = new google.maps.Polyline({
        path: travelledWps,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: isSelected ? 0.9 : 0.55,
        strokeWeight: isSelected ? 4 : 2.5,
      })
      travelledLine.setMap(map)

      const remainingLine = new google.maps.Polyline({
        path: remainingWps,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0,
        strokeWeight: 0,
        icons: [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: isSelected ? 0.45 : 0.2, strokeWeight: isSelected ? 3 : 1.5, scale: 3 },
          offset: '0',
          repeat: '12px'
        }],
      })
      remainingLine.setMap(map)

      // If rerouted (critical/warning + selected), draw an alternative path
      let altLine: google.maps.Polyline | null = null
      if (isSelected && route.status !== 'normal') {
        const altPath = generateAlternativePath(wp)
        altLine = new google.maps.Polyline({
          path: altPath,
          geodesic: true,
          strokeColor: '#818cf8',
          strokeOpacity: 0,
          strokeWeight: 0,
          icons: [{
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, strokeWeight: 3, strokeColor: '#818cf8', scale: 4 },
            offset: '0',
            repeat: '14px'
          }],
        })
        altLine.setMap(map)
      }

      polylinesRef.current[route.id] = [travelledLine, remainingLine, ...(altLine ? [altLine] : [])]

      // ── Vessel marker ──
      // Get heading to next point on path
      const nextPos = interpolateOnPath(wp, Math.min(progress + 0.02, 1))
      const heading = bearing(pos, nextPos)
      const icon = shipSvgIcon(color, heading, isSelected ? 1.4 : 1.0, isSelected)

      if (markersRef.current[route.id]) {
        markersRef.current[route.id].setPosition(pos)
        markersRef.current[route.id].setIcon(icon as google.maps.Icon)
        markersRef.current[route.id].setZIndex(isSelected ? 200 : 10)
      } else {
        const marker = new google.maps.Marker({
          position: pos,
          map,
          icon: icon as google.maps.Icon,
          zIndex: isSelected ? 200 : 10,
          title: `${route.vessel} — ${route.name}`,
        })
        marker.addListener('click', () => {
          // Show InfoWindow
          if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow()
          }
          const riskColor = route.status === 'critical' ? '#ef4444' : route.status === 'warning' ? '#f59e0b' : '#10b981'
          infoWindowRef.current.setContent(`
            <div style="background:#1a2233;color:#e2e8f0;padding:14px 16px;border-radius:10px;min-width:200px;font-family:system-ui,sans-serif;font-size:13px;border:1px solid #2d3748">
              <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#fff">${route.vessel}</div>
              <div style="color:#94a3b8;margin-bottom:4px">${route.name}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <span style="background:#0f172a;padding:2px 8px;border-radius:4px;border:1px solid #334155">
                  📦 ${route.cargo}
                </span>
                <span style="background:${riskColor}22;color:${riskColor};padding:2px 8px;border-radius:4px;border:1px solid ${riskColor}44">
                  Risk: ${route.riskScore}%
                </span>
              </div>
              <div style="margin-top:10px;color:#64748b;font-size:12px">
                ${route.origin.name} → ${route.destination.name}<br/>
                ETA: <b style="color:#e2e8f0">${route.eta}</b>
              </div>
              ${route.status !== 'normal' ? `<div style="margin-top:8px;background:#7c3aed22;border:1px solid #7c3aed44;border-radius:6px;padding:6px 10px;color:#a78bfa;font-size:12px">⚛ AI reroute computed — see sidebar</div>` : ''}
            </div>
          `)
          infoWindowRef.current.open(map, marker)
          onRouteSelect?.(isSelected ? null : route)
        })
        markersRef.current[route.id] = marker
      }

      // ── Port markers (origin & destination) ──
      const originM = new google.maps.Marker({
        position: { lat: route.origin.lat, lng: route.origin.lng },
        map,
        icon: portSvgIcon(color) as google.maps.Icon,
        title: route.origin.name,
        zIndex: 5,
      })
      const destM = new google.maps.Marker({
        position: { lat: route.destination.lat, lng: route.destination.lng },
        map,
        icon: portSvgIcon('#94a3b8') as google.maps.Icon,
        title: route.destination.name,
        zIndex: 5,
      })
      portMarkersRef.current.push(originM, destM)
    })

    animFrameRef.current = requestAnimationFrame(updateMap)
  }, [map, routes, selectedRoute, onRouteSelect])

  // Start/stop animation loop
  useEffect(() => {
    if (!map) return
    animFrameRef.current = requestAnimationFrame(updateMap)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      // cleanup all map objects
      Object.values(markersRef.current).forEach(m => m.setMap(null))
      markersRef.current = {}
      Object.values(polylinesRef.current).forEach(lines => lines.forEach(l => l.setMap(null)))
      polylinesRef.current = {}
      portMarkersRef.current.forEach(m => m.setMap(null))
      portMarkersRef.current = []
      infoWindowRef.current?.close()
    }
  }, [map, updateMap])

  return null
}

// ─────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────
export function GoogleMapTracker({ routes, selectedRoute, onRouteSelect }: GoogleMapTrackerProps) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'YOUR_API_KEY_HERE'

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="absolute inset-0 z-0">
        <Map
          defaultZoom={3}
          defaultCenter={{ lat: 20, lng: 10 }}
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          scaleControl={false}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={true}
          gestureHandling="greedy"
          styles={DARK_MAP_STYLE}
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
        >
          <MapContents
            routes={routes}
            selectedRoute={selectedRoute}
            onRouteSelect={onRouteSelect}
          />
        </Map>
      </div>
    </APIProvider>
  )
}
