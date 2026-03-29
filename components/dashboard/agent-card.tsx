'use client'

import { Cloud, Newspaper, TrafficCone, Route, Loader2 } from 'lucide-react'
import { type Agent } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
}

const agentIcons = {
  weather: Cloud,
  news: Newspaper,
  traffic: TrafficCone,
  routing: Route,
}

const agentColors = {
  weather: {
    iconBg: 'bg-black text-white',
    progress: 'bg-black'
  },
  news: {
    iconBg: 'bg-black text-white',
    progress: 'bg-black'
  },
  traffic: {
    iconBg: 'bg-black text-white',
    progress: 'bg-black'
  },
  routing: {
    iconBg: 'bg-primary text-white',
    progress: 'bg-primary'
  },
}

export function AgentCard({ agent }: AgentCardProps) {
  const Icon = agentIcons[agent.type]
  const colors = agentColors[agent.type]
  
  const getStatusLabel = () => {
    switch (agent.status) {
      case 'active': return 'ACTIVE'
      case 'processing': return 'PROCESSING'
      default: return 'IDLE'
    }
  }
  
  return (
    <div className={cn(
      'bg-white border text-black font-sans',
      agent.status === 'active' ? 'border-primary' : 'border-black'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black">
        <div className="flex items-center gap-3">
          <div className={cn('p-2', colors.iconBg)}>
            <Icon className="h-4 w-4 stroke-[2]" />
          </div>
          <h4 className="font-bold text-sm uppercase tracking-widest leading-none">{agent.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-black text-white">
          {agent.status === 'processing' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={cn(
              'h-2 w-2 bg-white'
            )} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {getStatusLabel()}
          </span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        {/* Timestamp */}
        <div className="flex items-center justify-between pb-4 border-b border-black/10">
          <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Last Sync</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">{agent.lastUpdate}</span>
        </div>
        
        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-2">
            <span className="font-bold text-black/50">Confidence</span>
            <span className="font-bold text-sm">{agent.confidence}%</span>
          </div>
          <div className="h-1 w-full bg-black/10">
            <div 
              className={cn("h-full transition-none", colors.progress)} 
              style={{ width: `${agent.confidence}%` }}
            />
          </div>
        </div>
        
        {/* Contribution */}
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest pt-4 border-t border-black/10">
          <span className="font-bold text-black/50">Weight</span>
          <span className="font-bold text-sm">{agent.contribution}%</span>
        </div>
      </div>
    </div>
  )
}

interface AgentGridProps {
  agents: Agent[]
  className?: string
}

export function AgentGrid({ agents, className }: AgentGridProps) {
  return (
    <div className={cn("grid gap-4 bg-white", className || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

