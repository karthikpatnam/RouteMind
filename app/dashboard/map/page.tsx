'use client'

import { MapboxTracker } from '@/components/dashboard/mapbox-tracker'
import { routes } from '@/lib/mock-data'
import { useState } from 'react'

export default function MapPage() {
  const [selectedRoute, setSelectedRoute] = useState(null)
  
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] pt-6 pr-6 pb-6">
      <div className="flex items-center justify-between mb-6 pl-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Map</h1>
          <p className="text-sm text-muted-foreground mt-1">Fullscreen Vessel Tracking Interface</p>
        </div>
      </div>
      <div className="flex-1 w-full h-full pl-6 relative z-10">
        <MapboxTracker 
          routes={routes} 
          selectedRoute={selectedRoute} 
          onRouteSelect={(r) => setSelectedRoute(r as any)} 
        />
      </div>
    </div>
  )
}
