'use client'

import { BellRing, ShieldAlert, Cpu } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">System Alerts</h1>
          <p className="text-sm text-muted-foreground mt-2">Global maritime risk notifications and AI advisories</p>
        </div>
      </div>
      
      <div className="flex-1 border border-border bg-card/50 backdrop-blur-sm rounded-xl relative overflow-hidden flex items-center justify-center p-6 shadow-sm">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl bg-card border border-border rounded-xl p-12 shadow-sm">
          <div className="w-20 h-20 mb-8 bg-primary/10 flex items-center justify-center rounded-2xl border border-primary/20 shadow-sm">
            <BellRing className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight text-foreground">Alerts Module Offline</h2>
          <p className="text-muted-foreground mb-10 text-base leading-relaxed border-t border-border pt-6">
            The dedicated alerts and notifications center is currently undergoing system upgrades. Real-time risks and AI notifications are still available through the primary dashboard interface.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-muted/50 border border-border text-sm font-medium text-foreground rounded-full shadow-sm hover:bg-muted transition-all cursor-default">
              <ShieldAlert className="w-5 h-5 text-emerald-500" />
              Monitoring Active
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-muted/50 border border-border text-sm font-medium text-foreground rounded-full shadow-sm hover:bg-muted transition-all cursor-default">
              <Cpu className="w-5 h-5 text-primary" />
              AI Sentinels Active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

