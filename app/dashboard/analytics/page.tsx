'use client'

import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts'
import { analyticsData } from '@/lib/mock-data'
import { TrendingUp, TrendingDown, DollarSign, Clock, Shield, Zap, Search, Activity, Network } from 'lucide-react'
import { PredictionTimeline } from '@/components/dashboard/prediction-timeline'
import { useState, useEffect } from 'react'

function KPICard({ 
  title, 
  value, 
  change, 
  trend,
  icon: Icon,
  color
}: { 
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down'
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 border-2 border-black ${color}`}>
          <Icon className="h-6 w-6 stroke-[2.5]" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 border-2 border-black ${
            trend === 'up' ? 'text-black bg-gray-100' : 'text-white bg-primary'
          } uppercase tracking-widest`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4 stroke-[3]" /> : <TrendingDown className="h-4 w-4 stroke-[3]" />}
            {change}
          </div>
        )}
      </div>
      <div>
        <div className="text-4xl font-black tracking-tighter text-black mb-1">{value}</div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white text-black border-2 border-black p-3 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <p className="text-xs font-black uppercase tracking-widest mb-2 border-b-2 border-black pb-2">{label}</p>
        <div className="space-y-2 mt-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs font-bold">
              <span className="w-3 h-3 border-2 border-black" style={{ backgroundColor: entry.color }} />
              <span className="uppercase tracking-widest">{entry.name}:</span>
              <span>{typeof entry.value === 'number' && entry.name.includes('%') ? `${entry.value}%` : entry.name.includes('Cost') || entry.name.includes('Savings') ? `$${entry.value / 1000}k` : entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const { costSavings, routeEfficiency, kpis } = analyticsData
  const [accuracyData, setAccuracyData] = useState<any[]>([])
  
  useEffect(() => {
    fetch('http://localhost:8000/api/analytics/historical-accuracy')
      .then(r => r.json())
      .then(data => {
        if (data.accuracy_history) setAccuracyData(data.accuracy_history)
      })
      .catch(console.error)
  }, [])
  
  return (
    <div className="space-y-8 text-black pb-12">
      {/* Page header */}
      <div className="border-b-2 border-black pb-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-black uppercase mb-1">Analytics</h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Performance metrics / AI prediction accuracy
        </p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Shipments Opt."
          value={kpis.totalShipmentsOptimized.toLocaleString()}
          change="+12%"
          trend="up"
          icon={Zap}
          color="bg-black text-white"
        />
        <KPICard
          title="Avg Delay Red."
          value={`${kpis.averageDelayReduction}%`}
          change="+5%"
          trend="up"
          icon={Clock}
          color="bg-white text-black"
        />
        <KPICard
          title="Risk Avoided"
          value={kpis.riskIncidentsAvoided}
          change="+8%"
          trend="up"
          icon={Shield}
          color="bg-black text-white"
        />
        <KPICard
          title="Cost Saved"
          value={`$${(kpis.totalCostSaved / 1000000).toFixed(1)}M`}
          change="+15%"
          trend="up"
          icon={DollarSign}
          color="bg-primary text-white border-primary"
        />
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delay Predictions Chart */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-1">Delay Accuracy</h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b-2 border-black pb-4">
            Predicted vs Actual delays (hours)
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                  dy={10}
                />
                <YAxis 
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }} />
                <Line 
                  type="step" 
                  dataKey="predicted" 
                  stroke="#000" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#000' }}
                  name="Predicted"
                />
                <Line 
                  type="step" 
                  dataKey="actual" 
                  stroke="#e60000" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#e60000' }}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Cost Savings Chart */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-1">Monthly Savings</h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b-2 border-black pb-4">
            Savings from AI-optimized routing
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costSavings} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#000" strokeWidth="2" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="month" 
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                  dy={10}
                />
                <YAxis 
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="step"
                  dataKey="savings"
                  stroke="#000"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#diagonalHatch)"
                  name="Savings"
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#000' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Route Efficiency Chart */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] lg:col-span-2">
          <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-1">Route Efficiency</h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b-2 border-black pb-4">
            Performance by route corridor
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeEfficiency} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#000" strokeOpacity={0.2} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="route" 
                  stroke="#000"
                  tick={{ fill: '#000', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                  axisLine={{ strokeWidth: 2 }}
                  tickLine={{ strokeWidth: 2 }}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar 
                  dataKey="efficiency" 
                  fill="#000"
                  radius={0}
                  name="Efficiency %"
                  barSize={32}
                  stroke="#000"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Prediction Timeline vs System Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supabase Realtime Timeline */}
        <div className="lg:col-span-2 bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black shrink-0">
            <div>
              <h3 className="text-xl font-black text-black uppercase tracking-tighter flex items-center gap-2">
                <Activity size={20} className="text-primary stroke-[3]" />
                Live Decisions
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                Real-time stream
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 border-2 border-black bg-white text-black text-xs font-bold uppercase tracking-widest">
              <div className="w-2 h-2 bg-primary animate-pulse" />
              LIVE
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar-swiss">
            <PredictionTimeline />
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0_rgba(0,0,0,1)] h-[600px] flex flex-col">
          <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-6 pb-4 border-b-2 border-black">Model Performance</h3>
          <div className="flex flex-col gap-6 flex-1">
            <div className="space-y-3 p-4 border-2 border-black bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-widest text-black">Risk Predict. v3.2</span>
                <span className="text-sm font-black text-black">94.2%</span>
              </div>
              <div className="h-4 bg-white border-2 border-black overflow-hidden p-0.5">
                <div className="h-full bg-black" style={{ width: '94.2%' }} />
              </div>
            </div>
            <div className="space-y-3 p-4 border-2 border-black bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-widest text-black">Route Optim.</span>
                <span className="text-sm font-black text-black">91.8%</span>
              </div>
              <div className="h-4 bg-white border-2 border-black overflow-hidden p-0.5">
                <div className="h-full bg-black" style={{ width: '91.8%' }} />
              </div>
            </div>
            <div className="space-y-3 p-4 border-2 border-black bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-widest text-black">Disrupt. Detector</span>
                <span className="text-sm font-black text-black">89.5%</span>
              </div>
              <div className="h-4 bg-white border-2 border-black overflow-hidden p-0.5">
                <div className="h-full bg-primary" style={{ width: '89.5%' }} />
              </div>
            </div>
            <div className="mt-auto pt-6 border-t-2 border-black">
              <p className="text-[10px] font-bold uppercase tracking-widest text-center text-gray-500">Models trained on 2M+ routes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
