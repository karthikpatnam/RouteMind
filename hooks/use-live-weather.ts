'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Route } from '@/lib/mock-data'

export interface WeatherData {
  status: 'live' | 'fallback' | 'loading' | 'error'
  lat: number
  lng: number
  severity: 'calm' | 'moderate' | 'rough' | 'severe'
  risk_factor: number       // 0.0 – 1.0
  wave_height: number       // metres
  wave_direction: number    // degrees
  wave_period: number       // seconds
  swell_height: number      // metres
  swell_direction: number
  ocean_current: number     // km/h
  wind_speed: number        // m/s
  wind_direction: number    // degrees
  wind_speed_kts: number    // knots
  precipitation: number     // mm/h
  visibility: number        // metres
  weather_code: number
  summary: string
  fetchedAt?: Date
}

type WeatherMap = Record<string, WeatherData>

const POLL_INTERVAL_MS = 60_000  // 60 seconds
const BACKEND = 'http://localhost:8000'

async function fetchWeatherForRoute(route: Route): Promise<WeatherData | null> {
  // Use current vessel position if available, otherwise use route origin
  const pos = route.currentLocation ?? route.origin
  try {
    const res = await fetch(
      `${BACKEND}/api/weather/marine?lat=${pos.lat.toFixed(4)}&lng=${pos.lng.toFixed(4)}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { ...json.data, fetchedAt: new Date() } as WeatherData
  } catch {
    return null
  }
}

/**
 * useLiveWeather — polls /api/weather/marine every 60 seconds for each active route.
 * Returns:
 *   weatherMap   — Record<routeId, WeatherData>
 *   isLoading    — true on initial fetch
 *   lastUpdated  — Date of last successful poll cycle
 */
export function useLiveWeather(routes: Route[]) {
  const [weatherMap, setWeatherMap] = useState<WeatherMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef(true)

  const pollAll = useCallback(async () => {
    if (!activeRef.current || routes.length === 0) return
    const results = await Promise.allSettled(
      routes.map(r => fetchWeatherForRoute(r).then(data => ({ id: r.id, data })))
    )
    if (!activeRef.current) return

    setWeatherMap(prev => {
      const next = { ...prev }
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { id, data } = result.value
          if (data) {
            next[id] = data
          } else if (!next[id]) {
            // First fetch failed — set a loading placeholder
            next[id] = {
              status: 'error',
              lat: 0, lng: 0, severity: 'calm', risk_factor: 0,
              wave_height: 0, wave_direction: 0, wave_period: 0,
              swell_height: 0, swell_direction: 0, ocean_current: 0,
              wind_speed: 0, wind_direction: 0, wind_speed_kts: 0,
              precipitation: 0, visibility: 10000, weather_code: 0,
              summary: 'Weather data unavailable.',
            }
          }
        }
      }
      return next
    })
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [routes])

  useEffect(() => {
    activeRef.current = true
    setIsLoading(true)
    pollAll()
    timerRef.current = setInterval(pollAll, POLL_INTERVAL_MS)
    return () => {
      activeRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pollAll])

  return { weatherMap, isLoading, lastUpdated }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns the weather-adjusted risk score (0–100) */
export function blendRisk(baseRisk: number, weather?: WeatherData): number {
  if (!weather || weather.status === 'error') return baseRisk
  // Weather contributes up to +30 points on top of the base risk score
  const weatherBoost = Math.round(weather.risk_factor * 30)
  return Math.min(baseRisk + weatherBoost, 100)
}

/** Maps severity → color tokens used across UI */
export const SEVERITY_COLORS = {
  calm:     { text: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'Calm' },
  moderate: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'Moderate' },
  rough:    { text: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  label: 'Rough' },
  severe:   { text: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   label: 'Severe' },
} as const

/** Returns the compass direction label for a bearing */
export function compassDir(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

/** WMO weather code → short description */
export function wmoLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}
