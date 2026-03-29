'use client'

import { WeatherAgentInterface } from '@/components/dashboard/weather-agent-interface'
import { Cloud, Zap, Shield, Brain, Globe, TrendingUp } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Brain,
    title: 'NLP Intent Extraction',
    desc: 'Gemini 2.5 Flash parses your natural language query to extract the city, time horizon, and logistics intent.',
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  },
  {
    step: '02',
    icon: Globe,
    title: 'Live Weather Fetch',
    desc: "OpenWeather's 5-day forecast API is queried for the extracted location — yielding temperature, precipitation probability, wind speed, and storm conditions.",
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
  {
    step: '03',
    icon: Shield,
    title: 'Risk Decision Engine',
    desc: 'The AI applies logistics-specific rules: Rain > 60% → delivery risk. Temp > 40°C → cold-chain advisory. Wind > 20 m/s → route delay.',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  {
    step: '04',
    icon: TrendingUp,
    title: 'Business Recommendation',
    desc: 'A structured response is returned: Weather Summary, Risk Level (Low/Medium/High), Supply Chain Impact, and an Actionable Recommendation.',
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
]

export default function WeatherAgentPage() {
  return (
    <div className="flex flex-col gap-8 pb-8 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Cloud className="h-8 w-8 text-primary" />
            Weather Intelligence Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            AI-powered real-time weather analysis for proactive supply chain disruption prediction. Ask anything in plain English.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold tracking-wider px-3 py-1.5 rounded-full flex-shrink-0">
          <Zap size={12} />
          LIVE
        </div>
      </div>

      {/* Two-column layout: chat left, How It Works right */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 flex-1 min-h-0">

        {/* Left: Chat Interface */}
        <div className="flex flex-col bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm min-h-[620px]">
          <WeatherAgentInterface />
        </div>

        {/* Right: How It Works */}
        <div className="flex flex-col gap-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Brain size={15} className="text-primary" />
              How It Works
            </h3>
            <div className="flex flex-col gap-4">
              {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }) => (
                <div key={step} className="flex gap-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-snug mb-0.5">{step}. {title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk level legend */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield size={15} className="text-primary" />
              Risk Level Guide
            </h3>
            <div className="flex flex-col gap-3">
              {[
                { level: 'LOW', label: 'Operations safe. Normal shipment procedures apply.', dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
                { level: 'MEDIUM', label: 'Monitor conditions. Consider contingency planning.', dot: 'bg-amber-400', badge: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
                { level: 'HIGH', label: 'Significant disruption likely. Action required.', dot: 'bg-red-400', badge: 'text-red-400 bg-red-400/10 border-red-400/30' },
              ].map(({ level, label, dot, badge }) => (
                <div key={level} className="flex items-start gap-3">
                  <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${dot}`} />
                  <div>
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${badge}`}>{level}</span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Info */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-widest">Data Sources</h3>
            <div className="flex flex-col gap-2">
              {[
                { name: 'OpenWeather API', detail: '5-day / 3hr forecast', status: 'ACTIVE' },
                { name: 'Gemini 2.5 Flash', detail: 'NLP + Risk Analysis', status: 'ACTIVE' },
              ].map(({ name, detail, status }) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-muted-foreground">{detail}</p>
                  </div>
                  <span className="font-bold text-emerald-400 tracking-widest">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
