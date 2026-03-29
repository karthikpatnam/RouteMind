'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Cloud, AlertTriangle, CheckCircle, Info, Loader2, Sparkles, MapPin, Clock, TrendingUp } from 'lucide-react'

interface AgentResponse {
  summary: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
  impact: string
  recommendation: string
}

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  response?: AgentResponse
  timestamp: Date
}

const EXAMPLE_QUERIES = [
  "Will rain affect deliveries in Mumbai tomorrow?",
  "Which routes are risky in Chennai this week?",
  "Should we delay shipments from Delhi?",
  "Is it safe to ship perishables to Dubai today?",
]

const RiskBadge = ({ level }: { level: AgentResponse['risk_level'] }) => {
  const config = {
    LOW: { label: 'LOW RISK', icon: CheckCircle, classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
    MEDIUM: { label: 'MEDIUM RISK', icon: AlertTriangle, classes: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
    HIGH: { label: 'HIGH RISK', icon: AlertTriangle, classes: 'text-red-400 bg-red-400/10 border-red-400/30' },
    UNKNOWN: { label: 'UNKNOWN', icon: Info, classes: 'text-muted-foreground bg-muted/40 border-border' },
  }
  const { label, icon: Icon, classes } = config[level] || config['UNKNOWN']
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${classes}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

const RiskBar = ({ level }: { level: AgentResponse['risk_level'] }) => {
  const widths = { LOW: 'w-1/3', MEDIUM: 'w-2/3', HIGH: 'w-full', UNKNOWN: 'w-0' }
  const colors = { LOW: 'bg-emerald-400', MEDIUM: 'bg-amber-400', HIGH: 'bg-red-400', UNKNOWN: 'bg-muted' }
  return (
    <div className="w-full h-1.5 rounded-full bg-muted/60">
      <div className={`h-full rounded-full transition-all duration-700 ${widths[level] || 'w-0'} ${colors[level] || 'bg-muted'}`} />
    </div>
  )
}

const AgentCard = ({ msg }: { msg: Message }) => {
  const r = msg.response!
  return (
    <div className="flex flex-col gap-4 bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles size={15} />
          </div>
          <span className="text-sm font-semibold text-foreground">Weather Intelligence</span>
        </div>
        <RiskBadge level={r.risk_level} />
      </div>

      {/* Risk bar */}
      <RiskBar level={r.risk_level} />

      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">{r.summary}</p>

      {/* Detail grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 border border-border p-3.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <TrendingUp size={10} /> Supply Chain Impact
          </p>
          <p className="text-sm text-foreground font-medium leading-snug">{r.impact}</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border p-3.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <CheckCircle size={10} /> Recommendation
          </p>
          <p className="text-sm text-foreground font-medium leading-snug">{r.recommendation}</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Powered by Gemini 2.5 Flash + OpenWeather
      </p>
    </div>
  )
}

export function WeatherAgentInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendQuery = async (query: string) => {
    if (!query.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: query, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/weather/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const json = await res.json()
      const data: AgentResponse = json.data

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: '',
        response: data,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, agentMsg])
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: '',
        response: {
          summary: 'Failed to connect to the Weather Intelligence backend.',
          risk_level: 'UNKNOWN',
          impact: 'Backend is unreachable',
          recommendation: 'Ensure the FastAPI server is running on port 8000.',
        },
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-0 py-4 space-y-5 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-16">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Cloud className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Ask the Weather Agent</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Query real-time weather intelligence to predict supply chain disruptions worldwide.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => sendQuery(q)}
                  className="text-left text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border rounded-xl px-4 py-3 transition-colors hover:text-foreground"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'user' ? (
              <div className="inline-block max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-medium shadow-sm">
                {msg.content}
              </div>
            ) : (
              <div className="w-full">
                <AgentCard msg={msg} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5 bg-card/60 backdrop-blur-sm border border-border rounded-2xl px-5 py-3.5 text-sm text-muted-foreground shadow-sm">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span>Analyzing weather intelligence...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendQuery(input)}
            placeholder='Ask: "Will rains delay shipments in Mumbai tomorrow?"'
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Powered by OpenWeather + Gemini 2.5 Flash · Supports cities worldwide
        </p>
      </div>
    </div>
  )
}
