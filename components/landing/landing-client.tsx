'use client'

import { Navbar } from './navbar'
import { HeroSection } from './hero-section'
import { FeaturesSection } from './features-section'

export function LandingClient() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <HeroSection />
      
      <FeaturesSection />
      
      <footer className="border-t border-black dark:border-white py-12">
        <div className="smooth-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-primary flex-shrink-0" />
            <p className="text-sm font-bold tracking-widest uppercase">
              &copy; {new Date().getFullYear()} RouteMind AI
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            {['Privacy', 'Terms', 'Contact', 'Status'].map((link) => (
              <a 
                key={link} 
                href="#" 
                className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-none"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
