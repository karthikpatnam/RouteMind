'use client'

import { useState, useEffect } from 'react'
import { AgentGrid } from '@/components/dashboard/agent-card'
import { agents as initialAgents, systemStatus } from '@/lib/mock-data'
import { Cpu, Server, Network, TerminalSquare, Activity, ShieldCheck } from 'lucide-react'
import { AgentPipelineViz } from '@/components/dashboard/agent-pipeline-viz'
import { cn } from '@/lib/utils'

// Sub-components for the Agents page

// 1. Live Terminal Feed
const TERMINAL_LOGS = [
  "[System] Initializing RouteMind AI Core...",
]

function LiveActivityFeed() {
  const [logs, setLogs] = useState<string[]>(TERMINAL_LOGS)

  useEffect(() => {
    // Connect to actual FastAPI Backend WebSockets
    const ws = new WebSocket("ws://localhost:8000/ws/agent-logs")
    
    ws.onopen = () => {
       console.log("Connected to Real Agent WebSockets")
    }
    
    ws.onmessage = (event) => {
       try {
           const data = JSON.parse(event.data)
           const newStr = `[${data.agent} Agent] ${data.msg}`
           setLogs((prev) => {
             const newLogs = [...prev, newStr]
             if (newLogs.length > 8) newLogs.shift()
             return newLogs
           })
       } catch (err) {
           console.log("Could not parse WS agent event", event.data)
       }
    }
    
    return () => {
      ws.close()
    }
  }, [])

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-5 font-mono text-xs overflow-hidden h-full flex flex-col relative shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border text-foreground font-semibold uppercase tracking-wider sticky top-0 bg-card/80 backdrop-blur z-10">
        <TerminalSquare className="h-5 w-5" />
        Agent Operations Log
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {logs.map((log, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start flex-col gap-1.5">
            <span className="text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full border border-border text-[10px] uppercase">
              {new Date().toISOString().split('T')[1].split('.')[0]}
            </span>
            <span className={cn(
              "px-2.5 py-1.5 border border-border font-medium tracking-wide text-[10px] shadow-sm leading-tight whitespace-pre-wrap word-break-normal inline-block max-w-full rounded-lg",
              log.includes('[Weather') ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' :
              log.includes('[Traffic') ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
              log.includes('[News') ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
              log.includes('[Routing') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-foreground'
            )}>
              {log}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-primary/80 border border-primary animate-pulse" />
    </div>
  )
}

// 2. Metrics Panel
function MetricsPanel() {
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-6 tracking-wide border-b border-border pb-3 text-foreground">
        <Activity className="h-5 w-5 text-primary" />
        API Latency & Health
      </h3>
      
      <div className="space-y-6 flex-1">
        <div>
          <h4 className="text-[10px] font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-3 uppercase tracking-wider inline-block">Models</h4>
          <div className="space-y-3">
            {systemStatus.aiModels.map(model => (
              <div key={model.name} className="flex items-center justify-between text-sm bg-muted/40 border border-border p-3 rounded-xl shadow-sm">
                <span className="font-medium text-foreground tracking-wide">{model.name}</span>
                <span className="text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider">{model.accuracy}% Acc</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h4 className="text-[10px] font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-3 uppercase tracking-wider inline-block">Data Streams</h4>
          <div className="space-y-3">
            {systemStatus.dataStreams.map(stream => (
              <div key={stream.name} className="flex items-center justify-between text-sm pb-3 border-b border-border last:border-0">
                <span className="font-medium text-foreground uppercase tracking-wider text-[11px]">{stream.name}</span>
                <div className="flex items-center gap-3">
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", stream.latency > 300 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}>
                    {stream.latency}ms
                  </span>
                  <span className={cn("h-2 w-2 rounded-full", stream.status === 'active' ? "bg-emerald-500" : "bg-orange-500")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [agents] = useState(initialAgents)

  return (
    <div className="flex flex-col gap-10 pb-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          Multi-Agent Architecture
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Real-time diagnostics and performance metrics for the predictive node network.
        </p>
      </div>

      {/* Top Grid */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">Active Logic Nodes</h2>
        <AgentGrid agents={agents} />
      </section>

      {/* Lower Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(450px,max-content)]">
        
        {/* Left: Terminal */}
        <div className="lg:col-span-1 h-full">
          <LiveActivityFeed />
        </div>

        {/* Middle: Map */}
        <div className="lg:col-span-1 h-full">
          <AgentPipelineViz />
        </div>

        {/* Right: Metrics */}
        <div className="lg:col-span-1 h-full">
          <MetricsPanel />
        </div>

      </section>

    </div>
  )
}

