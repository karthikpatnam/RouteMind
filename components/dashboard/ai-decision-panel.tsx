'use client'

import { Brain, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIDecisionPanelProps {
  riskScore: number
  confidence: number
  recommendation: 'continue' | 'reroute' | 'delay'
  alternativeRoute?: {
    timeSaved: number
    costReduction: number
    riskReduction: number
  }
}

export function AIDecisionPanel({ 
  riskScore, 
  confidence, 
  recommendation, 
  alternativeRoute 
}: AIDecisionPanelProps) {
  const getRecommendationStyle = () => {
    switch (recommendation) {
      case 'reroute':
        return {
          bg: 'bg-black text-white',
          icon: TrendingUp,
          label: 'REROUTE RECOMMENDED',
        }
      case 'delay':
        return {
          bg: 'bg-primary text-white',
          icon: AlertTriangle,
          label: 'DELAY ADVISORY',
        }
      default:
        return {
          bg: 'bg-white text-black border border-black',
          icon: CheckCircle,
          label: 'CONTINUE ROUTE',
        }
    }
  }
  
  const style = getRecommendationStyle()
  const RecommendationIcon = style.icon
  
  return (
    <div className="flex flex-col bg-white border-b border-black font-sans">
      <div className="flex items-center gap-3 p-6 border-b border-black">
        <div className="w-8 h-8 flex items-center justify-center bg-black text-white">
          <Brain className="h-4 w-4 stroke-[2]" />
        </div>
        <div>
          <h3 className="font-bold text-black uppercase tracking-widest text-sm leading-none">Decision Engine</h3>
          <p className="text-[10px] font-bold text-black/50 uppercase tracking-widest mt-1">Live AI Analysis</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
        {/* Risk Score */}
        <div className="p-6 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-2">Calculated Risk</div>
          <div className={cn(
            "text-6xl font-black tracking-tighter leading-none",
            riskScore >= 70 ? "text-primary" : "text-black"
          )}>
            {riskScore}
          </div>
        </div>
        
        {/* Confidence & Action */}
        <div className="p-6 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-black/50 uppercase tracking-widest">Confidence</span>
              <span className="text-sm font-bold">{confidence}%</span>
            </div>
            <div className="h-1 w-full bg-black/10 overflow-hidden">
              <div 
                className="h-full bg-black transition-none" 
                style={{ width: `${confidence}%` }} 
              />
            </div>
          </div>
          
          <div className={cn('p-4 flex items-center gap-3 transition-none', style.bg)}>
            <RecommendationIcon className="h-5 w-5 stroke-[2] shrink-0" />
            <div>
              <div className="font-bold text-xs uppercase tracking-widest leading-none">{style.label}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alternative route comparison */}
      {recommendation === 'reroute' && alternativeRoute && (
        <div className="p-6 bg-black/5">
          <h4 className="text-[10px] font-bold text-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <ArrowRight className="h-3 w-3 stroke-[3]" />
            Route Comparison
          </h4>
          
          <table className="w-full text-left font-bold uppercase tracking-widest text-[10px] border-collapse border border-black bg-white">
            <thead className="bg-black text-white">
              <tr>
                <th className="py-2 px-3 border-r border-black/20">Metric</th>
                <th className="py-2 px-3 border-r border-black/20">Current</th>
                <th className="py-2 px-3 text-primary">Projection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/20">
              <tr>
                <td className="py-2.5 px-3 border-r border-black/20">ETA</td>
                <td className="py-2.5 px-3 border-r border-black/20 text-black/50">14D 6H</td>
                <td className="py-2.5 px-3 flex items-center justify-between">
                  12D 2H <span className="bg-black text-white px-1 py-0.5 leading-none">-{alternativeRoute.timeSaved}H</span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 border-r border-black/20">Risk Factor</td>
                <td className="py-2.5 px-3 border-r border-black/20 text-primary">HIGH (82)</td>
                <td className="py-2.5 px-3 flex items-center justify-between">
                  LOW (12) <span className="bg-black text-white px-1 py-0.5 leading-none">-{alternativeRoute.riskReduction}%</span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 border-r border-black/20">Est. Fuel</td>
                <td className="py-2.5 px-3 border-r border-black/20 text-black/50">$142K</td>
                <td className="py-2.5 px-3 flex items-center justify-between">
                  $128K <span className="bg-black text-white px-1 py-0.5 leading-none">-{alternativeRoute.costReduction}%</span>
                </td>
              </tr>
            </tbody>
          </table>
          
          <button className="w-full mt-4 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-none">
            Execute Reroute
          </button>
        </div>
      )}
    </div>
  )
}
