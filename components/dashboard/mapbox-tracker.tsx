'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { type Route } from '@/lib/mock-data'
import { useMapPins } from '@/hooks/use-map-pins'
import { type WeatherData, SEVERITY_COLORS, compassDir } from '@/hooks/use-live-weather'
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'
import {
  Map as MapIcon, Satellite, Navigation2, Eye, EyeOff, Search,
  Crosshair, Home, ZoomIn, ZoomOut, AlertTriangle, Wind, Ship,
  Anchor, X, Globe, Layers, Pin, Maximize2, Mountain, RotateCcw,
  Trash2, Star, ChevronRight, Activity, ArrowRight
} from 'lucide-react'
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Props {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect?: (r: Route | null) => void
  weatherMap?: Record<string, WeatherData>
}

// ── helpers ──────────────────────────────────────────────
function dist(a: {lat:number,lng:number}, b: {lat:number,lng:number}) {
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))
}

function lerp(wps:{lat:number,lng:number}[], t:number) {
  if (wps.length<2) return wps[0]??{lat:0,lng:0}
  const ds=wps.slice(0,-1).map((p,i)=>dist(p,wps[i+1]))
  let tot=ds.reduce((a,b)=>a+b,0), tgt=t*tot
  for (let i=0;i<ds.length;i++) {
    if (tgt<=ds[i]||i===ds.length-1) {
      const f=ds[i]>0?Math.min(tgt/ds[i],1):0
      return {lat:wps[i].lat+f*(wps[i+1].lat-wps[i].lat), lng:wps[i].lng+f*(wps[i+1].lng-wps[i].lng)}
    }
    tgt-=ds[i]
  }
  return wps[wps.length-1]
}

function bearing(a:{lat:number,lng:number},b:{lat:number,lng:number}) {
  const dL=(b.lng-a.lng)*Math.PI/180,la=a.lat*Math.PI/180,lb=b.lat*Math.PI/180
  return ((Math.atan2(Math.sin(dL)*Math.cos(lb),Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dL))*180/Math.PI)+360)%360
}

function routeColor(s:string){return s==='critical'?'#ef4444':s==='warning'?'#000':'#000'}

function shipSvg(color:string,rot:number,size=32,pulse=false){
  const s=`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24'><g transform='rotate(${rot},12,12)'><path d='M12 2 L4 22 L12 18 L20 22 Z' fill='${color}' stroke='#ffffff' stroke-width='2'/></g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`
}

function portSvg(color:string){
  const s=`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><rect x='2' y='2' width='20' height='20' fill='transparent' stroke='${color}' stroke-width='3'/><rect x='8' y='8' width='8' height='8' fill='${color}'/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`
}

function pinSvg(color='#000'){
  const s=`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><rect x='2' y='2' width='20' height='20' fill='${color}' stroke='#fff' stroke-width='2'/><rect x='8' y='8' width='8' height='8' fill='#fff'/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`
}

function altPath(wp:{lat:number,lng:number}[]){
  if(wp.length<2)return[]
  const f=wp[0],l=wp[wp.length-1]
  return [f,{lat:f.lat-10,lng:(f.lng+l.lng)/2-15},{lat:(f.lat+l.lat)/2-18,lng:(f.lng+l.lng)/2},l]
}

const TILES={
  swiss:{url:'mapbox://styles/mapbox/light-v11',label:'Swiss'},
  dark:{url:'mapbox://styles/mapbox/dark-v11',label:'Dark'},
  satellite:{url:'mapbox://styles/mapbox/satellite-v9',label:'Sat'},
}

const RISK_ZONES=[
  {id:'storm-atl',label:'Category 5 Storm',severity:'critical',coords:[[-45,50],[-45,60],[-15,60],[-15,50],[-45,50]] as [number,number][],color:'#3b82f6'},
  {id:'piracy-gulf',label:'High Piracy – Gulf of Aden',severity:'high',coords:[[43,10],[43,15],[55,15],[55,10],[43,10]] as [number,number][],color:'#ef4444'},
  {id:'piracy-som',label:'Active Piracy – Somali Coast',severity:'high',coords:[[45,5],[45,12],[55,12],[55,5],[45,5]] as [number,number][],color:'#ef4444'},
  {id:'traffic-suez',label:'Extreme Congestion – Suez',severity:'medium',coords:[[32,29],[32,33],[33,33],[33,29],[32,29]] as [number,number][],color:'#f59e0b'},
  {id:'storm-pac',label:'Typhoon Warning Zone',severity:'critical',coords:[[120,18],[120,28],[140,28],[140,18],[120,18]] as [number,number][],color:'#3b82f6'},
]

// Major world ports for geocoder search
const WORLD_PORTS=[
  {name:'Shanghai, China',lat:31.2304,lng:121.4737},{name:'Singapore',lat:1.3521,lng:103.8198},
  {name:'Rotterdam, Netherlands',lat:51.9244,lng:4.4777},{name:'Los Angeles, USA',lat:33.7283,lng:-118.2606},
  {name:'Hamburg, Germany',lat:53.5511,lng:9.9937},{name:'Busan, South Korea',lat:35.0796,lng:128.9719},
  {name:'Dubai, UAE',lat:25.2048,lng:55.2708},{name:'Hong Kong',lat:22.3088,lng:114.1745},
  {name:'Port of Antwerp, Belgium',lat:51.2621,lng:4.3819},{name:'Mumbai, India',lat:18.9551,lng:72.8472},
  {name:'New York, USA',lat:40.6501,lng:-74.0492},{name:'Tokyo, Japan',lat:35.6245,lng:139.7749},
  {name:'Suez Canal, Egypt',lat:30.7,lng:32.35},{name:'Southampton, UK',lat:50.8869,lng:-1.3938},
  {name:'Cape Town, South Africa',lat:-33.9117,lng:18.4242},{name:'Sydney, Australia',lat:-33.8688,lng:151.2093},
  {name:'Oslo, Norway',lat:59.9139,lng:10.7522},{name:'Barcelona, Spain',lat:41.3851,lng:2.1734},
  {name:'Alexandria, Egypt',lat:31.2001,lng:29.9187},{name:'Colombo, Sri Lanka',lat:6.9344,lng:79.8428},
]

// ── main component ────────────────────────────────────────
export function MapboxTracker({ routes, selectedRoute, onRouteSelect, weatherMap = {} }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map|null>(null)
  const markersRef = useRef<Record<string,mapboxgl.Marker>>({})
  const popupsRef = useRef<Record<string,mapboxgl.Popup>>({})
  const portMarkersRef = useRef<mapboxgl.Marker[]>([])
  const wpMarkersRef = useRef<mapboxgl.Marker[]>([])
  const pinMarkersRef = useRef<Record<string,mapboxgl.Marker>>({})
  const progressRef = useRef<Record<string,number>>({})
  const trailRef = useRef<Record<string,{lat:number,lng:number}[]>>({})
  const animRef = useRef<number|null>(null)
  const lastTickRef = useRef(Date.now())
  const mapReadyRef = useRef(false)
  const routePlannerRef = useRef<{origin:mapboxgl.Marker|null,dest:mapboxgl.Marker|null}>({origin:null,dest:null})
  const curvedRoutesRef = useRef<Record<string,{lat:number,lng:number}[]>>({})

  const { pins, addPin, removePin } = useMapPins()

  const [mapReady, setMapReady] = useState(false)
  const [tileKey, setTileKey] = useState<keyof typeof TILES>('swiss')
  const [zoom, setZoom] = useState(2.5)
  const [coords, setCoords] = useState<{lat:number,lng:number}|null>(null)
  const [showVessels, setShowVessels] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showZones, setShowZones] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [is3D, setIs3D] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)

  // Navigation panel state
  type NavPlace = { name: string; lat: number; lng: number }
  const [navOrigin, setNavOrigin] = useState<NavPlace | null>(null)
  const [navDest, setNavDest] = useState<NavPlace | null>(null)
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null)
  const [originSearch, setOriginSearch] = useState('')
  const [destSearch, setDestSearch] = useState('')
  const [navResults, setNavResults] = useState<NavPlace[]>([])
  const [navLoading, setNavLoading] = useState(false)
  const [navRoute, setNavRoute] = useState<{distance:number,duration:number}|null>(null)
  const navOriginMarkerRef = useRef<mapboxgl.Marker|null>(null)
  const navDestMarkerRef = useRef<mapboxgl.Marker|null>(null)

  const [liveLocation, setLiveLocation] = useState<{lat:number,lng:number}|null>(null)
  const [liveLocating, setLiveLocating] = useState(false)
  const liveMarkerRef = useRef<mapboxgl.Marker|null>(null)
  const [routePlanMode, setRoutePlanMode] = useState(false)
  const [routePlanStep, setRoutePlanStep] = useState<'origin'|'dest'|'done'>('origin')
  const [plannedRoute, setPlannedRoute] = useState<{distance:number,duration:number}|null>(null)
  const [contextMenu, setContextMenu] = useState<{x:number,y:number,lat:number,lng:number}|null>(null)
  const [hoverTooltip, setHoverTooltip] = useState<{x:number,y:number,html:string}|null>(null)

  // Geocode any query for nav panel
  const geocodeNav = useCallback(async (q: string) => {
    if (q.length < 2) { setNavResults([]); return }
    setNavLoading(true)
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${TOKEN}&limit=6&types=place,locality,country,poi,address`
      const res = await fetch(url)
      const data = await res.json()
      setNavResults((data.features || []).map((f: any) => ({ name: f.place_name, lat: f.center[1], lng: f.center[0] })))
    } catch { setNavResults([]) }
    finally { setNavLoading(false) }
  }, [])

  // Debounce — fire on whichever field is active
  const activeQuery = activeField === 'origin' ? originSearch : destSearch
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeQuery.length > 1) geocodeNav(activeQuery)
      else setNavResults([])
    }, 350)
    return () => clearTimeout(t)
  }, [activeQuery, geocodeNav])

  // Place a nav marker on the map
  const placeNavMarker = useCallback((type: 'origin'|'dest', lat: number, lng: number) => {
    if (!mapRef.current) return
    const isOrigin = type === 'origin'
    const color = isOrigin ? '#3b82f6' : '#ef4444'
    const label = isOrigin ? 'A' : 'B'
    const ref = isOrigin ? navOriginMarkerRef : navDestMarkerRef
    ref.current?.remove()
    const el = document.createElement('div')
    el.innerHTML = `<div style="width:32px;height:40px;position:relative">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
        <path d="M16 1C8.8 1 3 6.8 3 14c0 9.6 13 25 13 25s13-15.4 13-25c0-7.2-5.8-13-13-13z" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="16" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Inter,sans-serif">${label}</text>
      </svg>
    </div>`
    ref.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(mapRef.current)
  }, [])

  // Build route between origin and dest
  const buildNavRoute = useCallback(async (origin: NavPlace, dest: NavPlace) => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?geometries=geojson&access_token=${TOKEN}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      const route = data.routes?.[0]
      if (!route || !mapRef.current) return
      const src = mapRef.current.getSource('plan-route') as mapboxgl.GeoJSONSource
      if (src) src.setData({ type:'FeatureCollection', features:[{ type:'Feature', geometry:route.geometry, properties:{} }] })
      const km = Math.round(route.distance / 1000)
      const totalMins = Math.round(route.duration / 60)
      setNavRoute({ distance: km, duration: totalMins })
      // Fit map to route
      const bounds = new mapboxgl.LngLatBounds()
      route.geometry.coordinates.forEach((c: [number,number]) => bounds.extend(c))
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1800 })
    } catch(e) { console.error('Nav route error', e) }
  }, [])

  // When both origin and dest are set, auto-build route
  useEffect(() => {
    if (navOrigin && navDest) buildNavRoute(navOrigin, navDest)
  }, [navOrigin, navDest, buildNavRoute])

  // Select a place for origin or dest
  const selectNavPlace = useCallback((place: NavPlace) => {
    if (activeField === 'origin') {
      setNavOrigin(place)
      setOriginSearch(place.name.split(',')[0])
      placeNavMarker('origin', place.lat, place.lng)
      setActiveField('dest') // jump to dest field
    } else {
      setNavDest(place)
      setDestSearch(place.name.split(',')[0])
      placeNavMarker('dest', place.lat, place.lng)
      setActiveField(null)
    }
    setNavResults([])
    mapRef.current?.flyTo({ center:[place.lng, place.lat], zoom: 10, duration: 1200 })
  }, [activeField, placeNavMarker])

  // Live location for nav
  const useLiveAsOrigin = useCallback(() => {
    if (!navigator.geolocation) return alert('Geolocation not supported by your browser')
    setLiveLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const place: NavPlace = { name: 'My Location', lat, lng }
        setLiveLocation({ lat, lng })
        setLiveLocating(false)
        // Place pulsing marker
        liveMarkerRef.current?.remove()
        const el = document.createElement('div')
        el.innerHTML = `<div style="position:relative;width:28px;height:28px"><div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.25;animation:livePulse 2s ease-out infinite"></div><div style="position:absolute;inset:6px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6"></div></div>`
        if (!document.getElementById('live-pulse-style')) {
          const s = document.createElement('style'); s.id='live-pulse-style'
          s.textContent = `@keyframes livePulse{0%{transform:scale(1);opacity:0.25}70%{transform:scale(2.5);opacity:0}100%{transform:scale(2.5);opacity:0}}`
          document.head.appendChild(s)
        }
        if (mapRef.current) {
          liveMarkerRef.current = new mapboxgl.Marker({ element: el, anchor:'center' }).setLngLat([lng, lat]).addTo(mapRef.current)
          mapRef.current.flyTo({ center:[lng, lat], zoom: 13, duration: 1800 })
        }
        // Use as origin
        setNavOrigin(place)
        setOriginSearch('My Location')
        placeNavMarker('origin', lat, lng)
        setActiveField('dest')
        setNavResults([])
      },
      (err) => { setLiveLocating(false); alert('Location access denied: ' + err.message) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [placeNavMarker])

  const clearNavRoute = useCallback(() => {
    setNavOrigin(null); setNavDest(null)
    setOriginSearch(''); setDestSearch('')
    setNavRoute(null); setNavResults([]); setActiveField(null)
    navOriginMarkerRef.current?.remove(); navOriginMarkerRef.current = null
    navDestMarkerRef.current?.remove(); navDestMarkerRef.current = null
    liveMarkerRef.current?.remove(); liveMarkerRef.current = null
    setLiveLocation(null)
    const src = mapRef.current?.getSource('plan-route') as mapboxgl.GeoJSONSource
    if (src) src.setData({ type:'FeatureCollection', features:[] })
  }, [])

  // ── addSources helper (called on init + style swap) ──────
  const addSources = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource('routes')) {
      map.addSource('routes',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'routes-travelled',type:'line',source:'routes',filter:['==','type','travelled'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['get','weight'],'line-opacity':['get','opacity']}})
      map.addLayer({id:'routes-remaining',type:'line',source:'routes',filter:['==','type','remaining'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['get','weight'],'line-opacity':['get','opacity'],'line-dasharray':[2,2]}})
      map.addLayer({id:'routes-alt',type:'line',source:'routes',filter:['==','type','alt'],layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['get','weight'],'line-opacity':['get','opacity'],'line-dasharray':[3,3]}})
    }
    if (!map.getSource('trails')) {
      map.addSource('trails',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'trails-line',type:'line',source:'trails',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':1.5,'line-opacity':0.28,'line-dasharray':[3,5]}})
    }
    if (!map.getSource('plan-route')) {
      map.addSource('plan-route',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'plan-route-line',type:'line',source:'plan-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#a78bfa','line-width':3,'line-opacity':0.9,'line-dasharray':[1,0]}})
    }
    if (!map.getSource('zones')) {
      const fc:GeoJSON.FeatureCollection={type:'FeatureCollection',features:RISK_ZONES.map(z=>({type:'Feature' as const,geometry:{type:'Polygon' as const,coordinates:[z.coords]},properties:{color:z.color,label:z.label}}))}
      map.addSource('zones',{type:'geojson',data:fc})
      map.addLayer({id:'zones-fill',type:'fill',source:'zones',paint:{'fill-color':['get','color'],'fill-opacity':0.07}})
      map.addLayer({id:'zones-line',type:'line',source:'zones',paint:{'line-color':['get','color'],'line-width':1.5,'line-opacity':0.8,'line-dasharray':[4,4]}})
    }
  }, [])

  // ── Map init ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: TILES[tileKey].url,
      center: [10, 20], zoom: 2.5,
      projection: { name: 'mercator' },
    })

    map.on('load', () => {
      addSources(map)
      map.on('mousemove', e => setCoords({lat:parseFloat(e.lngLat.lat.toFixed(4)),lng:parseFloat(e.lngLat.lng.toFixed(4))}))
      map.on('mouseout', () => setCoords(null))
      map.on('zoomend', () => setZoom(parseFloat(map.getZoom().toFixed(1))))
      map.on('contextmenu', e => {
        e.preventDefault()
        setContextMenu({x:e.point.x, y:e.point.y, lat:parseFloat(e.lngLat.lat.toFixed(5)), lng:parseFloat(e.lngLat.lng.toFixed(5))})
      })
      map.on('click', () => setContextMenu(null))
      mapRef.current = map
      mapReadyRef.current = true
      setMapReady(true)
    })

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      Object.values(markersRef.current).forEach(m=>m.remove())
      portMarkersRef.current.forEach(m=>m.remove())
      mapReadyRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line

  // ── ResizeObserver ────────────────────────────────────────
  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Tile swap ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    mapRef.current.setStyle(TILES[tileKey].url)
    mapRef.current.once('style.load', () => {
      addSources(mapRef.current!)
      portMarkersRef.current.forEach(m=>m.remove()); portMarkersRef.current=[]
      Object.values(markersRef.current).forEach(m=>m.remove()); markersRef.current={}
    })
  }, [tileKey]) // eslint-disable-line

  // ── 3D terrain ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    if (is3D) {
      if (!map.getSource('mapbox-dem'))
        map.addSource('mapbox-dem',{type:'raster-dem',url:'mapbox://mapbox.mapbox-terrain-dem-v1',tileSize:512})
      map.setTerrain({source:'mapbox-dem',exaggeration:1.5})
      map.easeTo({pitch:50,bearing:-20,duration:1000})
    } else {
      map.setTerrain(undefined as unknown as mapboxgl.TerrainSpecification)
      map.easeTo({pitch:0,bearing:0,duration:1000})
    }
  }, [is3D, mapReady])

  // ── Layer visibility ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const vis = (id:string, show:boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id,'visibility',show?'visible':'none') }
    vis('routes-travelled',showRoutes); vis('routes-remaining',showRoutes); vis('routes-alt',showRoutes)
    vis('trails-line',showTrails)
    vis('zones-fill',showZones); vis('zones-line',showZones)
    Object.values(markersRef.current).forEach(m=>{m.getElement().style.display=showVessels?'block':'none'})
    portMarkersRef.current.forEach(m=>{m.getElement().style.display=showPorts?'block':'none'})
  }, [showVessels,showRoutes,showPorts,showZones,showTrails,mapReady])

  // ── Fit selected route ────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (selectedRoute?.waypoints?.length) {
      const bounds = new mapboxgl.LngLatBounds()
      selectedRoute.waypoints.forEach(p=>bounds.extend([p.lng,p.lat]))
      mapRef.current.fitBounds(bounds,{padding:80,maxZoom:7,duration:2000})
    } else {
      mapRef.current.flyTo({center:[10,20],zoom:2.5,duration:2000})
    }
  }, [selectedRoute, mapReady])

  // ── Pin markers ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    // Add new pins
    pins.forEach(pin => {
      if (pinMarkersRef.current[pin.id]) return
      const el = document.createElement('div')
      el.innerHTML = `<img src="${pinSvg(pin.color)}" style="width:28px;height:36px;cursor:pointer;filter:drop-shadow(2px 2px 0 rgba(0,0,0,1))"/>`
      el.title = pin.label
      const marker = new mapboxgl.Marker({element:el,anchor:'bottom'}).setLngLat([pin.lng,pin.lat]).addTo(map)
      const popup = new mapboxgl.Popup({offset:5}).setHTML(`<div style="background:#fff;color:#000;padding:10px;border:2px solid #000;box-shadow:4px 4px 0 #000;font-size:12px;min-width:140px;font-family:Inter,sans-serif"><b style="font-weight:900;text-transform:uppercase;letter-spacing:0.5px">📌 ${pin.label}</b><br/><span style="color:#000;font-size:10px;font-weight:bold;background:#f3f4f6;padding:2px 4px;border:2px solid #000;display:inline-block;margin-top:4px">${pin.lat.toFixed(3)}°, ${pin.lng.toFixed(3)}°</span></div>`)
      marker.setPopup(popup)
      el.onclick = () => marker.togglePopup()
      pinMarkersRef.current[pin.id] = marker
    })
    // Remove deleted pins
    Object.keys(pinMarkersRef.current).forEach(id => {
      if (!pins.find(p=>p.id===id)) {
        pinMarkersRef.current[id].remove()
        delete pinMarkersRef.current[id]
      }
    })
  }, [pins, mapReady])

  // ── Route planner: fetch Mapbox Directions ────────────────
  const fetchRoute = useCallback(async (origin:[number,number], dest:[number,number]) => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?geometries=geojson&access_token=${TOKEN}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      const route = data.routes?.[0]
      if (!route || !mapRef.current) return
      const map = mapRef.current
      const src = map.getSource('plan-route') as mapboxgl.GeoJSONSource
      if (src) src.setData({type:'FeatureCollection',features:[{type:'Feature',geometry:route.geometry,properties:{}}]})
      setPlannedRoute({distance:Math.round(route.distance/1000), duration:Math.round(route.duration/3600)})
      // Fit to route
      const coords = route.geometry.coordinates
      const bounds = new mapboxgl.LngLatBounds()
      coords.forEach((c:[number,number])=>bounds.extend(c))
      map.fitBounds(bounds,{padding:80,duration:1500})
    } catch(e) { console.error('Directions error',e) }
  }, [])

  // ── Animation loop ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    routes.forEach(r => {
      if (progressRef.current[r.id]===undefined)
        progressRef.current[r.id]=Math.min((r.distanceCovered??1000)/(r.distanceTotal??10000),0.92)
      if (!trailRef.current[r.id]) trailRef.current[r.id]=[]
      
      // Cache curved turf.js great-circle points once per route
      if (!curvedRoutesRef.current[r.id] && r.waypoints && r.waypoints.length > 1) {
        let dense: {lat:number,lng:number}[] = []
        for (let i=0; i<r.waypoints.length-1; i++) {
          const w1 = r.waypoints[i]
          const w2 = r.waypoints[i+1]
          const start = turf.point([w1.lng, w1.lat])
          const end = turf.point([w2.lng, w2.lat])
          try {
            const gc = turf.greatCircle(start, end, { npoints: 60 })
            const coords = gc.geometry.coordinates
            // Handle Position[] vs Position[][] (antimeridian wrap)
            const flatCoords = Array.isArray(coords[0][0]) 
              ? (coords as number[][][]).flat() 
              : (coords as number[][])
            flatCoords.forEach(c => dense.push({lat: c[1], lng: c[0]}))
          } catch(e) {
            // fallback if greatCircle fails 
            dense.push(w1, w2)
          }
        }
        curvedRoutesRef.current[r.id] = dense
      }
    })

    const tick = () => {
      if (!mapRef.current) return
      const dt = Math.min((Date.now()-lastTickRef.current)/1000,0.1)
      lastTickRef.current = Date.now()
      const SPEED = 0.00015 * dt * 60
      const routeFeatures: GeoJSON.Feature[] = []
      const trailFeatures: GeoJSON.Feature[] = []

      if (portMarkersRef.current.length===0) {
        const seen = new Set<string>()
        routes.forEach(route => {
          [{...route.origin, c:routeColor(route.status)},{...route.destination, c:'#64748b'}].forEach(pt => {
            if (seen.has(pt.name)) return; seen.add(pt.name)
            const el = document.createElement('div')
            el.style.cssText='display:flex;flex-direction:column;align-items:center;cursor:pointer;'
            const tip = document.createElement('div')
            tip.style.cssText='background:#fff;color:#000;padding:4px 8px;font-weight:900;font-size:10px;border:2px solid #000;box-shadow:4px 4px 0 #000;margin-top:6px;white-space:nowrap;display:none;text-transform:uppercase;letter-spacing:1px;'
            tip.innerHTML=`⚓ ${pt.name}`
            const img = document.createElement('img')
            img.src=portSvg(pt.c); img.style.cssText='width:20px;height:20px;'
            el.appendChild(img); el.appendChild(tip)
            el.onmouseenter=()=>{tip.style.display='block'}
            el.onmouseleave=()=>{tip.style.display='none'}
            portMarkersRef.current.push(new mapboxgl.Marker({element:el,anchor:'top'}).setLngLat([pt.lng,pt.lat]).addTo(map))
          })
        })
      }

      wpMarkersRef.current.forEach(m=>m.remove()); wpMarkersRef.current=[]

      for (const route of routes) {
        const wp = route.waypoints
        if (!wp||wp.length<2) continue
        const isSel = selectedRoute?.id===route.id
        const color = routeColor(route.status)
        const denseWp = curvedRoutesRef.current[route.id] || wp
        
        progressRef.current[route.id]=Math.min((progressRef.current[route.id]??0.1)+SPEED,0.97)
        const prog = progressRef.current[route.id]
        const pos = lerp(denseWp,prog)
        const nxt = lerp(denseWp,Math.min(prog+0.01,1))
        const hdg = bearing(pos,nxt)
        const pulse = route.status==='critical'

        // trail
        const trail = trailRef.current[route.id]
        if (!trail.length||dist(trail[trail.length-1],pos)>50) trail.push({...pos})
        if (trail.length>25) trail.shift()
        if (trail.length>1) trailFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:trail.map(p=>[p.lng,p.lat])},properties:{color}})

        // route lines
        const travPts:number[][]=[[denseWp[0].lng,denseWp[0].lat]]
        denseWp.slice(1,-1).forEach((p,i)=>{ if((i+1)/(denseWp.length-1)<prog) travPts.push([p.lng,p.lat]) })
        travPts.push([pos.lng,pos.lat])
        routeFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:travPts},properties:{type:'travelled',color,weight:isSel?5:2.5,opacity:isSel?1:0.7}})

        const remPts:number[][]=[[pos.lng,pos.lat]]
        denseWp.slice(1,-1).forEach((p,i)=>{ if((i+1)/(denseWp.length-1)>prog) remPts.push([p.lng,p.lat]) })
        remPts.push([denseWp[denseWp.length-1].lng,denseWp[denseWp.length-1].lat])
        routeFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:remPts},properties:{type:'remaining',color,weight:isSel?2.5:1.5,opacity:isSel?0.35:0.2}})

        if (isSel&&route.status!=='normal') {
          // Alt path drawing using great circle curve
          try {
             if (wp.length >= 2) {
               const startAlt = turf.point([wp[0].lng, wp[0].lat])
               const endAlt = turf.point([wp[wp.length-1].lng, wp[wp.length-1].lat])
               // Introduce offset for arc visually
               const gc = turf.greatCircle(startAlt, endAlt, {npoints: 40, offset: 40})
               const apts = gc.geometry.coordinates
               // Ensure we pass only LineString compatible coordinates
               const finalApts = Array.isArray(apts[0][0]) ? (apts as number[][][])[0] : (apts as number[][])
               routeFeatures.push({type:'Feature',geometry:{type:'LineString',coordinates:finalApts},properties:{type:'alt',color:'#818cf8',weight:3,opacity:0.9}})
             }
          } catch(e) {}
        }

        if (isSel) {
          wp.forEach((p,i)=>{ if(i===0||i===wp.length-1) return
            const el=document.createElement('div')
            const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><circle cx='10' cy='10' r='9' fill='#0f172a' stroke='${color}' stroke-width='2'/><text x='10' y='14' text-anchor='middle' fill='${color}' font-size='10' font-family='monospace' font-weight='bold'>${i}</text></svg>`
            el.innerHTML=`<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" style="width:20px;height:20px;"/>`
            wpMarkersRef.current.push(new mapboxgl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(map))
          })
        }

        // vessel marker — enrich with live weather
        const wx = weatherMap[route.id]
        const wxSev = wx?.severity ?? 'calm'
        const wxColor = wxSev === 'severe' ? '#ef4444' : wxSev === 'rough' ? '#000' : '#000'
        const wxLabel = wxSev === 'severe' ? 'SEVERE' : wxSev === 'rough' ? 'ROUGH' : wxSev === 'moderate' ? 'MODERATE' : 'CALM'
        const wxRow = wx && wx.status !== 'error'
          ? `<div style="margin-top:12px;padding:8px;background:${wxSev==='severe'?'#ef4444':'#fff'};border:1px solid #000;color:${wxSev==='severe'?'#fff':'#000'};"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid ${wxSev==='severe'?'#fff':'#000'};padding-bottom:4px;"><span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px">${wxLabel}</span><span style="font-size:10px;font-weight:bold;">LIVE</span></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"><div style="text-align:center"><div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:2px">WAVES</div><div style="font-size:11px;font-weight:bold">${wx.wave_height}M</div></div><div style="text-align:center"><div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:2px">WIND</div><div style="font-size:11px;font-weight:bold">${wx.wind_speed_kts}KTS</div></div><div style="text-align:center"><div style="font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:2px">PRECIP</div><div style="font-size:11px;font-weight:bold">${wx.precipitation}MM</div></div></div></div>`
          : ''
        const borderCol = route.status === 'normal' ? '#000' : color
        const popHtml=`<div style="background:#fff;color:#000;padding:16px;min-width:260px;font-family:Inter,sans-serif;font-size:13px;border:2px solid #000;box-shadow:8px 8px 0 #000"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px;"><div style="width:12px;height:12px;background:${borderCol};"></div><span style="font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:1px">${route.vessel}</span><span style="margin-left:auto;font-size:10px;background:${borderCol};color:#fff;padding:4px 8px;font-weight:900;text-transform:uppercase;letter-spacing:1px">${route.status}</span></div><div style="color:#000;font-size:12px;margin-bottom:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px">${route.name}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px"><div style="background:#fff;padding:6px;border:1px solid #000"><div style="color:#000;font-size:9px;font-weight:900;margin-bottom:2px;text-transform:uppercase;letter-spacing:1px">CARGO</div><div style="font-weight:bold;font-size:11px;color:#000;text-transform:uppercase">${route.cargo}</div></div><div style="background:#fff;padding:6px;border:1px solid #000"><div style="color:#000;font-size:9px;font-weight:900;margin-bottom:2px;text-transform:uppercase;letter-spacing:1px">ETA</div><div style="font-weight:bold;font-size:11px;color:#000">${route.eta}</div></div><div style="background:#fff;padding:6px;border:1px solid #000"><div style="color:#000;font-size:9px;font-weight:900;margin-bottom:2px;text-transform:uppercase;letter-spacing:1px">RISK</div><div style="font-weight:900;font-size:13px;color:${borderCol}">${route.riskScore}</div></div><div style="background:#fff;padding:6px;border:1px solid #000"><div style="color:#000;font-size:9px;font-weight:900;margin-bottom:2px;text-transform:uppercase;letter-spacing:1px">ORIGIN</div><div style="font-weight:bold;font-size:11px;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase" title="${route.origin.name}">${route.origin.name}</div></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:#000;font-weight:900;text-transform:uppercase;letter-spacing:1px"><span>→ ${route.destination.name.toUpperCase()}</span><span>${Math.round(prog*100)}% DONE</span></div>${wxRow}</div>`

        let marker = markersRef.current[route.id]
        if (!marker) {
          const el = document.createElement('div')
          el.className='vessel-marker'
          el.style.cssText='cursor:pointer;position:relative;'
          el.onclick=(e)=>{e.stopPropagation();onRouteSelect?.(route);popupsRef.current[route.id]?.setLngLat([pos.lng,pos.lat]).addTo(map)}
          marker=new mapboxgl.Marker({element:el}).setLngLat([pos.lng,pos.lat]).addTo(map)
          markersRef.current[route.id]=marker
          const popup=new mapboxgl.Popup({closeButton:true,offset:15,className:'rm-popup'})
          popup.setHTML(popHtml)
          popupsRef.current[route.id]=popup
        }
        const sz = isSel?38:26
        const el = marker.getElement()
        // Weather severity ring around vessel — only for rough/severe
        const wxRing = (wxSev === 'rough' || wxSev === 'severe')
          ? `<div style="position:absolute;inset:-5px;border:3px solid ${wxColor};opacity:0.8;"></div>`
          : ''
        el.innerHTML=`${wxRing}<img src="${shipSvg(borderCol,hdg,sz,pulse)}" style="width:${sz}px;height:${sz}px;transition:all 0.3s;filter:drop-shadow(2px 2px 0 #000)"/><div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:2px 6px;font-size:9px;white-space:nowrap;border:2px solid #000;font-weight:900;box-shadow:2px 2px 0 #000;text-transform:uppercase;letter-spacing:1px">${route.vessel}</div>`
        marker.setLngLat([pos.lng,pos.lat])
        if (popupsRef.current[route.id]?.isOpen()) popupsRef.current[route.id].setHTML(popHtml)
        el.style.zIndex=isSel?'1000':'200'
      }

      const rSrc=map.getSource('routes') as mapboxgl.GeoJSONSource
      if (rSrc) rSrc.setData({type:'FeatureCollection',features:routeFeatures})
      const tSrc=map.getSource('trails') as mapboxgl.GeoJSONSource
      if (tSrc) tSrc.setData({type:'FeatureCollection',features:trailFeatures})

      animRef.current=requestAnimationFrame(tick)
    }

    if (map.isStyleLoaded()) { animRef.current=requestAnimationFrame(tick) }
    else { map.once('styledata',()=>{ animRef.current=requestAnimationFrame(tick) }) }
    return ()=>{ if(animRef.current) cancelAnimationFrame(animRef.current) }
  }, [mapReady,routes,selectedRoute,onRouteSelect])

  // ── Route plan click handler ──────────────────────────────
  useEffect(() => {
    if (!mapReady||!mapRef.current) return
    const map = mapRef.current
    if (!routePlanMode) {
      routePlannerRef.current.origin?.remove(); routePlannerRef.current.origin=null
      routePlannerRef.current.dest?.remove(); routePlannerRef.current.dest=null
      const src=map.getSource('plan-route') as mapboxgl.GeoJSONSource
      if (src) src.setData({type:'FeatureCollection',features:[]})
      setPlannedRoute(null); setRoutePlanStep('origin')
      return
    }

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const lngLat:[number,number]=[e.lngLat.lng,e.lngLat.lat]
      if (routePlanStep==='origin') {
        routePlannerRef.current.origin?.remove()
        const el=document.createElement('div')
        el.innerHTML=`<div style="width:16px;height:16px;border-radius:0;background:#fff;border:3px solid #000;box-shadow:2px 2px 0 #000;"></div>`
        routePlannerRef.current.origin=new mapboxgl.Marker({element:el}).setLngLat(lngLat).addTo(map)
        setRoutePlanStep('dest')
      } else if (routePlanStep==='dest') {
        routePlannerRef.current.dest?.remove()
        const el=document.createElement('div')
        el.innerHTML=`<div style="width:16px;height:16px;border-radius:0;background:#000;border:3px solid #fff;box-shadow:2px 2px 0 #000;"></div>`
        routePlannerRef.current.dest=new mapboxgl.Marker({element:el}).setLngLat(lngLat).addTo(map)
        setRoutePlanStep('done')
        const origin=routePlannerRef.current.origin!.getLngLat()
        fetchRoute([origin.lng,origin.lat], lngLat)
      }
    }

    map.on('click', onClick)
    map.getCanvas().style.cursor = routePlanMode?'crosshair':''
    return ()=>{ map.off('click', onClick); map.getCanvas().style.cursor='' }
  }, [routePlanMode,routePlanStep,fetchRoute,mapReady])

  const zoomIn  = useCallback(()=>mapRef.current?.zoomIn(),[])
  const zoomOut = useCallback(()=>mapRef.current?.zoomOut(),[])
  const goHome  = useCallback(()=>mapRef.current?.flyTo({center:[10,20],zoom:2.5,duration:1500}),[])
  const fitAll  = useCallback(()=>{
    if (!mapRef.current) return
    const all=routes.flatMap(r=>r.waypoints??[])
    if (all.length){const b=new mapboxgl.LngLatBounds();all.forEach(p=>b.extend([p.lng,p.lat]));mapRef.current.fitBounds(b,{padding:60,duration:1500})}
  },[routes])
  const resetBearing = useCallback(()=>mapRef.current?.easeTo({bearing:0,pitch:0,duration:800}),[])
  const flyTo = useCallback((lat:number,lng:number)=>{
    mapRef.current?.flyTo({center:[lng,lat],zoom:7,duration:1500})
  },[])

  return (
    <div ref={wrapperRef} className="relative w-full h-full" style={{minHeight:0}}>
      <style>{`
        .mapboxgl-popup-content{background:transparent!important;padding:0!important;box-shadow:none!important;}
        .mapboxgl-popup-tip{display:none!important;}
        .rm-popup .mapboxgl-popup-close-button{color:#94a3b8;right:12px;top:12px;z-index:10;font-size:18px;transition:color 0.2s;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;}
        .rm-popup .mapboxgl-popup-close-button:hover{color:#f8fafc;background:rgba(255,255,255,0.1);}
        .mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important;}
        @keyframes wxRingPulse{0%,100%{transform:scale(1);opacity:0.6;}50%{transform:scale(1.25);opacity:0.2;}}
        .mapboxgl-canvas{outline:none;}
      `}</style>

      {/* Map canvas */}
      <div ref={mapContainerRef} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>

      {/* HUD */}
      <div className="absolute inset-0 z-10 pointer-events-none">

        {/* ── Navigation Panel ── */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[112px] pointer-events-auto z-[60] flex flex-col items-center" onClick={e => e.stopPropagation()}>
          
          {/* Main Pill */}
          <div className="flex flex-col md:flex-row items-stretch bg-white border-2 border-black shadow-[8px_8px_0_0_#000] p-1 gap-1">
            {/* Origin input */}
            <div className={`flex items-center gap-3 px-4 py-3 border border-transparent ${activeField==='origin'?'bg-black text-white':'bg-white text-black'}`}>
              <div className={`w-3 h-3 border-2 ${activeField==='origin'?'border-white bg-black':'border-black bg-white'} shrink-0`} />
              <input
                suppressHydrationWarning
                value={originSearch}
                onChange={e => { setOriginSearch(e.target.value); setActiveField('origin') }}
                onFocus={() => { setActiveField('origin'); if (!originSearch) setNavResults([]) }}
                placeholder="ORIGIN"
                className={`w-36 md:w-48 bg-transparent text-xs font-black tracking-widest outline-none uppercase ${activeField==='origin'?'text-white placeholder:text-white/50':'text-black placeholder:text-black/50'}`}/>
              {navOrigin && (
                <button onClick={() => { setNavOrigin(null); setOriginSearch(''); navOriginMarkerRef.current?.remove(); navOriginMarkerRef.current=null; setNavRoute(null); const s=mapRef.current?.getSource('plan-route') as any; s?.setData({type:'FeatureCollection',features:[]}) }}
                  className={`w-6 h-6 flex items-center justify-center transition-none border ${activeField==='origin'?'border-white hover:bg-white hover:text-black':'border-black hover:bg-black hover:text-white'}`}><X size={14} className="stroke-[3]"/></button>
              )}
            </div>

            <div className="hidden md:flex items-center justify-center px-1">
              <ArrowRight size={18} className="text-black stroke-[3]"/>
            </div>

            {/* Destination input */}
            <div className={`flex items-center gap-3 px-4 py-3 border border-transparent ${activeField==='dest'?'bg-black text-white':'bg-white text-black'}`}>
              <div className={`w-3 h-3 border-2 ${activeField==='dest'?'border-white bg-black':'border-black bg-white'} shrink-0`} />
              <input
                suppressHydrationWarning
                value={destSearch}
                onChange={e => { setDestSearch(e.target.value); setActiveField('dest') }}
                onFocus={() => { setActiveField('dest'); if (!destSearch) setNavResults([]) }}
                placeholder="DESTINATION"
                className={`w-36 md:w-48 bg-transparent text-xs font-black tracking-widest outline-none uppercase ${activeField==='dest'?'text-white placeholder:text-white/50':'text-black placeholder:text-black/50'}`}/>
              {navDest && (
                <button onClick={() => { setNavDest(null); setDestSearch(''); navDestMarkerRef.current?.remove(); navDestMarkerRef.current=null; setNavRoute(null); const s=mapRef.current?.getSource('plan-route') as any; s?.setData({type:'FeatureCollection',features:[]}) }}
                  className={`w-6 h-6 flex items-center justify-center transition-none border ${activeField==='dest'?'border-white hover:bg-white hover:text-black':'border-black hover:bg-black hover:text-white'}`}><X size={14} className="stroke-[3]"/></button>
              )}
            </div>
          </div>

          {/* Dropdown & Route Summary Container */}
          {(activeField !== null || navRoute) && (
            <div className="absolute top-[100%] mt-4 w-full min-w-[320px] max-w-[480px] bg-white border-2 border-black shadow-[8px_8px_0_0_#000] overflow-hidden flex flex-col font-sans">
              
              {/* Dropdown: live location + geocode results */}
              {activeField !== null && (
                <div className="max-h-72 overflow-y-auto custom-scrollbar">

                  {/* Live location option */}
                  <button
                    onClick={useLiveAsOrigin}
                    disabled={liveLocating}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black hover:text-white transition-none border-b-2 border-black disabled:opacity-60 group">
                    <div className="w-8 h-8 bg-white border-2 border-black group-hover:border-white flex items-center justify-center shrink-0">
                      {liveLocating
                        ? <div className="w-4 h-4 bg-black group-hover:bg-white animate-pulse" />
                        : <Crosshair size={16} className="text-black group-hover:text-white stroke-[3]"/>}
                    </div>
                    <div>
                      <p className="text-xs font-black tracking-widest uppercase text-black group-hover:text-white">USE LIVE LOCATION</p>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-black/50 group-hover:text-white/50 mt-1">REQUIRES ACCESS</p>
                    </div>
                  </button>

                  {/* Loading state */}
                  {navLoading && (
                    <div className="flex items-center gap-3 px-5 py-5 border-b border-black">
                      <div className="w-4 h-4 bg-black animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-black">SEARCHING NETWORK...</span>
                    </div>
                  )}

                  {/* Geocode results */}
                  {!navLoading && navResults.map((p, i) => (
                    <button key={i} onClick={() => selectNavPlace(p)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black hover:text-white transition-none border-b border-black last:border-0 group">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black uppercase tracking-widest text-black group-hover:text-white truncate">{p.name.split(',')[0]}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 group-hover:text-white/50 mt-1 truncate">{p.name.split(',').slice(1,3).join(',').trim()}</div>
                      </div>
                    </button>
                  ))}

                  {/* No results hint */}
                  {!navLoading && activeQuery.length > 1 && navResults.length === 0 && (
                    <div className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest text-black/50">NO COORDINATES FOUND.</div>
                  )}
                  {!navLoading && activeQuery.length <= 1 && navResults.length === 0 && (
                    <div className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest text-black/50">INPUT TARGET LOCALITY...</div>
                  )}
                </div>
              )}

              {/* Route summary card */}
              {navRoute && navOrigin && navDest && (
                <div className={`p-6 bg-white ${activeField !== null ? 'border-t-2 border-black' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-black tracking-widest uppercase mb-2">
                        <div className="w-2 h-2 bg-black" /> ROUTE LOCKED
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-black">
                        {navOrigin.name.split(',')[0]} <span className="text-black/50 mx-2">→</span> {navDest.name.split(',')[0]}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-lg font-mono font-bold text-black">{navRoute.distance} NM</span>
                        <span className="w-2 h-2 bg-black/20"/>
                        <span className="text-xs font-bold text-black/70 uppercase tracking-widest">
                          {navRoute.duration >= 60 ? `${Math.floor(navRoute.duration/60)}H ${navRoute.duration%60}M` : `${navRoute.duration}M`}
                        </span>
                      </div>
                    </div>
                    <button onClick={clearNavRoute}
                      className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-none">
                      <X size={18} className="stroke-[3]"/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Edge Controls & Settings Popover ── */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-auto z-[60] flex flex-col gap-4">
          
          {/* Tool Column */}
          <div className="flex flex-col items-center bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-1">
             <button onClick={zoomIn} title="Zoom In" className="w-10 h-10 flex items-center justify-center text-black border border-transparent hover:border-black hover:bg-black hover:text-white transition-none"><ZoomIn size={18} className="stroke-[2]"/></button>
             <button onClick={zoomOut} title="Zoom Out" className="w-10 h-10 flex items-center justify-center text-black border border-transparent hover:border-black hover:bg-black hover:text-white transition-none"><ZoomOut size={18} className="stroke-[2]"/></button>
             <div className="h-0.5 w-6 bg-black/20 my-1"/>
             <button onClick={goHome} title="Reset View" className="w-10 h-10 flex items-center justify-center text-black border border-transparent hover:border-black hover:bg-black hover:text-white transition-none"><Home size={18} className="stroke-[2]"/></button>
             <button onClick={fitAll} title="Fit All Vessels" className="w-10 h-10 flex items-center justify-center text-black border border-transparent hover:border-black hover:bg-black hover:text-white transition-none"><Crosshair size={18} className="stroke-[2]"/></button>
             <div className="h-0.5 w-6 bg-black/20 my-1"/>
             <button onClick={()=>setIs3D(v=>!v)} title="Toggle 3D" className={`w-10 h-10 flex items-center justify-center transition-none ${is3D?'bg-black text-white':'text-black hover:border-black hover:bg-black hover:text-white'}`}><Mountain size={18} className="stroke-[2]"/></button>
             <div className="h-0.5 w-6 bg-black/20 my-1"/>
             {/* Open Map Settings */}
             <button onClick={()=>setLayerMenuOpen(v=>!v)} title="Map Settings" className={`w-10 h-10 flex items-center justify-center transition-none border ${layerMenuOpen?'border-black bg-black text-white':'border-transparent text-black hover:border-black hover:bg-black hover:text-white'}`}><Layers size={18} className="stroke-[2]"/></button>
          </div>

          {/* Map Settings Popover */}
          {layerMenuOpen && (
            <div className="absolute right-[64px] top-1/2 -translate-y-1/2 w-[280px] bg-white border-2 border-black shadow-[8px_8px_0_0_#000] flex flex-col font-sans">
               {/* Map Environment */}
               <div className="p-4 border-b-2 border-black">
                  <div className="text-[10px] font-black text-black/50 tracking-widest uppercase mb-3">ENVIRONMENT</div>
                  <div className="grid grid-cols-2 gap-2">
                     {(Object.keys(TILES) as (keyof typeof TILES)[]).map(k=>(
                       <button key={k} onClick={()=>setTileKey(k)}
                         className={`px-3 py-2 text-center text-[10px] font-black tracking-widest uppercase transition-none border-2 ${tileKey===k?'bg-black text-white border-black':'bg-white text-black border-black/20 hover:border-black'}`}>
                         {TILES[k].label}
                       </button>
                     ))}
                  </div>
               </div>
               
               {/* Layers */}
               <div className="p-4 flex flex-col gap-2">
                  <div className="text-[10px] font-black text-black/50 tracking-widest uppercase mb-2">DATA LAYERS</div>
                  {[
                    {id:'ves', icon:<Ship size={14} className="stroke-[2]"/>, val:showVessels, set:setShowVessels, label:'VESSELS'},
                    {id:'rt', icon:<Navigation2 size={14} className="stroke-[2]"/>, val:showRoutes, set:setShowRoutes, label:'ROUTING'},
                    {id:'pt', icon:<Anchor size={14} className="stroke-[2]"/>, val:showPorts, set:setShowPorts, label:'PORTS'},
                    {id:'zn', icon:<AlertTriangle size={14} className="stroke-[2]"/>, val:showZones, set:setShowZones, label:'HAZARDS'},
                    {id:'tr', icon:<Wind size={14} className="stroke-[2]"/>, val:showTrails, set:setShowTrails, label:'TELEMETRY'},
                  ].map((l)=>(
                    <button key={l.id} onClick={()=>l.set(!l.val)} className="flex items-center justify-between w-full px-3 py-2 border-2 border-black hover:bg-black/5 transition-none group">
                       <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-black">
                         {l.icon} {l.label}
                       </div>
                       <div className={`w-4 h-4 border-2 border-black transition-none ${l.val?'bg-black':'bg-white'}`} />
                    </button>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* ── Minimal Coordinate Pill (Bottom Right) ── */}
        <div className="absolute right-6 bottom-6 pointer-events-auto z-[50] flex items-center gap-2">
            {coords && (
              <div className="flex items-center bg-white border-2 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] gap-3">
                <Globe size={12} className="text-black stroke-[3]"/>
                <span className="text-[10px] font-black tracking-widest text-black uppercase font-mono mt-0.5">
                  {coords.lat>0?coords.lat.toFixed(3)+'°N':Math.abs(coords.lat).toFixed(3)+'°S'} {coords.lng>0?coords.lng.toFixed(3)+'°E':Math.abs(coords.lng).toFixed(3)+'°W'}
                </span>
                <span className="w-1 h-1 bg-black"/>
                <span className="text-[10px] font-black tracking-widest text-black uppercase font-mono mt-0.5">Z:{Math.round(zoom*10)/10}</span>
              </div>
            )}
        </div>
      </div>

      {/* ── Context menu ── */}
      {contextMenu && (
        <div className="absolute z-50 pointer-events-auto"
          style={{left:contextMenu.x+8, top:contextMenu.y+8}}>
          <div className="bg-white border-2 border-black shadow-[6px_6px_0_0_#000] min-w-[220px] font-sans">
            <div className="px-5 py-3 border-b-2 border-black text-[10px] font-black text-black bg-white uppercase tracking-widest font-mono">
              {contextMenu.lat.toFixed(4)}°, {contextMenu.lng.toFixed(4)}°
            </div>
            {[
              {icon:<Pin size={16} className="stroke-[2]"/>, label:'PIN LOCATION', fn:()=>{addPin(contextMenu.lat,contextMenu.lng);setContextMenu(null)}},
              {icon:<Navigation2 size={16} className="stroke-[2]"/>, label:'ROUTE ORIGIN', fn:()=>{setRoutePlanMode(true);setRoutePlanStep('dest');const el=document.createElement('div');el.innerHTML=`<div style="width:16px;height:16px;background:#000;border:2px solid #fff;box-shadow:0 0 0 2px #000;"></div>`;routePlannerRef.current.origin?.remove();routePlannerRef.current.origin=new mapboxgl.Marker({element:el}).setLngLat([contextMenu.lng,contextMenu.lat]).addTo(mapRef.current!);setContextMenu(null)}},
              {icon:<MapIcon size={16} className="stroke-[2]"/>, label:'FLY HERE', fn:()=>{mapRef.current?.flyTo({center:[contextMenu.lng,contextMenu.lat],zoom:8,duration:1500});setContextMenu(null)}},
              {icon:<X size={16} className="stroke-[2]"/>, label:'DISMISS', fn:()=>setContextMenu(null)},
            ].map((item,i)=>(
              <button key={i} onClick={item.fn}
                className="w-full flex items-center gap-4 px-5 py-3 text-left text-xs font-black tracking-widest text-black uppercase hover:bg-black hover:text-white border-b border-black last:border-0 transition-none">
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hoverTooltip &&
        <div className="absolute z-50 pointer-events-none" style={{left:hoverTooltip.x+12,top:hoverTooltip.y-10}}
          dangerouslySetInnerHTML={{__html:hoverTooltip.html}}/>
      }
    </div>
  )
}
