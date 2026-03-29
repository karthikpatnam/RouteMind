export interface Route {
  id: string
  name: string
  origin: {
    name: string
    lat: number
    lng: number
  }
  destination: {
    name: string
    lat: number
    lng: number
  }
  currentLocation?: {
    lat: number
    lng: number
  }
  waypoints?: { lat: number; lng: number }[]
  status: 'normal' | 'warning' | 'critical'
  riskScore: number
  eta: string
  cargo: string
  vessel: string
  distanceTotal?: number
  distanceCovered?: number
}
export interface Alert {
  id: string
  type: 'weather' | 'conflict' | 'traffic' | 'port'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  region: string
  description: string
  timestamp: string
  affectedRoutes: string[]
}

export interface Agent {
  id: string
  name: string
  type: 'weather' | 'news' | 'traffic' | 'routing'
  status: 'idle' | 'processing' | 'active'
  confidence: number
  lastUpdate: string
  contribution: number
}

export interface Prediction {
  id: string
  routeId: string
  riskScore: number
  confidence: number
  recommendation: 'continue' | 'reroute' | 'delay'
  alternativeRoute?: {
    timeSaved: number
    costReduction: number
    riskReduction: number
  }
}

export const routes: Route[] = [
  {
    id: 'route-1',
    name: 'Pacific Express',
    origin: { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
    destination: { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    currentLocation: { lat: 32.5, lng: 160.0 },
    waypoints: [
      { lat: 31.2304, lng: 121.4737 },
      { lat: 32.5, lng: 160.0 },
      { lat: 33.0, lng: -150.0 },
      { lat: 34.0522, lng: -118.2437 }
    ],
    status: 'normal',
    riskScore: 15,
    eta: '12 days',
    cargo: 'Electronics',
    vessel: 'MSC Aurora',
    distanceTotal: 10450,
    distanceCovered: 4500
  },
  {
    id: 'route-2',
    name: 'Suez Corridor',
    origin: { name: 'Rotterdam', lat: 51.9244, lng: 4.4777 },
    destination: { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
    currentLocation: { lat: 35.0, lng: 20.0 },
    waypoints: [
      { lat: 51.9244, lng: 4.4777 },
      { lat: 45.0, lng: -5.0 },
      { lat: 36.0, lng: -5.0 }, // Strait of Gibraltar
      { lat: 35.0, lng: 20.0 }, // Mediterranean
      { lat: 31.0, lng: 32.0 }, // Suez
      { lat: 12.0, lng: 43.0 }, // Bab-el-Mandeb
      { lat: 5.0, lng: 80.0 },  // Indian Ocean
      { lat: 1.3521, lng: 103.8198 }
    ],
    status: 'warning',
    riskScore: 62,
    eta: '18 days',
    cargo: 'Machinery',
    vessel: 'Ever Given II',
    distanceTotal: 15500,
    distanceCovered: 3500
  },
  {
    id: 'route-3',
    name: 'Atlantic Link',
    origin: { name: 'New York', lat: 40.7128, lng: -74.006 },
    destination: { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    currentLocation: { lat: 45.0, lng: -40.0 },
    waypoints: [
      { lat: 40.7128, lng: -74.006 },
      { lat: 45.0, lng: -40.0 },
      { lat: 50.0, lng: -20.0 },
      { lat: 53.5511, lng: 9.9937 }
    ],
    status: 'normal',
    riskScore: 8,
    eta: '9 days',
    cargo: 'Automotive Parts',
    vessel: 'Maersk Titan',
    distanceTotal: 6200,
    distanceCovered: 2800
  },
  {
    id: 'route-4',
    name: 'Red Sea Transit',
    origin: { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
    destination: { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
    currentLocation: { lat: 15.0, lng: 55.0 },
    waypoints: [
      { lat: 19.076, lng: 72.8777 },
      { lat: 15.0, lng: 55.0 },
      { lat: 12.0, lng: 43.0 }, // Bab-el-Mandeb
      { lat: 31.0, lng: 32.0 }, // Suez
      { lat: 36.0, lng: -5.0 }, // Strait of Gibraltar
      { lat: 50.9097, lng: -1.4044 }
    ],
    status: 'critical',
    riskScore: 87,
    eta: '21 days',
    cargo: 'Textiles',
    vessel: 'CMA CGM Neptune',
    distanceTotal: 11500,
    distanceCovered: 1200
  },
  {
    id: 'route-5',
    name: 'Nordic Route',
    origin: { name: 'Oslo', lat: 59.9139, lng: 10.7522 },
    destination: { name: 'Reykjavik', lat: 64.1466, lng: -21.9426 },
    currentLocation: { lat: 61.0, lng: 0.0 },
    waypoints: [
      { lat: 59.9139, lng: 10.7522 },
      { lat: 61.0, lng: 0.0 },
      { lat: 64.1466, lng: -21.9426 }
    ],
    status: 'warning',
    riskScore: 45,
    eta: '5 days',
    cargo: 'Seafood',
    vessel: 'Nordic Spirit',
    distanceTotal: 1750,
    distanceCovered: 800
  },
  {
    id: 'route-6',
    name: 'Med Express',
    origin: { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
    destination: { name: 'Alexandria', lat: 31.2001, lng: 29.9187 },
    currentLocation: { lat: 38.0, lng: 10.0 },
    waypoints: [
      { lat: 41.3851, lng: 2.1734 },
      { lat: 38.0, lng: 10.0 },
      { lat: 35.0, lng: 15.0 },
      { lat: 31.2001, lng: 29.9187 }
    ],
    status: 'normal',
    riskScore: 22,
    eta: '4 days',
    cargo: 'Consumer Goods',
    vessel: 'Med Star',
    distanceTotal: 2800,
    distanceCovered: 1000
  },
]

export const alerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'weather',
    severity: 'critical',
    title: 'Typhoon Warning',
    region: 'South China Sea',
    description: 'Category 4 typhoon approaching major shipping lanes. Expected impact in 48 hours.',
    timestamp: '5 min ago',
    affectedRoutes: ['route-1'],
  },
  {
    id: 'alert-2',
    type: 'conflict',
    severity: 'high',
    title: 'Security Advisory',
    region: 'Red Sea / Gulf of Aden',
    description: 'Increased maritime security threats reported. Alternative routing recommended.',
    timestamp: '15 min ago',
    affectedRoutes: ['route-4', 'route-2'],
  },
  {
    id: 'alert-3',
    type: 'traffic',
    severity: 'medium',
    title: 'Port Congestion',
    region: 'Port of Los Angeles',
    description: 'Average wait time increased to 72 hours due to labor negotiations.',
    timestamp: '30 min ago',
    affectedRoutes: ['route-1'],
  },
  {
    id: 'alert-4',
    type: 'weather',
    severity: 'medium',
    title: 'Storm System',
    region: 'North Atlantic',
    description: 'Winter storm expected to cause moderate delays for transatlantic routes.',
    timestamp: '45 min ago',
    affectedRoutes: ['route-3', 'route-5'],
  },
  {
    id: 'alert-5',
    type: 'port',
    severity: 'low',
    title: 'Maintenance Notice',
    region: 'Singapore Strait',
    description: 'Scheduled dredging operations may cause minor delays.',
    timestamp: '1 hour ago',
    affectedRoutes: ['route-2'],
  },
]

export const agents: Agent[] = [
  {
    id: 'agent-weather',
    name: 'Weather Agent',
    type: 'weather',
    status: 'active',
    confidence: 94,
    lastUpdate: '30s ago',
    contribution: 35,
  },
  {
    id: 'agent-news',
    name: 'News Agent',
    type: 'news',
    status: 'processing',
    confidence: 88,
    lastUpdate: '1 min ago',
    contribution: 25,
  },
  {
    id: 'agent-traffic',
    name: 'Traffic Agent',
    type: 'traffic',
    status: 'active',
    confidence: 91,
    lastUpdate: '45s ago',
    contribution: 20,
  },
  {
    id: 'agent-routing',
    name: 'Routing Agent',
    type: 'routing',
    status: 'idle',
    confidence: 96,
    lastUpdate: '2 min ago',
    contribution: 20,
  },
]

export const predictions: Prediction[] = [
  {
    id: 'pred-1',
    routeId: 'route-4',
    riskScore: 87,
    confidence: 92,
    recommendation: 'reroute',
    alternativeRoute: {
      timeSaved: 48,
      costReduction: 15,
      riskReduction: 65,
    },
  },
  {
    id: 'pred-2',
    routeId: 'route-2',
    riskScore: 62,
    confidence: 85,
    recommendation: 'delay',
    alternativeRoute: {
      timeSaved: 24,
      costReduction: 8,
      riskReduction: 40,
    },
  },
]

export const analyticsData = {
  delayPredictions: [
    { date: 'Jan', predicted: 45, actual: 42 },
    { date: 'Feb', predicted: 52, actual: 55 },
    { date: 'Mar', predicted: 38, actual: 36 },
    { date: 'Apr', predicted: 61, actual: 58 },
    { date: 'May', predicted: 44, actual: 46 },
    { date: 'Jun', predicted: 33, actual: 31 },
  ],
  costSavings: [
    { month: 'Jan', savings: 125000 },
    { month: 'Feb', savings: 180000 },
    { month: 'Mar', savings: 145000 },
    { month: 'Apr', savings: 220000 },
    { month: 'May', savings: 195000 },
    { month: 'Jun', savings: 260000 },
  ],
  routeEfficiency: [
    { route: 'Pacific', efficiency: 94 },
    { route: 'Atlantic', efficiency: 91 },
    { route: 'Med', efficiency: 88 },
    { route: 'Nordic', efficiency: 85 },
    { route: 'Suez', efficiency: 72 },
    { route: 'Red Sea', efficiency: 65 },
  ],
  kpis: {
    totalShipmentsOptimized: 2847,
    averageDelayReduction: 34,
    riskIncidentsAvoided: 156,
    totalCostSaved: 1125000,
  },
}

export const systemStatus = {
  dataStreams: [
    { name: 'Weather API', status: 'active', latency: 45 },
    { name: 'AIS Tracking', status: 'active', latency: 120 },
    { name: 'News Feed', status: 'active', latency: 230 },
    { name: 'Port Data', status: 'degraded', latency: 890 },
  ],
  aiModels: [
    { name: 'Risk Predictor v3.2', status: 'online', accuracy: 94.2 },
    { name: 'Route Optimizer', status: 'online', accuracy: 91.8 },
    { name: 'Disruption Detector', status: 'online', accuracy: 89.5 },
  ],
}

// City coordinates for the 3D globe
export const cities = [
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Rotterdam', lat: 51.9244, lng: 4.4777 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
]
