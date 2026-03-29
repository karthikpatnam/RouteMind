'use client'

import { useState } from 'react'
import { Settings, Server, Database, Save, Key, Bell, Shield, Activity, Zap } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api')
  const [keys, setKeys] = useState({ mapbox: 'pk.eyJ1...', gemini: 'AIzaSy...', supabase: 'ey...' })
  const [thresholds, setThresholds] = useState({ risk: 70, confidence: 85 })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <Settings className="h-8 w-8 text-primary" />
            System Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Manage API integrations, thresholds, and routing parameters.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold tracking-wide rounded-full hover:bg-primary/90 transition-all shadow-sm">
          {saved ? <Shield size={18} /> : <Save size={18} />}
          {saved ? 'Securely Saved' : 'Save Changes'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="flex flex-col gap-2 bg-card/50 backdrop-blur-sm border border-border p-3 shadow-sm rounded-xl">
          {[
            { id: 'api', label: 'API Integrations', icon: Key },
            { id: 'thresholds', label: 'Risk Thresholds', icon: Activity },
            { id: 'notifications', label: 'Alerting Rules', icon: Bell },
            { id: 'engine', label: 'Routing Engine', icon: Zap },
          ].map(t => (
             <button key={t.id} onClick={() => setActiveTab(t.id)}
               className={`w-full text-left px-4 py-2.5 text-sm font-medium tracking-wide flex items-center gap-3 transition-all rounded-lg ${
                 activeTab === t.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
               }`}
             >
               <t.icon size={18} /> {t.label}
             </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-card/50 backdrop-blur-sm border border-border p-8 min-h-[500px] shadow-sm rounded-xl">
          
          {activeTab === 'api' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight mb-1 text-foreground">API Connections</h2>
                <p className="text-sm text-muted-foreground">Connect external services for the intelligence pipeline.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-3 tracking-wider inline-block">Mapbox Access Token</label>
                  <input value={keys.mapbox} onChange={e=>setKeys({...keys, mapbox: e.target.value})} type="password" 
                     className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-muted outline-none transition-colors font-mono font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-3 tracking-wider inline-block">Gemini AI Key</label>
                  <input value={keys.gemini} onChange={e=>setKeys({...keys, gemini: e.target.value})} type="password" 
                     className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-muted outline-none transition-colors font-mono font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-3 tracking-wider inline-block">Supabase Project Key</label>
                  <input value={keys.supabase} onChange={e=>setKeys({...keys, supabase: e.target.value})} type="password" 
                     className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:bg-muted outline-none transition-colors font-mono font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'thresholds' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="border-b border-border pb-4">
               <h2 className="text-2xl font-bold tracking-tight mb-1 text-foreground">Global AI Thresholds</h2>
               <p className="text-sm text-muted-foreground">Tune the sensitivity of the Gemini Decision Engine.</p>
             </div>

             <div className="space-y-6">
               <div className="bg-muted/40 border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                    <label className="text-sm font-semibold tracking-wide text-foreground">Reroute Risk Threshold</label>
                    <span className="font-mono text-primary font-bold text-lg bg-primary/10 px-3 py-0.5 border border-primary/20 rounded-full shadow-sm">{thresholds.risk} / 100</span>
                  </div>
                  <input type="range" min="0" max="100" value={thresholds.risk} onChange={e=>setThresholds({...thresholds, risk: parseInt(e.target.value)})} 
                     className="w-full h-2 bg-muted rounded-full appearance-none outline-none cursor-pointer" style={{ accentColor: 'var(--primary)' }} />
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed px-1">Any route calculation exceeding this risk score will automatically force a route deviation request.</p>
               </div>
               
               <div className="bg-muted/40 border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                    <label className="text-sm font-semibold tracking-wide text-foreground">Minimum Confidence Filter</label>
                    <span className="font-mono text-foreground font-bold text-lg bg-background px-3 py-0.5 border border-border rounded-full shadow-sm">{thresholds.confidence}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={thresholds.confidence} onChange={e=>setThresholds({...thresholds, confidence: parseInt(e.target.value)})} 
                     className="w-full h-2 bg-muted rounded-full appearance-none outline-none cursor-pointer" style={{ accentColor: 'var(--foreground)' }} />
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed px-1">Ignore AI recommendations with a confidence level lower than this value.</p>
               </div>
             </div>
           </div>
          )}
          
          {(activeTab !== 'api' && activeTab !== 'thresholds') && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-20">
              <Settings className="w-16 h-16 mb-4 animate-spin-slow opacity-20 stroke-[1.5]" />
              <p className="text-xs font-semibold tracking-wider bg-muted text-muted-foreground px-4 py-2 border border-border rounded-full shadow-sm mt-4">This module is under construction.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
