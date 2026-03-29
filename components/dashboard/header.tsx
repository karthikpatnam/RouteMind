'use client'

import { useState } from 'react'
import { Bell, Search, User, Menu } from 'lucide-react'
import { alerts } from '@/lib/mock-data'
import { ModeToggle } from '@/components/mode-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  onMenuToggle?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuToggle, showMenuButton }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high')

  return (
    <header className="h-[65px] flex-shrink-0 bg-white border-b border-black flex items-center justify-between px-6 z-30 transition-none font-sans">
      {/* Left */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-[40px] h-[40px] flex items-center justify-center text-black border border-black hover:bg-black hover:text-white transition-none"
          >
            <Menu className="h-5 w-5 stroke-[2]" />
          </button>
        )}

        {/* Search */}
        <div className={`relative transition-none ${searchFocused ? 'w-[400px]' : 'w-[320px]'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black stroke-[2]" />
          <input
            placeholder="Search routes, ports, vessels..."
            className="w-full h-[40px] pl-10 pr-4 bg-white border border-black text-sm text-black outline-none focus:ring-0 placeholder:text-black/50 font-bold uppercase tracking-widest transition-none"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-black bg-white">
          <span className="w-2 h-2 bg-primary" />
          <span className="text-[10px] text-black font-bold tracking-widest uppercase">System Online</span>
        </div>
        
        <ModeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-[40px] h-[40px] flex items-center justify-center text-black border border-black bg-white hover:bg-black hover:text-white transition-none">
              <Bell className="h-4 w-4 stroke-[2]" />
              {criticalAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 border border-black bg-primary" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] bg-white border border-black rounded-none shadow-none p-0">
            <DropdownMenuLabel className="flex items-center justify-between text-black font-bold uppercase tracking-widest p-4 border-b border-black">
              <span>Notifications</span>
              <span className="text-[10px] text-white bg-black px-2 py-1">{criticalAlerts.length} UNREAD</span>
            </DropdownMenuLabel>
            <div className="divide-y divide-black/10">
              {alerts.slice(0, 4).map((alert) => (
                <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 cursor-pointer p-4 hover:bg-black/5 focus:bg-black/5 rounded-none transition-none">
                  <div className="flex items-center gap-3 w-full">
                    <span className={`h-2 w-2 flex-shrink-0 ${
                      alert.severity === 'critical' ? 'bg-primary' :
                      alert.severity === 'high' ? 'bg-black' :
                      alert.severity === 'medium' ? 'border border-black' : 'bg-transparent border border-black'
                    }`} />
                    <span className="font-bold text-xs uppercase tracking-widest">{alert.title}</span>
                  </div>
                  <span className="text-[10px] text-black/50 pl-5 font-bold uppercase tracking-widest">{alert.region}</span>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuItem className="p-4 text-center cursor-pointer text-white bg-black hover:opacity-90 font-bold uppercase tracking-widest rounded-none justify-center transition-none border-t border-black">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-[40px] h-[40px] bg-white border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-none">
              <User className="h-4 w-4 stroke-[2]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-black rounded-none shadow-none p-0 w-[240px]">
            <DropdownMenuLabel className="p-4 border-b border-black">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-black uppercase tracking-widest text-sm">Ops Admin</span>
                <span className="text-[10px] text-black/50 font-bold uppercase tracking-widest">user@routemind.ai</span>
              </div>
            </DropdownMenuLabel>
            <div className="p-2 space-y-1">
              <DropdownMenuItem className="cursor-pointer font-bold uppercase tracking-widest text-xs p-3 hover:bg-black/5 focus:bg-black/5 rounded-none transition-none">Profile</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold uppercase tracking-widest text-xs p-3 hover:bg-black/5 focus:bg-black/5 rounded-none transition-none">Settings</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold uppercase tracking-widest text-xs p-3 hover:bg-black/5 focus:bg-black/5 rounded-none transition-none">API Keys</DropdownMenuItem>
            </div>
            <DropdownMenuItem className="cursor-pointer font-bold uppercase tracking-widest text-xs p-4 bg-primary text-white hover:bg-primary/90 focus:bg-primary/90 focus:text-white rounded-none transition-none border-t border-black justify-center">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
