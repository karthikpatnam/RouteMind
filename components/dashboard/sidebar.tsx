'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Globe2,
  BarChart3,
  Settings,
  Bell,
  Cpu,
  Cloud,
  HelpCircle,
  LogOut,
  Satellite,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Global Map', href: '/dashboard/map', icon: Globe2 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'AI Agents', href: '/dashboard/agents', icon: Cpu },
  { name: 'Weather Agent', href: '/dashboard/weather', icon: Cloud, badge: 'NEW' },
  { name: 'Alerts', href: '/dashboard/alerts', icon: Bell, badge: 3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[280px] h-full flex flex-col bg-white border-r border-black flex-shrink-0 transition-none font-sans">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-black bg-white">
        <div className="w-6 h-6 bg-primary flex-shrink-0" />
        <div>
          <span className="text-xl font-bold tracking-tighter uppercase text-black">
            RouteMind
          </span>
          <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-none mt-0.5">
            AI Platform
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-2 pb-4 text-xs font-bold text-black uppercase tracking-widest">
          Main Menu
        </div>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-3 text-sm font-bold uppercase tracking-widest transition-none border border-transparent',
                isActive
                  ? 'bg-black text-white border-black'
                  : 'text-black hover:border-black hover:bg-muted/10'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 stroke-[2]',
                  isActive ? 'text-white' : 'text-black'
                )}
              />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className={cn(
                  'inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-bold uppercase tracking-widest transition-none',
                  isActive ? 'bg-white text-black' : 'bg-black text-white'
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* System status */}
      <div className="p-4 mx-4 mb-4 border border-black bg-white transition-none">
        <div className="space-y-3">
          <div className="text-xs font-bold text-black uppercase tracking-widest border-b border-black pb-2 mb-2">System Status</div>
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-bold uppercase tracking-widest text-black">Status</span>
            <span className="flex items-center gap-2 text-xs text-black font-bold uppercase tracking-widest">
              <span className="w-2 h-2 bg-primary" />
              Online
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-black/10">
            <span className="text-xs font-bold uppercase tracking-widest text-black">AI Models</span>
            <span className="text-xs text-black font-bold uppercase tracking-widest">4 Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-black">Data Stream</span>
            <span className="text-xs text-black font-bold uppercase tracking-widest">Healthy</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-black flex flex-col gap-2 bg-white">
        <button className="w-full flex items-center gap-3 px-3 py-3 text-sm text-black font-bold uppercase tracking-widest border border-transparent hover:border-black transition-none">
          <HelpCircle className="h-4 w-4 stroke-[2]" />
          Support
        </button>
        <Link href="/">
          <button className="w-full flex items-center gap-3 px-3 py-3 text-sm text-primary font-bold uppercase tracking-widest border border-transparent hover:bg-primary hover:text-white transition-none">
            <LogOut className="h-4 w-4 stroke-[2]" />
            Exit
          </button>
        </Link>
      </div>
    </aside>
  )
}
