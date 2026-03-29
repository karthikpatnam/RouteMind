'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Map, Activity, Cpu, Settings, Ship, FileText, LayoutDashboard } from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    []
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 font-sans">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/90" onClick={() => setOpen(false)} />
      
      {/* Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden border-2 border-black bg-white text-black shadow-none animate-in fade-in zoom-in-95 duration-200">
        <Command
          className="flex h-full w-full flex-col overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <div className="flex items-center border-b-2 border-black px-4 bg-white">
            <Search className="mr-3 h-5 w-5 shrink-0 text-black stroke-[3]" />
            <Command.Input
              autoFocus
              className="flex h-14 w-full bg-transparent py-4 text-sm font-bold uppercase tracking-widest text-black outline-none placeholder:text-black/30"
              placeholder="SEARCH COMMANDS OR ENTITIES..."
            />
          </div>
          
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-0 custom-scrollbar">
            <Command.Empty className="py-8 text-center text-sm text-black/50 font-bold uppercase tracking-widest">
              NO RESULTS FOUND.
            </Command.Empty>
            
            <Command.Group heading="NAVIGATION" className="text-[10px] font-bold tracking-widest text-black/50 bg-white [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-black">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <LayoutDashboard className="h-4 w-4 stroke-[2]" />
                <span>OVERVIEW</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/map'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <Map className="h-4 w-4 stroke-[2]" />
                <span>LIVE MAP</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/fleet'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <Ship className="h-4 w-4 stroke-[2]" />
                <span>FLEET MANAGEMENT</span>
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="INTELLIGENCE" className="text-[10px] font-bold tracking-widest text-black/50 border-t-2 border-black bg-white [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-black">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/agents'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <Cpu className="h-4 w-4 stroke-[2]" />
                <span>AI AGENTS</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <Activity className="h-4 w-4 stroke-[2]" />
                <span>ANALYTICS & INSIGHTS</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="SETTINGS & HELP" className="text-[10px] font-bold tracking-widest text-black/50 border-t-2 border-black bg-white [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-black">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group border-b border-black/10 last:border-b-0"
              >
                <Settings className="h-4 w-4 stroke-[2]" />
                <span>SYSTEM SETTINGS</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => window.open('/docs', '_blank'))}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-black aria-selected:bg-black aria-selected:text-white group"
              >
                <FileText className="h-4 w-4 stroke-[2]" />
                <span>DOCUMENTATION</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
