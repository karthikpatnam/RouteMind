'use client'

import { useState, useEffect } from 'react'
import { Server, Cpu, ShieldCheck, Database, RefreshCcw, Network } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AgentPipelineViz() {
  const [activeNode, setActiveNode] = useState<number>(0)
  
  // Simulate active node walking through the pipeline
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNode(v => (v + 1) % 4)
    }, 2000)
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="bg-card/50 backdrop-blur-md rounded-xl border border-border p-6 shadow-sm overflow-hidden relative flex flex-col h-full pointer-events-none">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-8 text-foreground border-b border-border pb-3 shrink-0">
        <Network className="h-5 w-5 text-primary" />
        Neural Decision Pipeline
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative">
        
        {/* Layer 1: Data Ingestion */}
        <div className="flex justify-between w-full relative z-10 px-8 lg:px-12">
          <Node icon={Server} label="Weather" color="blue" active={activeNode === 0 || activeNode === 1} />
          <Node icon={Database} label="Intelligence" color="indigo" active={activeNode === 0 || activeNode === 1} />
          <Node icon={RefreshCcw} label="Traffic" color="amber" active={activeNode === 0 || activeNode === 1} />
        </div>

        {/* Dynamic connecting lines to Gemini */}
        <div className="h-24 w-full relative -my-4 pointer-events-none z-0">
           <svg width="100%" height="100%" preserveAspectRatio="none" className="absolute inset-0">
             {/* Weather to Core */}
             <path d="M 20% 0 C 20% 50, 50% 50, 50% 100" fill="none" strokeWidth={3}
               className={cn("transition-all duration-500 stroke-muted-foreground", activeNode === 1 ? "stroke-dasharray-anim opacity-60" : "opacity-20")} 
               strokeDasharray="6 6" />
             {/* Intel to Core */}
             <path d="M 50% 0 L 50% 100" fill="none" strokeWidth={3}
               className={cn("transition-all duration-500 stroke-muted-foreground", activeNode === 1 ? "stroke-dasharray-anim opacity-60" : "opacity-20")} 
               strokeDasharray="6 6" />
             {/* Traffic to Core */}
             <path d="M 80% 0 C 80% 50, 50% 50, 50% 100" fill="none" strokeWidth={3}
               className={cn("transition-all duration-500 stroke-muted-foreground", activeNode === 1 ? "stroke-dasharray-anim opacity-60" : "opacity-20")} 
               strokeDasharray="6 6" />
           </svg>
        </div>

        {/* Layer 2: Gemini AI Engine */}
        <div className="relative z-10 flex flex-col items-center">
          <div className={cn(
            "h-20 w-20 rounded-xl border-2 flex items-center justify-center transition-all duration-500 bg-card",
            activeNode === 2 
              ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-110" 
              : "border-border shadow-sm"
          )}>
            <Cpu className={cn("h-8 w-8 transition-colors duration-500", activeNode === 2 ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="mt-4 text-center px-4 py-2 rounded-xl bg-muted/40 border border-border">
            <div className="text-sm font-semibold text-foreground tracking-tight">Gemini Routing Core</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Risk Analysis</div>
          </div>
        </div>
        
        {/* Connection to Output */}
        <div className="h-16 w-full relative -my-2 pointer-events-none z-0 flex justify-center">
           <svg width="4" height="100%" className="overflow-visible">
             <path d="M 2 0 L 2 100" fill="none" strokeWidth={3} 
                className={cn("stroke-primary transition-all", activeNode === 3 ? "stroke-dasharray-anim opacity-80" : "opacity-20")}
                strokeDasharray="6 6" />
             
             {activeNode === 3 && (
               <circle cx="2" cy="50" r="5" className="fill-background stroke-primary stroke-[3px]" />
             )}
           </svg>
        </div>

        {/* Layer 3: Supabase & UI */}
        <div className={cn(
          "px-6 py-3 rounded-xl border flex items-center justify-center gap-3 z-10 transition-all duration-500",
          activeNode === 3 ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-muted/40 shadow-sm"
        )}>
          <ShieldCheck className={cn("h-5 w-5", activeNode === 3 ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-xs font-semibold tracking-wide", activeNode === 3 ? "text-primary" : "text-muted-foreground")}>
            Live Intelligence
          </span>
        </div>

      </div>

      <style jsx global>{`
        @keyframes stroke-dasharray-anim {
          from { stroke-dashoffset: 60; }
          to { stroke-dashoffset: 0; }
        }
        .stroke-dasharray-anim {
          animation: stroke-dasharray-anim 1.5s linear infinite;
        }
      `}</style>
    </div>
  )
}

function Node({ icon: Icon, label, color, active }: { icon: any, label: string, color: string, active: boolean }) {
  const colors = {
    blue: 'bg-cyan-500 border-cyan-500/50',
    indigo: 'bg-indigo-500 border-indigo-500/50',
    amber: 'bg-orange-500 border-orange-500/50',
  }[color]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500",
        active ? `${colors} bg-opacity-10 border shadow-sm scale-110` : "bg-muted/40 border border-border shadow-sm"
      )}>
        <Icon className={cn("h-5 w-5 transition-all text-muted-foreground", active && `text-${color}-500`)} />
      </div>
      <span className={cn(
        "text-[10px] font-medium transition-all px-2.5 py-0.5 rounded-full",
        active ? "text-foreground bg-muted" : "text-muted-foreground"
      )}>{label}</span>
    </div>
  )
}
