'use client'

import { useState, useMemo } from 'react'
import { routes as initialRoutes, type Route } from '@/lib/mock-data'
import {
  Ship, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Search, Download, Filter, Zap, MapPin, Package
} from 'lucide-react'

function statusColor(s: string) {
  return s === 'critical' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-full'
    : s === 'warning' ? 'text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-full'
    : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full'
}

function riskBar(score: number) {
  const colorClass = score > 70 ? 'bg-rose-500' : score > 40 ? 'bg-orange-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted overflow-hidden relative rounded-full">
        <div className={`h-full ${colorClass} transition-all rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono font-medium w-6 text-right text-muted-foreground">{score}</span>
    </div>
  )
}

export default function FleetPage() {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof Route>('riskScore')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const sorted = useMemo(() => {
    let list = routes.filter(r => {
      const q = search.toLowerCase()
      const match = r.vessel.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||r.cargo.toLowerCase().includes(q)||r.origin.name.toLowerCase().includes(q)||r.destination.name.toLowerCase().includes(q)
      return match && (statusFilter === 'all' || r.status === statusFilter)
    })
    list = [...list].sort((a,b) => {
      const av = a[sortKey] as number|string, bv = b[sortKey] as number|string
      if (typeof av === 'number' && typeof bv === 'number') return sortDir==='asc'?av-bv:bv-av
      return sortDir==='asc'?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av))
    })
    return list
  }, [routes, search, sortKey, sortDir, statusFilter])

  const sort = (key: keyof Route) => {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const exportCSV = () => {
    const headers = ['Vessel','Route','Origin','Destination','Cargo','Status','Risk','ETA']
    const rows = sorted.map(r => [r.vessel,r.name,r.origin.name,r.destination.name,r.cargo,r.status,r.riskScore,r.eta])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = 'fleet-export.csv'; a.click()
  }

  const SortIcon = ({ k }: { k: keyof Route }) =>
    sortKey === k ? (sortDir==='asc'?<ChevronUp size={14} />:<ChevronDown size={14} />)
    : <ChevronDown size={14} className="opacity-20" />

  const kpis = [
    {label:'Total Vessels', value:routes.length, icon:<Ship size={20} />, color:'bg-muted/50 text-foreground border border-border'},
    {label:'Critical', value:routes.filter(r=>r.status==='critical').length, icon:<AlertTriangle size={20} />, color:'bg-rose-500/10 text-rose-500 border border-rose-500/20'},
    {label:'Warning', value:routes.filter(r=>r.status==='warning').length, icon:<Clock size={20} />, color:'bg-orange-500/10 text-orange-500 border border-orange-500/20'},
    {label:'Normal', value:routes.filter(r=>r.status==='normal').length, icon:<CheckCircle size={20} />, color:'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'},
  ]

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Ship className="h-8 w-8 text-primary"/> Fleet Management
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Track and manage all active vessels in real-time</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold tracking-wide rounded-full hover:bg-primary/90 transition-all shadow-sm">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k,i)=>(
          <div key={i} className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`${k.color} rounded-xl p-3 shadow-sm`}>{k.icon}</div>
            <div>
              <div className="text-3xl font-bold text-foreground leading-none">{k.value}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-64">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search vessel, route, cargo…"
            className="w-full h-10 pl-11 pr-4 bg-muted/50 border border-border rounded-full text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"/>
        </div>
        <div className="flex items-center gap-3 border-l border-border pl-4">
          <Filter size={18} className="text-muted-foreground"/>
          {['all','normal','warning','critical'].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium uppercase transition-all border ${statusFilter===s?'bg-primary text-primary-foreground border-primary shadow-sm':'bg-muted/50 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                {[
                  {label:'Vessel', key:'vessel'},{label:'Route', key:'name'},
                  {label:'Origin → Dest', key:null},{label:'Cargo', key:'cargo'},
                  {label:'Status', key:'status'},{label:'Risk', key:'riskScore'},
                  {label:'ETA', key:'eta'},{label:'', key:null},
                ].map((h,i)=>(
                  <th key={i} onClick={()=>h.key&&sort(h.key as keyof Route)}
                    className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${h.key?'cursor-pointer hover:text-foreground':''} transition-colors`}>
                    <span className="flex items-center gap-2">
                      {h.label}
                      {h.key&&<SortIcon k={h.key as keyof Route}/>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((route,i)=>(
                <tr key={route.id} className="border-b border-border hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm flex items-center justify-center shrink-0">
                        <Ship size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground tracking-tight">{route.vessel}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">IMO-{10000+i}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-foreground tracking-wide">{route.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      <MapPin size={12} className="text-primary shrink-0 mb-0.5"/>
                      <span className="text-foreground">{route.origin.name}</span>
                      <span className="text-muted-foreground/50 px-1">→</span>
                      <span className="text-foreground">{route.destination.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground tracking-wide">
                      <Package size={14} className="text-muted-foreground shrink-0"/>{route.cargo}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 uppercase tracking-wider ${statusColor(route.status)}`}>
                      {route.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 min-w-[140px]">{riskBar(route.riskScore)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground tracking-wide">
                      <Clock size={14} className="text-muted-foreground mb-0.5"/>{route.eta}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground text-xs font-medium rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-default relative shadow-sm">
                      <Zap size={14} /> Analyse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-muted/30 flex items-center justify-between border-t border-border">
          <span className="text-xs font-medium uppercase tracking-wider text-foreground">{sorted.length} of {routes.length} vessels visible</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live feed active</span>
        </div>
      </div>
    </div>
  )
}
