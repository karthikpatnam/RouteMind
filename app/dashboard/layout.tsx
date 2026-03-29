'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-white text-black flex font-sans">
      <CommandPalette />
      
      {/* Desktop sidebar - Rigid layout */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-white/90 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden border-r border-black bg-white">
            <Sidebar />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-[-48px] w-10 h-10 border border-black flex items-center justify-center bg-white text-black hover:bg-black hover:text-white transition-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </>
      )}

      {/* Main content - Rigid split */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header
          onMenuToggle={() => setSidebarOpen(true)}
          showMenuButton
        />
        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
