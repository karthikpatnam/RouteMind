'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Globe, Shield, Route, Brain } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="min-h-[90vh] flex flex-col pt-32 pb-16">
      <div className="smooth-container w-full">
        
        {/* Strict 12-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-16 items-start mb-24">
          
          {/* Main Headline (8 Cols) */}
          <div className="md:col-span-8">
            <h1 className="text-[12vw] md:text-[8rem] lg:text-[10rem] font-bold tracking-tighter leading-[0.85] uppercase -ml-2">
              Predict.<br />
              Prevent.<br />
              <span className="text-primary">Optimize.</span>
            </h1>
          </div>

          {/* Supporting Text & CTAs (4 Cols) */}
          <div className="md:col-span-4 flex flex-col md:border-l border-black md:pl-8 mt-4 md:mt-16 xl:mt-24 h-full">
            <div className="inline-flex items-center gap-3 mb-10">
              <div className="w-3 h-3 bg-primary" />
              <span className="text-xs font-bold tracking-widest uppercase">
                System Operational V2.4
              </span>
            </div>

            <p className="text-xl md:text-2xl font-medium leading-snug mb-12 text-balance">
              AI-powered disruption detection. Monitor global logistics in real-time, detect risks instantly, and optimize routes.
            </p>

            <div className="flex flex-col gap-4 mt-auto">
              <Link href="/dashboard" className="w-full">
                <Button 
                  size="lg" 
                  className="w-full h-16 rounded-none bg-black text-white hover:bg-primary transition-none text-[15px] font-bold uppercase tracking-widest"
                >
                  Launch Terminal
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full h-16 rounded-none border-2 border-black bg-transparent text-black hover:bg-black hover:text-white transition-none text-[15px] font-bold uppercase tracking-widest"
              >
                <Play className="mr-3 h-5 w-5 fill-current" />
                View Simulation
              </Button>
            </div>
          </div>
        </div>

        {/* Feature grid strictly aligned */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 swiss-border-t">
          {[
            { icon: Globe, label: 'Global Monitoring', desc: 'Real-time tracking' },
            { icon: Brain, label: 'Risk Prediction', desc: 'AI-driven analysis' },
            { icon: Route, label: 'Autonomy', desc: 'Self-correcting paths' },
            { icon: Shield, label: 'Intel Security', desc: 'Multi-agent safety' },
          ].map((feature, i) => (
            <div
              key={i}
              className={`flex flex-col items-start px-4 md:px-6 py-8 ${i !== 3 ? 'md:swiss-border-r' : ''} ${i < 2 ? 'sm:swiss-border-r' : ''} ${i > 1 ? 'sm:swiss-border-t md:border-t-0' : ''}`}
            >
              <feature.icon className="h-8 w-8 mb-6 stroke-[1.5]" />
              <span className="text-lg font-bold uppercase tracking-tight leading-snug mb-1">
                {feature.label}
              </span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                {feature.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
