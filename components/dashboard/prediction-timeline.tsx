'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { AlertTriangle, Clock, CheckCircle, Ship, MapPin, Zap, ChevronRight, ChevronDown } from 'lucide-react'

export function PredictionTimeline() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('prediction_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()

    // Realtime subscription
    const sub = supabase
      .channel('public:prediction_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prediction_logs' }, (payload: any) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  if (loading) return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-gray-100 border-2 border-black" />
      ))}
    </div>
  )

  if (logs.length === 0) return (
    <div className="py-12 text-center text-sm font-bold uppercase tracking-widest text-black border-2 border-dashed border-black bg-gray-50">
      No prediction logs found in Supabase.
    </div>
  )

  return (
    <div className="relative border-l-4 border-black ml-4 pl-6 space-y-6">
      {logs.map((log) => {
        const isExp = expanded === log.id
        const isReroute = log.recommendation === 'reroute'
        const isDelay = log.recommendation === 'delay'
        
        return (
          <div key={log.id} className="relative group">
            {/* Timeline Dot */}
            <div className={`absolute -left-[35px] top-4 w-4 h-4 rounded-none border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)] flex items-center justify-center ${
              isReroute ? 'bg-primary' : isDelay ? 'bg-orange-500' : 'bg-green-500'
            }`}>
            </div>

            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-gray-50 transition-none cursor-pointer"
                 onClick={() => setExpanded(isExp ? null : log.id)}>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Ship size={16} className="text-black stroke-[2.5]" />
                    <span className="font-black text-base text-black uppercase tracking-tighter">{log.route_id}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white px-2 py-0.5 border-2 border-black">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    <span className={`px-2 py-1 border-2 border-black uppercase tracking-widest font-black ${
                        isReroute ? 'bg-primary text-white border-primary' :
                        isDelay ? 'bg-orange-400 text-black' :
                        'bg-gray-200 text-black'
                      }`}>
                      {log.recommendation}
                    </span>
                    <span className="text-black">
                      Risk: <span className={log.risk_score > 60 ? 'text-primary' : log.risk_score > 30 ? 'text-orange-500' : 'text-green-600'}>{log.risk_score}</span>
                    </span>
                    <span className="text-black">
                      Conf: {log.confidence}%
                    </span>
                  </div>
                </div>

                <div className="shrink-0 bg-white border-2 border-black p-1">
                  {isExp ? <ChevronDown size={16} className="text-black stroke-[3]" /> : <ChevronRight size={16} className="text-black stroke-[3]" />}
                </div>
              </div>

              {/* Expanded JSON view */}
              {isExp && (
                <div className="mt-4 pt-4 border-t-2 border-black">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white bg-black border-2 border-black inline-block px-2 py-1 mb-2">AI Reasoning</div>
                  <div className="bg-white border-2 border-black p-3 text-xs font-bold font-mono text-black leading-relaxed overflow-x-auto shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    {log.reasoning}
                  </div>
                  
                  <div className="text-[10px] font-black uppercase tracking-widest text-white bg-black border-2 border-black inline-block px-2 py-1 mb-2 mt-4">Raw Agent Intel</div>
                  <div className="bg-white border-2 border-black p-3 text-xs font-bold font-mono text-black overflow-x-auto max-h-40 overflow-y-auto shadow-[2px_2px_0_rgba(0,0,0,1)] whitespace-pre">
                    {typeof log.raw_data === 'object' ? JSON.stringify(log.raw_data, null, 2) : log.raw_data}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
