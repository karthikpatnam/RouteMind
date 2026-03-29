'use client'

import { useEffect, useRef, useCallback } from 'react'
import { routes, cities, type Route } from '@/lib/mock-data'

interface Earth3DProps {
  onRouteSelect?: (route: Route | null) => void
  className?: string
}

interface AnimatedRoute {
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  progress: number
  speed: number
  route: Route
}

interface CityNode {
  x: number
  y: number
  z: number
  name: string
  pulse: number
}

function latLngTo3D(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  }
}

function project3Dto2D(
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerY: number,
  scale: number,
  rotationY: number
) {
  const cosR = Math.cos(rotationY)
  const sinR = Math.sin(rotationY)
  const rx = x * cosR - z * sinR
  const rz = x * sinR + z * cosR
  
  const perspective = 4
  const factor = perspective / (perspective + rz / scale)
  
  return {
    screenX: centerX + rx * factor * scale,
    screenY: centerY - y * factor * scale,
    depth: rz,
    visible: rz < scale * 0.8,
  }
}

export function Earth3D({ onRouteSelect, className = '' }: Earth3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef(0)
  const animatedRoutesRef = useRef<AnimatedRoute[]>([])
  const cityNodesRef = useRef<CityNode[]>([])
  
  const handleClick = useCallback((e: MouseEvent) => {
    if (!canvasRef.current || !onRouteSelect) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * window.devicePixelRatio
    const y = (e.clientY - rect.top) * window.devicePixelRatio
    
    const centerX = canvasRef.current.width / 2
    const centerY = canvasRef.current.height / 2
    const scale = Math.min(canvasRef.current.width, canvasRef.current.height) * 0.35
    
    for (const animRoute of animatedRoutesRef.current) {
      const from = project3Dto2D(
        animRoute.from.x, animRoute.from.y, animRoute.from.z,
        centerX, centerY, scale, rotationRef.current
      )
      const to = project3Dto2D(
        animRoute.to.x, animRoute.to.y, animRoute.to.z,
        centerX, centerY, scale, rotationRef.current
      )
      
      if (from.visible && to.visible) {
        const dx = to.screenX - from.screenX
        const dy = to.screenY - from.screenY
        const t = Math.max(0, Math.min(1, ((x - from.screenX) * dx + (y - from.screenY) * dy) / (dx * dx + dy * dy)))
        const nearestX = from.screenX + t * dx
        const nearestY = from.screenY + t * dy
        const dist = Math.sqrt((x - nearestX) ** 2 + (y - nearestY) ** 2)
        
        if (dist < 20 * window.devicePixelRatio) {
          onRouteSelect(animRoute.route)
          return
        }
      }
    }
  }, [onRouteSelect])
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
    }
    resize()
    window.addEventListener('resize', resize)
    
    animatedRoutesRef.current = routes.map((route) => ({
      from: latLngTo3D(route.origin.lat, route.origin.lng, 1),
      to: latLngTo3D(route.destination.lat, route.destination.lng, 1),
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.002,
      route,
    }))
    
    cityNodesRef.current = cities.map((city) => {
      const pos = latLngTo3D(city.lat, city.lng, 1)
      return { ...pos, name: city.name, pulse: Math.random() * Math.PI * 2 }
    })
    
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastMouseRef.current.x
        targetRotationRef.current += dx * 0.005
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }
    
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('click', handleClick)
    
    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      const centerX = width / 2
      const centerY = height / 2
      const scale = Math.min(width, height) * 0.35
      
      if (!isDraggingRef.current) {
        targetRotationRef.current += 0.003
      }
      rotationRef.current += (targetRotationRef.current - rotationRef.current) * 0.1
      
      // Globe
      const globeGradient = ctx.createRadialGradient(
        centerX - scale * 0.3, centerY - scale * 0.3, 0,
        centerX, centerY, scale
      )
      globeGradient.addColorStop(0, 'rgba(30, 58, 95, 0.9)')
      globeGradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.95)')
      globeGradient.addColorStop(1, 'rgba(10, 15, 30, 1)')
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, scale, 0, Math.PI * 2)
      ctx.fillStyle = globeGradient
      ctx.fill()
      
      // Glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, scale * 0.9, centerX, centerY, scale * 1.2)
      glowGradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)')
      glowGradient.addColorStop(1, 'rgba(56, 189, 248, 0)')
      ctx.beginPath()
      ctx.arc(centerX, centerY, scale * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
      
      // Latitude lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'
      ctx.lineWidth = 1
      for (let lat = -60; lat <= 60; lat += 30) {
        const points: { x: number; y: number; visible: boolean }[] = []
        for (let lng = 0; lng <= 360; lng += 10) {
          const pos = latLngTo3D(lat, lng - 180, 1)
          const projected = project3Dto2D(pos.x, pos.y, pos.z, centerX, centerY, scale, rotationRef.current)
          points.push({ x: projected.screenX, y: projected.screenY, visible: projected.visible })
        }
        
        ctx.beginPath()
        let started = false
        for (const point of points) {
          if (point.visible) {
            if (!started) {
              ctx.moveTo(point.x, point.y)
              started = true
            } else {
              ctx.lineTo(point.x, point.y)
            }
          } else {
            started = false
          }
        }
        ctx.stroke()
      }
      
      // Longitude lines
      for (let lng = -180; lng < 180; lng += 30) {
        const points: { x: number; y: number; visible: boolean }[] = []
        for (let lat = -90; lat <= 90; lat += 5) {
          const pos = latLngTo3D(lat, lng, 1)
          const projected = project3Dto2D(pos.x, pos.y, pos.z, centerX, centerY, scale, rotationRef.current)
          points.push({ x: projected.screenX, y: projected.screenY, visible: projected.visible })
        }
        
        ctx.beginPath()
        let started = false
        for (const point of points) {
          if (point.visible) {
            if (!started) {
              ctx.moveTo(point.x, point.y)
              started = true
            } else {
              ctx.lineTo(point.x, point.y)
            }
          } else {
            started = false
          }
        }
        ctx.stroke()
      }
      
      // Routes
      const routesToDraw = animatedRoutesRef.current.map((animRoute) => {
        const fromProj = project3Dto2D(animRoute.from.x, animRoute.from.y, animRoute.from.z, centerX, centerY, scale, rotationRef.current)
        const toProj = project3Dto2D(animRoute.to.x, animRoute.to.y, animRoute.to.z, centerX, centerY, scale, rotationRef.current)
        return { animRoute, fromProj, toProj, avgDepth: (fromProj.depth + toProj.depth) / 2 }
      }).sort((a, b) => b.avgDepth - a.avgDepth)
      
      for (const { animRoute, fromProj, toProj } of routesToDraw) {
        if (!fromProj.visible || !toProj.visible) continue
        
        let routeColor = '#38bdf8'
        let routeGlow = 'rgba(56, 189, 248, 0.3)'
        if (animRoute.route.status === 'warning') {
          routeColor = '#fbbf24'
          routeGlow = 'rgba(251, 191, 36, 0.3)'
        } else if (animRoute.route.status === 'critical') {
          routeColor = '#ef4444'
          routeGlow = 'rgba(239, 68, 68, 0.3)'
        }
        
        const midX = (fromProj.screenX + toProj.screenX) / 2
        const midY = (fromProj.screenY + toProj.screenY) / 2
        const dist = Math.sqrt((toProj.screenX - fromProj.screenX) ** 2 + (toProj.screenY - fromProj.screenY) ** 2)
        const arcHeight = dist * 0.2
        const controlY = midY - arcHeight
        
        ctx.beginPath()
        ctx.moveTo(fromProj.screenX, fromProj.screenY)
        ctx.quadraticCurveTo(midX, controlY, toProj.screenX, toProj.screenY)
        ctx.strokeStyle = routeGlow
        ctx.lineWidth = 4
        ctx.stroke()
        
        ctx.beginPath()
        ctx.moveTo(fromProj.screenX, fromProj.screenY)
        ctx.quadraticCurveTo(midX, controlY, toProj.screenX, toProj.screenY)
        ctx.strokeStyle = routeColor
        ctx.lineWidth = 2
        ctx.stroke()
        
        const t = animRoute.progress
        const px = (1 - t) * (1 - t) * fromProj.screenX + 2 * (1 - t) * t * midX + t * t * toProj.screenX
        const py = (1 - t) * (1 - t) * fromProj.screenY + 2 * (1 - t) * t * controlY + t * t * toProj.screenY
        
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = routeColor
        ctx.fill()
        
        const dotGlow = ctx.createRadialGradient(px, py, 0, px, py, 15)
        dotGlow.addColorStop(0, routeGlow)
        dotGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.beginPath()
        ctx.arc(px, py, 15, 0, Math.PI * 2)
        ctx.fillStyle = dotGlow
        ctx.fill()
        
        animRoute.progress += animRoute.speed
        if (animRoute.progress > 1) animRoute.progress = 0
      }
      
      // Cities
      const citiesToDraw = cityNodesRef.current.map((city) => {
        const projected = project3Dto2D(city.x, city.y, city.z, centerX, centerY, scale, rotationRef.current)
        return { city, projected }
      }).sort((a, b) => b.projected.depth - a.projected.depth)
      
      for (const { city, projected } of citiesToDraw) {
        if (!projected.visible) continue
        
        city.pulse += 0.03
        const pulseScale = 1 + Math.sin(city.pulse) * 0.4
        
        ctx.beginPath()
        ctx.arc(projected.screenX, projected.screenY, 12 * pulseScale, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(56, 189, 248, ${0.15 / pulseScale})`
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(projected.screenX, projected.screenY, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(projected.screenX, projected.screenY, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('click', handleClick)
      cancelAnimationFrame(animationRef.current)
    }
  }, [handleClick])
  
  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full cursor-grab active:cursor-grabbing ${className}`}
      style={{ background: 'transparent' }}
    />
  )
}
