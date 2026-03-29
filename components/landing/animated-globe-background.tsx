'use client'

import { useEffect, useRef } from 'react'

interface RouteAnim {
  from: { x: number; y: number }
  to: { x: number; y: number }
  progress: number
  speed: number
}

interface CityAnim {
  x: number
  y: number
  pulse: number
}

export function AnimatedGlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    const centerX = () => canvas.width / 2
    const centerY = () => canvas.height / 2
    const radius = () => Math.min(canvas.width, canvas.height) * 0.35
    
    const cityData = [
      { nx: -0.3, ny: 0.2 },
      { nx: 0.7, ny: 0.15 },
      { nx: 0.15, ny: -0.4 },
      { nx: -0.5, ny: 0.6 },
      { nx: 0.5, ny: -0.3 },
      { nx: 0.2, ny: -0.35 },
      { nx: -0.4, ny: 0.35 },
      { nx: 0.1, ny: -0.45 },
      { nx: -0.6, ny: -0.1 },
      { nx: -0.7, ny: 0.8 },
      { nx: -0.2, ny: 0.25 },
      { nx: 0.05, ny: -0.25 },
    ]
    
    const cities: CityAnim[] = cityData.map(() => ({
      x: 0,
      y: 0,
      pulse: Math.random() * Math.PI * 2,
    }))
    
    const updateCityPositions = () => {
      const cx = centerX()
      const cy = centerY()
      const r = radius()
      cityData.forEach((c, i) => {
        cities[i].x = cx + c.nx * r
        cities[i].y = cy + c.ny * r
      })
    }
    
    const routeIndices = [
      [0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11],
      [0, 3], [1, 4], [2, 6], [5, 10]
    ]
    
    const routes: RouteAnim[] = routeIndices.map(() => ({
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
    }))
    
    const updateRoutePositions = () => {
      routeIndices.forEach((indices, i) => {
        routes[i].from = { x: cities[indices[0]].x, y: cities[indices[0]].y }
        routes[i].to = { x: cities[indices[1]].x, y: cities[indices[1]].y }
      })
    }
    
    const stars: { x: number; y: number; size: number; alpha: number }[] = []
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }
    
    let rotation = 0
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const cx = centerX()
      const cy = centerY()
      const r = radius()
      
      updateCityPositions()
      updateRoutePositions()
      
      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x * canvas.width, star.y * canvas.height, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`
        ctx.fill()
      })
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)')
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.7)')
      
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
      const glowGradient = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.3)
      glowGradient.addColorStop(0, 'rgba(56, 189, 248, 0.1)')
      glowGradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)')
      glowGradient.addColorStop(1, 'rgba(56, 189, 248, 0)')
      
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
      
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
      ctx.lineWidth = 1
      
      for (let lat = -60; lat <= 60; lat += 30) {
        const latR = r * Math.cos((lat * Math.PI) / 180)
        const latY = cy + r * Math.sin((lat * Math.PI) / 180) * 0.3
        
        ctx.beginPath()
        ctx.ellipse(cx, latY, latR, latR * 0.3, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      
      for (let lng = 0; lng < 180; lng += 30) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rotation + (lng * Math.PI) / 180)
        
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.1, r, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'
        ctx.stroke()
        
        ctx.restore()
      }
      
      routes.forEach((route) => {
        const midX = (route.from.x + route.to.x) / 2
        const midY = (route.from.y + route.to.y) / 2 - 50
        
        ctx.beginPath()
        ctx.moveTo(route.from.x, route.from.y)
        ctx.quadraticCurveTo(midX, midY, route.to.x, route.to.y)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        const t = route.progress
        const px = (1 - t) * (1 - t) * route.from.x + 2 * (1 - t) * t * midX + t * t * route.to.x
        const py = (1 - t) * (1 - t) * route.from.y + 2 * (1 - t) * t * midY + t * t * route.to.y
        
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        
        const dotGlow = ctx.createRadialGradient(px, py, 0, px, py, 10)
        dotGlow.addColorStop(0, 'rgba(56, 189, 248, 0.5)')
        dotGlow.addColorStop(1, 'rgba(56, 189, 248, 0)')
        ctx.beginPath()
        ctx.arc(px, py, 10, 0, Math.PI * 2)
        ctx.fillStyle = dotGlow
        ctx.fill()
        
        route.progress += route.speed
        if (route.progress > 1) route.progress = 0
      })
      
      cities.forEach((city) => {
        city.pulse += 0.05
        const pulseScale = 1 + Math.sin(city.pulse) * 0.3
        
        ctx.beginPath()
        ctx.arc(city.x, city.y, 8 * pulseScale, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(56, 189, 248, ${0.2 / pulseScale})`
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(city.x, city.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#38bdf8'
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(city.x, city.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      })
      
      rotation += 0.002
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])
  
  return (
    <div className="absolute inset-0 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
    </div>
  )
}
