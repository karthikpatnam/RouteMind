'use client'

import { X, Clock, Package, AlertTriangle, TrendingUp, ArrowRight, Compass, Gauge, MapPin, Wind, Waves, Droplets, Eye, Anchor, RefreshCw } from 'lucide-react'
import { type Route, predictions } from '@/lib/mock-data'
import { type WeatherData, SEVERITY_COLORS, compassDir, wmoLabel } from '@/hooks/use-live-weather'
import { cn } from '@/lib/utils'

interface RouteDetailPanelProps {
  route: Route
  onClose: () => void
  weather?: WeatherData
}

function getRiskColor(score: number): string {
  if (score >= 70) return 'text-primary'
  if (score >= 40) return 'text-black'
  return 'text-black'
}

function getRiskBgColor(score: number): string {
  if (score >= 70) return 'bg-primary'
  if (score >= 40) return 'bg-black'
  return 'bg-black'
}

function getStatusBadge(status: Route['status']) {
  const styles = {
    normal:   'bg-white text-black border border-black',
    warning:  'bg-black text-white',
    critical: 'bg-primary text-white',
  }
  const labels = { normal: 'NORMAL', warning: 'WARNING', critical: 'CRITICAL' }
  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function WeatherMetric({ icon: Icon, label, value, sub }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex flex-col gap-1 bg-white border border-black p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-black/50">
        <Icon size={12} className="stroke-[2]" />
        {label}
      </div>
      <div className="font-mono font-bold text-lg text-black leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest leading-tight">{sub}</div>}
    </div>
  )
}

export function RouteDetailPanel({ route, onClose, weather }: RouteDetailPanelProps) {
  const prediction = predictions.find(p => p.routeId === route.id)
  const sev = weather?.severity ?? 'calm'
  const sevColors = SEVERITY_COLORS[sev]

  return (
    <div className="bg-white border-l border-black flex flex-col h-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-black">
        <div>
          <h3 className="font-bold text-xl text-black uppercase tracking-tight leading-none">{route.name}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/50 mt-1">{route.vessel}</p>
        </div>
        <button onClick={onClose} className="p-2 border border-black text-black hover:bg-black hover:text-white transition-none">
          <X className="h-5 w-5 stroke-[3]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Route info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 border border-black">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Origin</div>
              <div className="font-bold text-sm uppercase tracking-widest text-black flex items-center gap-2">
                <MapPin className="h-4 w-4 stroke-[2]" />
                {route.origin.name}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-black stroke-[3] flex-shrink-0" />
            <div className="flex-1 text-right">
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Destination</div>
              <div className="font-bold text-sm uppercase tracking-widest text-black flex items-center justify-end gap-2">
                <MapPin className="h-4 w-4 stroke-[2]" />
                {route.destination.name}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-black p-4 flex flex-col items-center justify-center">
              <Clock className="h-5 w-5 mb-2 stroke-[2] text-black" />
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">ETA</div>
              <div className="font-mono font-bold text-sm text-black">{route.eta}</div>
            </div>
            <div className="bg-white border border-black p-4 flex flex-col items-center justify-center">
              <Package className="h-5 w-5 mb-2 stroke-[2] text-black" />
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">Cargo</div>
              <div className="font-bold uppercase tracking-widest text-[10px] text-black text-center">{route.cargo}</div>
            </div>
            <div className="bg-white border border-black p-4 flex flex-col items-center justify-center">
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">Status</div>
              <div>{getStatusBadge(route.status)}</div>
            </div>
          </div>
        </div>

        {/* Risk Score */}
        <div className="space-y-4 bg-black text-white p-6 border border-black">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Gauge className="h-4 w-4 stroke-[2]" />
              Risk Analysis
            </span>
            <span className={`text-4xl font-mono font-bold tracking-tighter leading-none ${getRiskColor(route.riskScore)}`}>
              {route.riskScore}
            </span>
          </div>
          <div className="h-2 w-full bg-white/20">
            <div
              className={`h-full ${getRiskBgColor(route.riskScore)} transition-none`}
              style={{ width: `${route.riskScore}%` }}
            />
          </div>
          <div className="flex justify-between font-bold uppercase tracking-widest text-[10px] text-white/50">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
        </div>

        {/* ── Live Weather Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-black">
            <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-black">
              <Waves className="h-4 w-4 stroke-[2]" />
              Live Telemetry
            </span>
            {weather?.fetchedAt && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-black/50">
                <RefreshCw size={10} className="stroke-[3]" />
                {weather.fetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {!weather || weather.status === 'error' ? (
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-black bg-black/5 border border-black p-4">
              <RefreshCw size={14} className="animate-spin stroke-[2]" />
              Establishing uplink...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Severity Banner */}
              <div className={cn(
                  "flex items-center justify-between p-4 border border-black",
                  sev === 'severe' ? 'bg-primary text-white' : 'bg-black text-white'
              )}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {sev === 'severe' ? '⛈️' : sev === 'rough' ? '🌊' : sev === 'moderate' ? '⛵' : '🌤️'}
                  </span>
                  <div>
                    <div className="font-bold tracking-widest uppercase text-xs leading-none mb-1">{sevColors.label} SEAS</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{weather.summary}</div>
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {wmoLabel(weather.weather_code)}
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-4">
                <WeatherMetric
                  icon={Waves}
                  label="Wave Height"
                  value={`${weather.wave_height}m`}
                  sub={`Swell ${weather.swell_height}m · ${compassDir(weather.wave_direction)}`}
                />
                <WeatherMetric
                  icon={Wind}
                  label="Wind Speed"
                  value={`${weather.wind_speed_kts}kts`}
                  sub={`${weather.wind_speed}m/s · ${compassDir(weather.wind_direction)}`}
                />
                <WeatherMetric
                  icon={Droplets}
                  label="Precipitation"
                  value={`${weather.precipitation}mm/h`}
                  sub={weather.precipitation > 0 ? 'ACTIVE PRECIPITATION' : 'DRY'}
                />
                <WeatherMetric
                  icon={Eye}
                  label="Visibility"
                  value={weather.visibility >= 10000 ? '10+km' : `${(weather.visibility / 1000).toFixed(1)}km`}
                  sub={weather.visibility < 1000 ? 'FOG RISK' : weather.visibility < 5000 ? 'REDUCED' : 'CLEAR'}
                />
              </div>

              {(sev === 'rough' || sev === 'severe') && (
                <div className="flex items-center gap-3 bg-white border border-black p-4 text-[10px] font-bold uppercase tracking-widest text-black">
                  <AlertTriangle size={14} className="stroke-[2] shrink-0" />
                  {sev === 'severe'
                    ? 'CRITICAL ALERT: SEVERE SEA STATE. REROUTING ADVISED.'
                    : 'WARNING: ROUGH CONDITIONS. PREPARE CONTINGENCY.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Prediction */}
        {prediction && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black pb-2 border-b border-black">
              <TrendingUp className="h-4 w-4 stroke-[2] text-black" />
              AI Projection
            </div>

            <div className="bg-white border border-black p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-black/10 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">Confidence</span>
                <span className="font-mono font-bold text-black text-2xl leading-none">{prediction.confidence}%</span>
              </div>
              <div className="flex items-center justify-between pb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">Directive</span>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border border-black ${
                  prediction.recommendation === 'reroute'
                    ? 'bg-black text-white'
                    : prediction.recommendation === 'delay'
                    ? 'bg-primary text-white'
                    : 'bg-white text-black'
                }`}>
                  {prediction.recommendation === 'reroute' ? 'REROUTE' :
                   prediction.recommendation === 'delay' ? 'DELAY' : 'CONTINUE'}
                </span>
              </div>

              {prediction.alternativeRoute && (
                <div className="border-t border-black pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-black/50 mb-4">Alternative Route</div>
                  <div className="grid grid-cols-3 divide-x divide-black border border-black">
                    <div className="bg-white p-4 flex flex-col items-center justify-center">
                      <div className="text-black font-mono font-bold text-lg leading-none mb-1">-{prediction.alternativeRoute.timeSaved}H</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-black/50">Time</div>
                    </div>
                    <div className="bg-white p-4 flex flex-col items-center justify-center">
                      <div className="text-black font-mono font-bold text-lg leading-none mb-1">-{prediction.alternativeRoute.costReduction}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-black/50">Cost</div>
                    </div>
                    <div className="bg-white p-4 flex flex-col items-center justify-center">
                      <div className="text-primary font-mono font-bold text-lg leading-none mb-1">-{prediction.alternativeRoute.riskReduction}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-black/50">Risk</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-black bg-white flex flex-col gap-4">
        {prediction?.recommendation === 'reroute' && (
          <button className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-black transition-none">
            EXECUTE REROUTE
          </button>
        )}
        <button className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-white border border-black text-black hover:bg-black hover:text-white transition-none">
          FULL TELEMETRY
        </button>
      </div>
    </div>
  )
}
