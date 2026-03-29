'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background swiss-border-b transition-none">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 bg-primary flex-shrink-0" />
            <span className="text-xl font-bold tracking-tighter uppercase">
              RouteMind
            </span>
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Solutions', 'Pricing', 'Dashboard'].map((item) => (
              <Link 
                key={item}
                href={item === 'Dashboard' ? '/dashboard' : `#${item.toLowerCase()}`} 
                className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-none"
              >
                {item}
              </Link>
            ))}
          </div>
          
          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-none">
              Sign In
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="rounded-none bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:bg-black transition-none h-10 px-6">
                Terminal
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-background swiss-border-b">
          <div className="flex flex-col">
            {['Features', 'Solutions', 'Pricing', 'Dashboard'].map((item) => (
              <Link 
                key={item}
                href={item === 'Dashboard' ? '/dashboard' : `#${item.toLowerCase()}`} 
                className="block px-4 py-4 text-sm font-bold uppercase tracking-widest text-foreground swiss-border-b hover:bg-muted/10 transition-none"
                onClick={() => setIsOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="flex p-4 gap-4">
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full rounded-none border-black font-bold uppercase tracking-widest h-12">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex-1">
                <Button className="w-full rounded-none bg-primary text-primary-foreground font-bold uppercase tracking-widest h-12">
                  Terminal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
