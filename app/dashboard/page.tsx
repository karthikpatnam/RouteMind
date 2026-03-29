'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { AlertFeed } from '@/components/dashboard/alert-feed'
import { AIDecisionPanel } from '@/components/dashboard/ai-decision-panel'
import { AgentGrid } from '@/components/dashboard/agent-card'
import { SimulationControls } from '@/components/dashboard/simulation-controls'
import { RouteDetailPanel } from '@/components/dashboard/route-detail-panel'
import { MapboxTracker } from '@/components/dashboard/mapbox-tracker'
import { useLiveWeather, blendRisk, SEVERITY_COLORS } from '@/hooks/use-live-weather'
import { useRouteOptimization, type OptimizationResult } from '@/hooks/use-route-optimization'
import { Activity, Map as MapIcon, Database, Satellite, X, Wind, AlertTriangle, Brain, Loader2, CheckCircle2, Route as RouteIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  routes as initialRoutes,
  alerts as initialAlerts,
  agents as initialAgents,
  predictions as initialPredictions,
  type Route,
  type Alert,
  type Agent
} from '@/lib/mock-data'

// ── AI Route Recommendation Popup ─────────────────────────────────────────
function AIRecommendationPopup({
  result,
  onClose,
  onViewRoute,
}: {
  result: OptimizationResult
  onClose: () => void
  onViewRoute: (routeId: string) => void
}) {
  const best = result.best_route
  const totalRisk = best.risk_scores?.total_risk ?? 0
  const riskPct = Math.round(totalRisk * 100)
  const isLowRisk = totalRisk < 0.3
  const isMedRisk = totalRisk >= 0.3 && totalRisk < 0.6
  const isHighRisk = totalRisk >= 0.6

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white border-2 border-black shadow-[12px_12px_0_0_#000] max-w-lg w-full max-h-[90vh] overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-black bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center">
              <Brain className="h-5 w-5 stroke-[3]" />
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-widest leading-none">
                AI Route Intelligence
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">
                LangGraph Multi-Agent Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-white/30 text-white hover:bg-white hover:text-black transition-none"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        {/* Best Route Badge */}
        <div className="p-6 border-b border-black">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                isLowRisk
                  ? 'bg-emerald-500 text-white'
                  : isMedRisk
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {isLowRisk ? '✓ LOW RISK' : isMedRisk ? '⚠ MODERATE RISK' : '✗ HIGH RISK'}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
              {result.processing_time_seconds}s ANALYSIS
            </span>
          </div>

          <div className="text-xs font-black uppercase tracking-widest text-black/50 mb-2">
            Recommended Route
          </div>
          <div className="text-2xl font-black text-black uppercase tracking-tight leading-none mb-4">
            {best.route_id?.replace('candidate-', 'Route ')}
          </div>

          {/* Route stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-black p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-1">
                Distance
              </div>
              <div className="font-mono font-bold text-lg text-black leading-none">
                {best.distance_km}
                <span className="text-xs text-black/50 ml-1">km</span>
              </div>
            </div>
            <div className="border border-black p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-1">
                Duration
              </div>
              <div className="font-mono font-bold text-lg text-black leading-none">
                {best.duration_hours}
                <span className="text-xs text-black/50 ml-1">hrs</span>
              </div>
            </div>
            <div className="border border-black p-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-1">
                Cost
              </div>
              <div className="font-mono font-bold text-lg text-black leading-none">
                ${best.cost_estimate}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="p-6 border-b border-black bg-black/[0.02]">
          <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-4 flex items-center gap-2">
            <Activity className="h-3 w-3 stroke-[3]" />
            Multi-Agent Risk Scores
          </div>

          <div className="space-y-3">
            {[
              { label: 'Weather', value: best.risk_scores?.weather_risk ?? 0, emoji: '🌤️' },
              { label: 'Traffic', value: best.risk_scores?.traffic_risk ?? 0, emoji: '🚗' },
              { label: 'Geopolitical', value: best.risk_scores?.news_risk ?? 0, emoji: '📰' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-sm">{r.emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-black w-28">
                  {r.label}
                </span>
                <div className="flex-1 h-2 bg-black/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      r.value > 0.5
                        ? 'bg-red-500'
                        : r.value > 0.25
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(r.value * 100, 2)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-xs text-black w-12 text-right">
                  {(r.value * 100).toFixed(0)}%
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center gap-3 pt-3 border-t border-black">
              <span className="text-sm">📊</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-black w-28">
                Total Risk
              </span>
              <div className="flex-1 h-3 bg-black/10 overflow-hidden border border-black">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(riskPct, 2)}%` }}
                />
              </div>
              <span className="font-mono font-black text-sm text-black w-12 text-right">
                {riskPct}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Explanation */}
        <div className="p-6 border-b border-black">
          <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-3 flex items-center gap-2">
            <Brain className="h-3 w-3 stroke-[3]" />
            AI Reasoning
          </div>
          <p className="text-sm text-black leading-relaxed font-medium">
            {result.explanation || 'Route analysis complete. The selected route optimizes for the best balance of distance, duration, and safety.'}
          </p>
          {result.monitor_reason && (
            <p className="text-xs text-black/60 mt-3 italic">
              Monitor: {result.monitor_reason}
            </p>
          )}
        </div>

        {/* All Routes Comparison */}
        {result.all_routes.length > 1 && (
          <div className="p-6 border-b border-black">
            <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-4 flex items-center gap-2">
              <RouteIcon className="h-3 w-3 stroke-[3]" />
              All Candidates ({result.all_routes.length})
            </div>
            <table className="w-full text-left font-bold uppercase tracking-widest text-[10px] border-collapse border border-black">
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-2 px-3 border-r border-white/20">Route</th>
                  <th className="py-2 px-3 border-r border-white/20">Distance</th>
                  <th className="py-2 px-3 border-r border-white/20">Duration</th>
                  <th className="py-2 px-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20">
                {result.all_routes.map((r) => {
                  const isBest = r.route_id === best.route_id
                  return (
                    <tr
                      key={r.route_id}
                      className={isBest ? 'bg-emerald-50' : 'bg-white'}
                    >
                      <td className="py-2.5 px-3 border-r border-black/20 flex items-center gap-2">
                        {isBest && <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[3]" />}
                        {r.route_id?.replace('candidate-', '#')}
                      </td>
                      <td className="py-2.5 px-3 border-r border-black/20">
                        {r.distance_km}km
                      </td>
                      <td className="py-2.5 px-3 border-r border-black/20">
                        {r.duration_hours}h
                      </td>
                      <td className="py-2.5 px-3">
                        {r.scores?.total_risk !== undefined
                          ? `${(r.scores.total_risk * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-black/80 transition-none"
          >
            Accept Route
          </button>
          <button
            onClick={onClose}
            className="py-4 px-6 border-2 border-black text-black font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-none"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Optimization Loading Overlay ──────────────────────────────────────────
function OptimizingOverlay() {
  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex items-center gap-4 bg-black text-white px-6 py-4 border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] font-sans">
      <Loader2 className="h-5 w-5 animate-spin stroke-[3]" />
      <div>
        <div className="text-xs font-black uppercase tracking-widest leading-none">
          Analyzing Routes
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">
          LangGraph agents processing...
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [predictions, setPredictions] = useState(initialPredictions)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [simulatedEvent, setSimulatedEvent] = useState<string | null>(null)
  const [wxBannerDismissed, setWxBannerDismissed] = useState(false)

  // Route optimization state
  const { result: optResult, isOptimizing, error: optError, optimize, reset: resetOpt } = useRouteOptimization()
  const [showRecommendation, setShowRecommendation] = useState(false)
  const hasAutoOptimized = useRef(false)

  // ── Live weather polling ───────────────────────────────────────
  const { weatherMap, isLoading: wxLoading, lastUpdated: wxUpdated } = useLiveWeather(routes)

  // Routes with weather-blended risk scores
  const routesWithWeather = useMemo(() =>
    routes.map(r => ({ ...r, riskScore: blendRisk(r.riskScore, weatherMap[r.id]) })),
    [routes, weatherMap]
  )

  // Weather alerts: routes with rough/severe conditions
  const weatherAlerts = useMemo(() =>
    routesWithWeather
      .map(r => ({ route: r, wx: weatherMap[r.id] }))
      .filter(({ wx }) => wx && (wx.severity === 'rough' || wx.severity === 'severe'))
      .sort((a, b) => (b.wx?.risk_factor ?? 0) - (a.wx?.risk_factor ?? 0)),
    [routesWithWeather, weatherMap]
  )

  // ── Auto-optimize on dashboard load ────────────────────────────
  useEffect(() => {
    if (hasAutoOptimized.current) return
    hasAutoOptimized.current = true

    // Pick the highest-risk route to optimize
    const criticalRoute = initialRoutes.reduce((prev, curr) =>
      curr.riskScore > prev.riskScore ? curr : prev
    )

    // Small delay for the UI to settle
    const timer = setTimeout(async () => {
      toast.loading('AI agents analyzing routes...', {
        id: 'auto-optimize',
        description: 'Weather • Traffic • Geopolitical intelligence',
      })

      // Update agent statuses to "processing"
      setAgents(prev =>
        prev.map(a => ({
          ...a,
          status: 'processing' as const,
          lastUpdate: 'now',
        }))
      )

      const result = await optimize(
        [criticalRoute.origin.lng, criticalRoute.origin.lat],
        [criticalRoute.destination.lng, criticalRoute.destination.lat]
      )

      if (result) {
        // Update agents back to active with new confidence
        setAgents(prev =>
          prev.map(a => {
            if (a.type === 'weather') {
              const wxRisk = result.best_route.risk_scores?.weather_risk ?? 0
              return { ...a, status: 'active' as const, confidence: Math.round((1 - wxRisk) * 100), lastUpdate: 'just now', contribution: 25 }
            }
            if (a.type === 'news') {
              const nRisk = result.best_route.risk_scores?.news_risk ?? 0
              return { ...a, status: 'active' as const, confidence: Math.round((1 - nRisk) * 100), lastUpdate: 'just now', contribution: 10 }
            }
            if (a.type === 'traffic') {
              const tRisk = result.best_route.risk_scores?.traffic_risk ?? 0
              return { ...a, status: 'active' as const, confidence: Math.round((1 - tRisk) * 100), lastUpdate: 'just now', contribution: 20 }
            }
            if (a.type === 'routing') {
              return { ...a, status: 'active' as const, confidence: 96, lastUpdate: 'just now', contribution: 45 }
            }
            return a
          })
        )

        // Build prediction from result
        const totalRisk = result.best_route.risk_scores?.total_risk ?? 0
        const riskScore = Math.round(totalRisk * 100)
        const recommendation = riskScore > 60 ? 'reroute' as const : riskScore > 35 ? 'delay' as const : 'continue' as const

        setPredictions(prev => {
          const existing = prev.find(p => p.routeId === criticalRoute.id)
          const newPred = {
            id: existing?.id ?? `pred-opt-${Date.now()}`,
            routeId: criticalRoute.id,
            riskScore,
            confidence: Math.round((1 - totalRisk) * 100),
            recommendation,
            alternativeRoute: result.all_routes.length > 1
              ? {
                  timeSaved: Math.round(Math.abs(
                    (result.all_routes[0]?.duration_hours ?? 0) -
                    (result.best_route.duration_hours ?? 0)
                  ) * 10),
                  costReduction: Math.round(Math.abs(
                    ((result.all_routes[0]?.cost_estimate ?? 0) -
                    (result.best_route.cost_estimate ?? 0)) /
                    Math.max(result.all_routes[0]?.cost_estimate ?? 1, 1)
                  ) * 100),
                  riskReduction: Math.round(
                    Math.abs(
                      ((result.all_routes[0]?.scores?.total_risk ?? 0) -
                      (result.best_route.risk_scores?.total_risk ?? 0)) /
                      Math.max(result.all_routes[0]?.scores?.total_risk ?? 1, 0.01)
                    ) * 100
                  ),
                }
              : undefined,
          }
          return existing
            ? prev.map(p => (p.routeId === criticalRoute.id ? newPred : p))
            : [...prev, newPred]
        })

        // Dismiss loading toast and show recommendation
        toast.dismiss('auto-optimize')

        const routeName = result.best_route.route_id?.replace('candidate-', 'Route ')
        toast.success(`${routeName} recommended`, {
          id: 'recommendation',
          description: result.explanation?.slice(0, 120) + '...' || 'Multi-agent analysis complete.',
          duration: 6000,
          action: {
            label: 'View Details',
            onClick: () => setShowRecommendation(true),
          },
        })

        // Show the popup after a brief moment
        setTimeout(() => setShowRecommendation(true), 1200)

        // Select the most critical route on the map
        setSelectedRoute(initialRoutes.find(r => r.id === criticalRoute.id) ?? null)
      } else {
        toast.dismiss('auto-optimize')
        toast.error('Route analysis unavailable', {
          description: 'Backend may be offline. Using cached data.',
          duration: 4000,
        })
        // Reset agents to normal
        setAgents(initialAgents)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [optimize])

  const handleRouteSelect = useCallback((route: Route | null) => {
    setSelectedRoute(route)
  }, [])

  // Keep selectedRoute in sync with the weather-blended version
  const selectedRouteBlended = useMemo(() =>
    selectedRoute ? routesWithWeather.find(r => r.id === selectedRoute.id) ?? selectedRoute : null,
    [selectedRoute, routesWithWeather]
  )

  const handleTriggerEvent = useCallback(async (event: 'storm' | 'conflict' | 'traffic') => {
    setSimulatedEvent(event)

    // Determine source/destination for the event
    const eventRoutes = {
      storm: { id: 'route-3', origin: initialRoutes.find(r => r.id === 'route-3')! },
      conflict: { id: 'route-2', origin: initialRoutes.find(r => r.id === 'route-2')! },
      traffic: { id: 'route-4', origin: initialRoutes.find(r => r.id === 'route-4')! },
    }

    const target = eventRoutes[event]
    if (!target.origin) return

    // Fire the existing trigger endpoint
    try {
      const payload = {
        route_id: target.id,
        lat: event === 'storm' ? 45.0 : 15.0,
        lng: event === 'storm' ? -30.0 : 55.0,
        origin: target.origin.origin.name,
        destination: target.origin.destination.name,
      }
      fetch('http://localhost:8000/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    } catch {}

    // Show processing toast
    toast.loading(`Analyzing ${event} disruption...`, {
      id: `sim-${event}`,
      description: 'Running LangGraph multi-agent pipeline',
    })

    // Set agents to processing
    setAgents(prev =>
      prev.map(a => ({ ...a, status: 'processing' as const, lastUpdate: 'now' }))
    )

    // Run the optimize-route with the disrupted route's coordinates
    const result = await optimize(
      [target.origin.origin.lng, target.origin.origin.lat],
      [target.origin.destination.lng, target.origin.destination.lat]
    )

    // Apply simulation effects (same as before but integrated)
    setTimeout(() => {
      if (event === 'storm') {
        const newAlert: Alert = { id: 'alert-' + Date.now(), type: 'weather', severity: 'critical', region: 'North Atlantic', title: 'Category 5 Hurricane Formation', description: 'Rapid intensification detected. Severe threat to all northern Atlantic routes.', timestamp: 'Just now', affectedRoutes: ['route-3'] }
        setAlerts(prev => [newAlert, ...prev])
        setRoutes(prev => prev.map(r => r.id === 'route-3' ? { ...r, status: 'critical', riskScore: 95 } : r))
      } else if (event === 'conflict') {
        const newAlert: Alert = { id: 'alert-' + Date.now(), type: 'conflict', severity: 'high', region: 'Indian Ocean', title: 'Piracy Incident Detected', description: 'Suspicious vessel activity reported near primary shipping lane.', timestamp: 'Just now', affectedRoutes: ['route-2'] }
        setAlerts(prev => [newAlert, ...prev])
        setRoutes(prev => prev.map(r => r.id === 'route-2' ? { ...r, status: 'warning', riskScore: 82 } : r))
      } else if (event === 'traffic') {
        const newAlert: Alert = { id: 'alert-' + Date.now(), type: 'traffic', severity: 'medium', region: 'Suez Canal', title: 'Severe Canal Congestion', description: 'Vessel breakdown in canal causing multi-day backlog.', timestamp: 'Just now', affectedRoutes: ['route-4', 'route-2'] }
        setAlerts(prev => [newAlert, ...prev])
        setRoutes(prev => prev.map(r => (r.id === 'route-4' || r.id === 'route-2') ? { ...r, status: 'warning', riskScore: 75 } : r))
      }
    }, 800)

    if (result) {
      // Update agents with real data
      setAgents(prev =>
        prev.map(a => ({
          ...a,
          status: 'active' as const,
          lastUpdate: 'just now',
          confidence: a.type === 'weather'
            ? Math.round((1 - (result.best_route.risk_scores?.weather_risk ?? 0)) * 100)
            : a.type === 'traffic'
            ? Math.round((1 - (result.best_route.risk_scores?.traffic_risk ?? 0)) * 100)
            : a.type === 'news'
            ? Math.round((1 - (result.best_route.risk_scores?.news_risk ?? 0)) * 100)
            : 96,
        }))
      )

      // Update predictions
      const totalRisk = result.best_route.risk_scores?.total_risk ?? 0
      const riskScore = Math.round(totalRisk * 100)
      const recommendation = riskScore > 60 ? 'reroute' as const : riskScore > 35 ? 'delay' as const : 'continue' as const

      setPredictions(prev => {
        const newPred = {
          id: `pred-sim-${Date.now()}`,
          routeId: target.id,
          riskScore,
          confidence: Math.round((1 - totalRisk) * 100),
          recommendation,
          alternativeRoute: {
            timeSaved: Math.round(Math.abs(result.best_route.duration_hours - (result.all_routes[0]?.duration_hours ?? 0)) * 10) || 12,
            costReduction: 15,
            riskReduction: Math.round((1 - totalRisk) * 100),
          },
        }
        return [...prev.filter(p => p.routeId !== target.id), newPred]
      })

      toast.dismiss(`sim-${event}`)

      const routeName = result.best_route.route_id?.replace('candidate-', 'Route ')
      toast.success(`${routeName} is preferred`, {
        description: result.explanation?.slice(0, 120) || 'Analysis complete.',
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => setShowRecommendation(true),
        },
      })

      setSelectedRoute(target.origin)
      setTimeout(() => setShowRecommendation(true), 800)
    } else {
      toast.dismiss(`sim-${event}`)
      toast.error('Backend analysis unavailable', { description: 'Using fallback simulation data.' })
      // Fallback to existing simulation behavior
      setAgents(prev => prev.map(a => {
        if (event === 'storm' && a.type === 'weather') return { ...a, status: 'processing' as const, confidence: 98, contribution: 65 }
        if (event === 'conflict' && a.type === 'news') return { ...a, status: 'processing' as const, confidence: 89, contribution: 55 }
        if (event === 'traffic' && a.type === 'traffic') return { ...a, status: 'processing' as const, confidence: 95, contribution: 70 }
        if (a.type === 'routing') return { ...a, status: 'processing' as const, confidence: 85, contribution: 25 }
        return { ...a, status: 'active' as const }
      }))
    }
  }, [optimize])

  const handleReset = useCallback(() => {
    setSimulatedEvent(null); setSelectedRoute(null)
    setRoutes(initialRoutes); setAlerts(initialAlerts)
    setAgents(initialAgents); setPredictions(initialPredictions)
    resetOpt()
    setShowRecommendation(false)
  }, [resetOpt])

  const sortedRoutes = [...routesWithWeather].sort((a, b) => b.riskScore - a.riskScore)
  const mostCriticalRoute = sortedRoutes[0]
  const criticalPrediction = predictions.find(p => p.routeId === mostCriticalRoute?.id)

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 bg-white text-black font-sans divide-y lg:divide-y-0 lg:divide-x divide-black">

      {/* ═══════════ LEFT PANEL: RISK & ALERTS (3 cols) ═══════════ */}
      <div className="col-span-1 lg:col-span-3 h-full flex flex-col bg-white overflow-hidden">
        
        {/* Weather Alert Banner */}
        {weatherAlerts.length > 0 && !wxBannerDismissed && (
          <div className="border-b border-black p-4 bg-primary text-white">
            <div className="flex items-start gap-3">
              <Wind size={16} className="shrink-0 mt-0.5 stroke-[2]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold uppercase tracking-widest">
                  {weatherAlerts[0].wx!.severity === 'severe' ? 'SEVERE' : 'ROUGH'} SEAS · {weatherAlerts.length} AFFECTED
                </p>
                <p className="text-xs mt-1 truncate">
                  {weatherAlerts[0].route.vessel}: {weatherAlerts[0].wx!.summary}
                </p>
              </div>
              <button onClick={() => setWxBannerDismissed(true)} className="shrink-0 hover:opacity-70 transition-none">
                <X size={16} className="stroke-[2]" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedRouteBlended ? (
            <RouteDetailPanel
              route={selectedRouteBlended}
              onClose={() => setSelectedRoute(null)}
              weather={weatherMap[selectedRouteBlended.id]}
            />
          ) : (
            <AlertFeed alerts={alerts} />
          )}
        </div>
      </div>

      {/* ═══════════ CENTER PANEL: MAPBOX TRACKER (6 cols) ═══════════ */}
      <div className="col-span-1 lg:col-span-6 h-full flex flex-col bg-[#0a0a0a] relative">
        {/* Top Info Bar */}
        <div className="bg-white border-b border-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Satellite className="h-4 w-4 text-white stroke-[2]" />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-widest leading-none">Fleet Command</div>
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mt-1">Live Maritime AI</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-black/50">Vessels</div>
              <div className="text-xl font-bold leading-none">{routes.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-black/50">Distance</div>
              <div className="text-xl font-bold leading-none">
                {routes.reduce((acc, r) => acc + (r.distanceCovered || 0), 0).toLocaleString()}<span className="text-xs text-black/50 ml-1">km</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-black/50">Alerts</div>
              <div className="text-xl font-bold text-primary leading-none">{alerts.length}</div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative w-full h-full">
          <MapboxTracker
            routes={routesWithWeather}
            selectedRoute={selectedRouteBlended}
            onRouteSelect={handleRouteSelect}
            weatherMap={weatherMap}
          />
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: AI CONTROLS (3 cols) ═══════════ */}
      <div className="col-span-1 lg:col-span-3 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar divide-y divide-black">
        {/* Simulation Controls */}
        <div className="p-0">
          <SimulationControls
            onTriggerEvent={handleTriggerEvent}
            onReset={handleReset}
          />
        </div>

        {/* Critical Decision */}
        {criticalPrediction && (
          <div className="p-0">
            <AIDecisionPanel
              riskScore={criticalPrediction.riskScore}
              confidence={criticalPrediction.confidence}
              recommendation={criticalPrediction.recommendation}
              alternativeRoute={criticalPrediction.alternativeRoute}
            />
          </div>
        )}

        {/* Multi-Agent Network */}
        <div className="p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 stroke-[2]" />
              AI Agents
            </div>
            <span className={`text-[10px] px-2 py-1 ${isOptimizing ? 'bg-primary text-white animate-pulse' : 'bg-black text-white'}`}>
              {isOptimizing ? 'PROCESSING' : 'SYNC'}
            </span>
          </h2>
          <AgentGrid agents={agents} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-1" />
        </div>
      </div>

      {/* ═══════════ OVERLAYS ═══════════ */}
      {isOptimizing && <OptimizingOverlay />}

      {showRecommendation && optResult && (
        <AIRecommendationPopup
          result={optResult}
          onClose={() => setShowRecommendation(false)}
          onViewRoute={(id) => {
            setShowRecommendation(false)
          }}
        />
      )}
    </div>
  )
}
