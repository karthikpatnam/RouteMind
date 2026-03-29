'use client'

import { useState } from 'react'
import { CloudLightning, Swords, TrafficCone, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimulationControlsProps {
  onTriggerEvent?: (event: 'storm' | 'conflict' | 'traffic') => void
  onReset?: () => void
}

export function SimulationControls({ onTriggerEvent, onReset }: SimulationControlsProps) {
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const handleTrigger = (event: 'storm' | 'conflict' | 'traffic') => {
    setActiveSimulation(event)
    setIsAnimating(true)
    if (onTriggerEvent) onTriggerEvent(event)
    
    setTimeout(() => {
      setIsAnimating(false)
    }, 2000)
  }
  
  const handleReset = () => {
    setActiveSimulation(null)
    if (onReset) onReset()
  }
  
  const simulations = [
    {
      id: 'storm',
      label: 'STORM',
      icon: CloudLightning,
      activeBg: 'bg-primary text-white border-primary',
      idleBg: 'bg-white text-black border-black',
    },
    {
      id: 'conflict',
      label: 'CONFLICT',
      icon: Swords,
      activeBg: 'bg-black text-white border-black',
      idleBg: 'bg-white text-black border-black',
    },
    {
      id: 'traffic',
      label: 'CONGESTION',
      icon: TrafficCone,
      activeBg: 'bg-black text-white border-black',
      idleBg: 'bg-white text-black border-black',
    },
  ]
  
  return (
    <div className="flex flex-col h-full bg-white border border-black font-sans">
      <div className="flex items-center justify-between p-4 border-b border-black">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-2">
            <Play className="h-4 w-4 fill-current stroke-[2]" />
          </div>
          <div>
            <h3 className="font-bold text-black uppercase tracking-widest text-sm leading-none">Scenario Simulator</h3>
            <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mt-1">
              Trigger Disturbance Events
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-black text-black hover:bg-black hover:text-white font-bold uppercase tracking-widest text-[10px] transition-none"
        >
          <RotateCcw className="h-3 w-3 stroke-[3]" />
          RESET
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          {simulations.map((sim) => {
            const isActive = activeSimulation === sim.id
            return (
              <button
                key={sim.id}
                onClick={() => handleTrigger(sim.id as 'storm' | 'conflict' | 'traffic')}
                disabled={isAnimating}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-4 border transition-none outline-none',
                  isActive ? sim.activeBg : `${sim.idleBg} hover:bg-black/5`
                )}
              >
                <sim.icon className="h-6 w-6 stroke-[2]" />
                <span className="text-[10px] font-bold tracking-widest leading-none">
                  {sim.label}
                </span>
                {isActive && (
                  <div className="mt-2 h-1 w-full bg-white/30" />
                )}
              </button>
            )
          })}
        </div>
        
        {activeSimulation && (
          <div className="p-4 bg-black text-white flex items-center gap-3">
            <div className="h-2 w-2 bg-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Gemini AI Routing recalculating...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
