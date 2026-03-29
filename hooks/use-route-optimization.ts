'use client'

import { useState, useCallback, useRef } from 'react'

const BACKEND = 'http://localhost:8000'

export interface OptimizedRoute {
  route_id: string
  geometry: any
  distance_km: number
  duration_hours: number
  cost_estimate: number
  waypoints: { lon: number; lat: number }[]
  risk_scores: {
    weather_risk: number
    traffic_risk: number
    news_risk: number
    total_risk: number
  }
}

export interface OptimizationResult {
  status: string
  processing_time_seconds: number
  best_route: OptimizedRoute
  explanation: string
  original_route: any
  all_routes: {
    route_id: string
    distance_km: number
    duration_hours: number
    cost_estimate: number
    waypoints: { lon: number; lat: number }[]
    scores: {
      distance_score: number
      duration_score: number
      weather_risk: number
      traffic_risk: number
      news_risk: number
      cost_score: number
      total_risk: number
    }
  }[]
  risk_details: {
    weather_assessments: any[]
    news_assessments: any[]
    traffic_assessments: any[]
  }
  iterations: number
  monitor_reason: string
}

/**
 * useRouteOptimization — calls POST /optimize-route on the backend
 * and returns the full optimization result with routes, scores, and AI explanation.
 */
export function useRouteOptimization() {
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const optimize = useCallback(async (
    source: [number, number],  // [lon, lat]
    destination: [number, number]  // [lon, lat]
  ) => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsOptimizing(true)
    setError(null)

    try {
      const res = await fetch(`${BACKEND}/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `HTTP ${res.status}`)
      }

      const data: OptimizationResult = await res.json()
      setResult(data)
      setIsOptimizing(false)
      return data
    } catch (err: any) {
      if (err.name === 'AbortError') return null
      const msg = err.message || 'Route optimization failed'
      setError(msg)
      setIsOptimizing(false)
      return null
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setResult(null)
    setError(null)
    setIsOptimizing(false)
  }, [])

  return { result, isOptimizing, error, optimize, reset }
}
