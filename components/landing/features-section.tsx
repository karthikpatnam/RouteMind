'use client'

import { 
  Globe, 
  AlertTriangle, 
  Brain, 
  Cpu, 
  TrendingUp, 
  Shield,
  Zap,
  BarChart3
} from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Global Tracking',
    description: 'Monitor every shipment across all major trade routes with live position updates.',
  },
  {
    icon: AlertTriangle,
    title: 'Disruption Detection',
    description: 'AI-powered detection of weather events and supply chain anomalies.',
  },
  {
    icon: Brain,
    title: 'Predictive Analytics',
    description: 'Models predict delays and risks up to 14 days in advance with 94% accuracy.',
  },
  {
    icon: Cpu,
    title: 'Multi-Agent AI',
    description: 'Four specialized AI agents work together for comprehensive analysis.',
  },
  {
    icon: TrendingUp,
    title: 'Route Optimization',
    description: 'Automatically calculate optimal alternative routes when disruptions occur.',
  },
  {
    icon: Shield,
    title: 'Risk Mitigation',
    description: 'Proactive risk scoring and automated recommendations prevent disruptions.',
  },
]

const stats = [
  { value: '2,847', label: 'Shipments', icon: Zap },
  { value: '34%', label: 'Delay Reduction', icon: TrendingUp },
  { value: '156', label: 'Incidents Avoided', icon: Shield },
  { value: '$1.1M', label: 'Cost Savings', icon: BarChart3 },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-background border-t border-black dark:border-white">
      <div className="smooth-container">
        
        {/* Header - 12 col grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24">
          <div className="md:col-span-8">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] text-balance uppercase">
              Enterprise <br/>Intelligence.
            </h2>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end">
            <p className="text-xl font-medium leading-snug text-balance mt-6 md:mt-0">
              Our AI platform processes millions of data points to give you complete visibility 
              and control over your global operations.
            </p>
          </div>
        </div>

        {/* Stats Block - 4 cols */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-black dark:border-white mb-24">
          {stats.map((stat, i) => (
            <div 
              key={i}
              className="p-8 md:p-12 border-r border-b border-black dark:border-white flex flex-col items-start bg-muted/5"
            >
              <stat.icon className="h-6 w-6 text-primary mb-12 stroke-[2]" />
              <div className="text-5xl font-black tracking-tighter text-foreground mb-4">
                {stat.value}
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features list - 3 cols, asymmetrical */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-black dark:border-white">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-8 md:p-12 border-r border-b border-black dark:border-white flex flex-col group bg-background transition-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-default"
            >
              <feature.icon className="h-8 w-8 text-foreground group-hover:text-white dark:group-hover:text-black mb-16 stroke-[1.5]" />
              <h3 className="text-2xl font-bold uppercase tracking-tight mb-4">
                {feature.title}
              </h3>
              <p className="text-lg font-medium leading-snug group-hover:text-white/80 dark:group-hover:text-black/80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
