'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MapPin {
  id: string
  label: string
  lat: number
  lng: number
  color: string
  createdAt: number
  note?: string
}

const STORAGE_KEY = 'routemind-map-pins'

export function useMapPins() {
  const [pins, setPins] = useState<MapPin[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPins(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const save = (next: MapPin[]) => {
    setPins(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const addPin = useCallback((lat: number, lng: number, label?: string) => {
    const pin: MapPin = {
      id: `pin-${Date.now()}`,
      label: label ?? `Pin ${new Date().toLocaleTimeString()}`,
      lat, lng,
      color: '#f59e0b',
      createdAt: Date.now(),
    }
    save([...pins, pin])
    return pin
  }, [pins])

  const removePin = useCallback((id: string) => {
    save(pins.filter(p => p.id !== id))
  }, [pins])

  const updatePin = useCallback((id: string, label: string) => {
    save(pins.map(p => p.id === id ? { ...p, label } : p))
  }, [pins])

  const clearPins = useCallback(() => save([]), [])

  return { pins, addPin, removePin, updatePin, clearPins }
}
