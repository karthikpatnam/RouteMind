'use client'

import { Cloud, Swords, TrafficCone, Anchor, AlertTriangle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type Alert } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface AlertFeedProps {
  alerts: Alert[]
  className?: string
}

const alertIcons = {
  weather: Cloud,
  conflict: Swords,
  traffic: TrafficCone,
  port: Anchor,
}

const severityStyles = {
  critical: {
    badge: 'bg-primary text-white',
    iconBg: 'bg-black text-white',
    border: 'border-l-4 border-l-primary',
  },
  high: {
    badge: 'bg-black text-white',
    iconBg: 'bg-white text-black border border-black',
    border: 'border-l-4 border-l-black',
  },
  medium: {
    badge: 'border border-black text-black',
    iconBg: 'bg-white text-black border border-black',
    border: '',
  },
  low: {
    badge: 'text-black',
    iconBg: 'bg-white text-black border border-transparent',
    border: '',
  },
}

function AlertCard({ alert }: { alert: Alert }) {
  const Icon = alertIcons[alert.type]
  const styles = severityStyles[alert.severity]
  
  return (
    <div className={cn(
      'p-5 border-b border-black transition-none hover:bg-black/5 bg-white',
      styles.border
    )}>
      <div className="flex items-start gap-4">
        <div className={cn('p-3 flex items-center justify-center shrink-0 w-12 h-12', styles.iconBg)}>
          <Icon className="h-5 w-5 stroke-[2]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-bold text-sm truncate text-black uppercase tracking-widest leading-tight">{alert.title}</h4>
            <span className={cn(
              'px-2 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0 leading-none',
              styles.badge
            )}>
              {alert.severity}
            </span>
          </div>
          
          <p className="text-xs font-bold text-black/50 uppercase tracking-widest mb-3">{alert.region}</p>
          
          <p className="text-sm text-black leading-relaxed font-medium mb-4">
            {alert.description}
          </p>
          
          <div className="flex items-center justify-between pt-3 border-t border-black/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
              {alert.timestamp}
            </span>
            {alert.affectedRoutes.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 border border-black px-2 py-1">
                {alert.affectedRoutes.length} ROUTE{alert.affectedRoutes.length > 1 ? 'S' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertFeed({ alerts, className }: AlertFeedProps) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
  
  return (
    <div className={cn('bg-white flex flex-col h-full font-sans', className)}>
      <div className="flex items-center justify-between p-6 border-b border-black bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center bg-black text-white">
            <AlertTriangle className="h-4 w-4 stroke-[2]" />
          </div>
          <h3 className="font-bold text-lg text-black tracking-tighter uppercase">Risk Monitor</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 bg-black text-white uppercase tracking-widest">
          {alerts.length} ACTIVE
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {sortedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
