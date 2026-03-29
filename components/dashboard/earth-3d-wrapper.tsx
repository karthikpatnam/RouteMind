'use client'

import { Earth3D } from './earth-3d'
import { type Route } from '@/lib/mock-data'

interface Earth3DWrapperProps {
  onRouteSelect: (route: Route | null) => void
  className?: string
}

export function Earth3DWrapper({ onRouteSelect, className }: Earth3DWrapperProps) {
  return <Earth3D onRouteSelect={onRouteSelect} className={className} />
}
