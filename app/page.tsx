'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  FiActivity,
  FiNavigation,
  FiMessageSquare,
  FiSend,
  FiX,
  FiZap,
  FiCrosshair,
  FiLayers,
  FiRepeat,
  FiBookmark,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiMapPin,
  FiTruck,
  FiArrowRight,
  FiCheck,
  FiInfo,
} from 'react-icons/fi'

// ---------- Constants ----------
const AGENT_ID = '699f3276f13aaac966413d90'

// ---------- Types ----------
interface TrafficIntelligenceResponse {
  analysis_type: string
  summary: string
  route_recommendations: Array<{
    route_name: string
    total_time_minutes: number
    distance_km: number
    signal_count: number
    estimated_signal_wait_minutes: number
    traffic_density: string
    is_recommended: boolean
    key_intersections: string[]
    notes: string
  }>
  signal_data: Array<{
    intersection_name: string
    current_phase: string
    wait_time_seconds: number
    density_level: string
    notes: string
  }>
  traffic_insights: string[]
  congestion_level: string
  best_departure_time: string
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  data: TrafficIntelligenceResponse | null
}

interface Intersection {
  id: number
  name: string
  lat: number
  lng: number
  status: 'green' | 'red' | 'yellow'
  countdown: number
  density: number
}

interface SavedRoute {
  id: string
  name: string
  origin: string
  destination: string
}

// ---------- Bangalore Intersection Data ----------
const INITIAL_INTERSECTIONS: Intersection[] = [
  { id: 1, name: 'MG Road & Brigade Road', lat: 12.9758, lng: 77.6066, status: 'green', countdown: 15, density: 4 },
  { id: 2, name: 'Silk Board Junction', lat: 12.9173, lng: 77.6229, status: 'red', countdown: 45, density: 5 },
  { id: 3, name: 'Marathahalli Bridge', lat: 12.9562, lng: 77.7013, status: 'red', countdown: 32, density: 5 },
  { id: 4, name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970, status: 'green', countdown: 20, density: 3 },
  { id: 5, name: 'KR Puram Junction', lat: 12.9988, lng: 77.6965, status: 'yellow', countdown: 4, density: 4 },
  { id: 6, name: 'Koramangala BDA Complex', lat: 12.9352, lng: 77.6245, status: 'green', countdown: 12, density: 2 },
  { id: 7, name: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408, status: 'green', countdown: 18, density: 2 },
  { id: 8, name: 'Jayanagar 4th Block', lat: 12.9266, lng: 77.5835, status: 'red', countdown: 28, density: 3 },
  { id: 9, name: 'Banashankari Circle', lat: 12.9250, lng: 77.5462, status: 'green', countdown: 10, density: 2 },
  { id: 10, name: 'Yeshwanthpur Circle', lat: 13.0223, lng: 77.5510, status: 'red', countdown: 35, density: 4 },
  { id: 11, name: 'Majestic Bus Station', lat: 12.9767, lng: 77.5713, status: 'yellow', countdown: 3, density: 5 },
  { id: 12, name: 'Electronic City Phase 1', lat: 12.8451, lng: 77.6602, status: 'green', countdown: 22, density: 3 },
  { id: 13, name: 'Whitefield Main Road', lat: 12.9698, lng: 77.7500, status: 'red', countdown: 40, density: 4 },
  { id: 14, name: 'JP Nagar 6th Phase', lat: 12.8984, lng: 77.5855, status: 'green', countdown: 8, density: 1 },
  { id: 15, name: 'Yelahanka Junction', lat: 13.1005, lng: 77.5963, status: 'green', countdown: 14, density: 2 },
  { id: 16, name: 'HSR Layout Sector 1', lat: 12.9116, lng: 77.6389, status: 'yellow', countdown: 5, density: 3 },
  { id: 17, name: 'BTM Layout 2nd Stage', lat: 12.9165, lng: 77.6101, status: 'red', countdown: 25, density: 4 },
  { id: 18, name: 'Rajajinagar Junction', lat: 12.9907, lng: 77.5556, status: 'green', countdown: 16, density: 2 },
]

// ---------- Sample Data ----------
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: 'Analyze the best route from Koramangala to Hebbal Flyover',
    data: null,
  },
  {
    role: 'agent',
    content: 'Based on current Bangalore traffic conditions, I recommend taking the Indiranagar corridor. Here are your route options:',
    data: {
      analysis_type: 'route_analysis',
      summary: 'Based on current Bangalore traffic conditions, I recommend taking the Indiranagar corridor via 100ft Road. Traffic density is moderate along this route with favorable signal timing. Avoid Silk Board Junction due to extreme congestion.',
      route_recommendations: [
        {
          route_name: 'Indiranagar Express',
          total_time_minutes: 28,
          distance_km: 14.5,
          signal_count: 5,
          estimated_signal_wait_minutes: 4,
          traffic_density: 'Moderate',
          is_recommended: true,
          key_intersections: ['Koramangala BDA Complex', 'Indiranagar 100ft Road', 'Hebbal Flyover'],
          notes: 'Best route via Indiranagar - avoids Silk Board congestion',
        },
        {
          route_name: 'Outer Ring Road',
          total_time_minutes: 42,
          distance_km: 18.2,
          signal_count: 8,
          estimated_signal_wait_minutes: 12,
          traffic_density: 'High',
          is_recommended: false,
          key_intersections: ['Silk Board Junction', 'Marathahalli Bridge', 'KR Puram Junction'],
          notes: 'Heavy congestion near Silk Board - expect delays',
        },
        {
          route_name: 'MG Road Central',
          total_time_minutes: 35,
          distance_km: 15.8,
          signal_count: 6,
          estimated_signal_wait_minutes: 7,
          traffic_density: 'Moderate',
          is_recommended: false,
          key_intersections: ['MG Road & Brigade Road', 'Majestic Bus Station', 'Yeshwanthpur Circle'],
          notes: 'Moderate traffic through city center',
        },
      ],
      signal_data: [
        { intersection_name: 'Koramangala BDA Complex', current_phase: 'green', wait_time_seconds: 12, density_level: 'Low', notes: 'Favorable timing' },
        { intersection_name: 'Silk Board Junction', current_phase: 'red', wait_time_seconds: 45, density_level: 'Very High', notes: 'Avoid if possible - peak hour gridlock' },
        { intersection_name: 'Indiranagar 100ft Road', current_phase: 'green', wait_time_seconds: 18, density_level: 'Low', notes: 'Smooth flow' },
      ],
      traffic_insights: [
        'Silk Board Junction is experiencing peak hour congestion - avoid until after 8 PM',
        'Indiranagar 100ft Road has green wave synchronization active',
        'Metro construction near MG Road may cause minor delays',
        'Hebbal Flyover approach from Yeshwanthpur has less traffic than Bellary Road',
      ],
      congestion_level: 'Moderate',
      best_departure_time: 'Leave within the next 10 minutes for optimal conditions',
    },
  },
]

const SAMPLE_ROUTES: SavedRoute[] = [
  { id: '1', name: 'Morning Commute', origin: 'Koramangala', destination: 'Manyata Tech Park' },
  { id: '2', name: 'Weekend Trip', origin: 'Indiranagar', destination: 'Electronic City' },
  { id: '3', name: 'Airport Run', origin: 'MG Road', destination: 'Kempegowda Airport' },
]

const SAMPLE_ROUTE_RESULTS = SAMPLE_MESSAGES[1]?.data?.route_recommendations ?? []

// ---------- Helper: Signal Color ----------
function getSignalColor(status: string): string {
  switch (status) {
    case 'green': return 'hsl(160, 70%, 45%)'
    case 'red': return 'hsl(0, 75%, 55%)'
    case 'yellow': return 'hsl(35, 85%, 55%)'
    default: return 'hsl(220, 12%, 55%)'
  }
}

function getCongestionBadgeClass(level: string): string {
  const l = (level ?? '').toLowerCase()
  if (l === 'low') return 'bg-accent/20 text-accent border-accent/30'
  if (l === 'moderate') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  if (l === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (l === 'very high') return 'bg-destructive/20 text-destructive border-destructive/30'
  return 'bg-muted text-muted-foreground border-border'
}

function getDensityBadgeClass(density: string): string {
  const d = (density ?? '').toLowerCase()
  if (d === 'low') return 'bg-accent/20 text-accent border-accent/30'
  if (d === 'moderate') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  if (d === 'high') return 'bg-destructive/20 text-destructive border-destructive/30'
  return 'bg-muted text-muted-foreground border-border'
}

// ---------- Helpers: Markdown Rendering ----------
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-xs leading-tight">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs leading-tight">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        return <p key={i} className="text-xs leading-tight">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ---------- Helper: Cycle Signal ----------
function cycleSignal(status: 'green' | 'red' | 'yellow'): 'green' | 'red' | 'yellow' {
  if (status === 'green') return 'yellow'
  if (status === 'yellow') return 'red'
  return 'green'
}

function getMaxCountdownForStatus(status: 'green' | 'red' | 'yellow'): number {
  if (status === 'green') return 15 + Math.floor(Math.random() * 20)
  if (status === 'red') return 20 + Math.floor(Math.random() * 25)
  return 3 + Math.floor(Math.random() * 3)
}

// ---------- Leaflet Marker Icon Creator ----------
function createSignalIcon(L: any, status: string, countdown: number): any {
  const color = status === 'green' ? 'hsl(160,70%,45%)' : status === 'red' ? 'hsl(0,75%,55%)' : 'hsl(35,85%,55%)'
  return L.divIcon({
    html: '<div style="position:relative;cursor:pointer;"><div style="width:22px;height:22px;border-radius:50%;background:' + color + ';border:2px solid hsl(220,25%,7%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ' + color + '80;"><span style="color:white;font-size:8px;font-weight:700;font-family:monospace;">' + countdown + 's</span></div></div>',
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

// ---------- Leaflet Popup Content Creator ----------
function createPopupContent(inter: Intersection): string {
  const color = getSignalColor(inter.status)
  const densityColor = inter.density >= 4 ? 'hsl(0,75%,55%)' : inter.density >= 3 ? 'hsl(35,85%,55%)' : 'hsl(160,70%,45%)'
  const densityBars = Array.from({ length: 5 }, (_, i) =>
    '<div style="width:16px;height:6px;border-radius:1px;background:' + (i < inter.density ? densityColor : 'hsl(220,15%,20%)') + ';"></div>'
  ).join('')

  return '<div style="background:hsl(220,22%,10%);color:hsl(220,15%,85%);padding:12px;border-radius:2px;min-width:200px;font-family:sans-serif;">' +
    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
    '<div style="width:10px;height:10px;border-radius:50%;background:' + color + ';"></div>' +
    '<strong style="font-size:12px;">' + inter.name + '</strong>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
    '<span style="font-size:10px;color:hsl(220,12%,55%);text-transform:uppercase;">Status</span>' +
    '<span style="font-size:10px;color:' + color + ';font-weight:600;">' + inter.status.toUpperCase() + '</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
    '<span style="font-size:10px;color:hsl(220,12%,55%);text-transform:uppercase;">Countdown</span>' +
    '<span style="font-size:13px;font-weight:700;color:' + color + ';">' + inter.countdown + 's</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
    '<span style="font-size:10px;color:hsl(220,12%,55%);text-transform:uppercase;">Avg Wait</span>' +
    '<span style="font-size:10px;">' + (inter.status === 'red' ? '~35s' : inter.status === 'yellow' ? '~5s' : '~0s') + '</span>' +
    '</div>' +
    '<div>' +
    '<span style="font-size:10px;color:hsl(220,12%,55%);text-transform:uppercase;">Density</span>' +
    '<div style="display:flex;gap:2px;margin-top:4px;">' + densityBars + '</div>' +
    '</div>' +
    '</div>'
}

// ---------- ErrorBoundary ----------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------- Route Card in Bottom Drawer ----------
function RouteCard({
  route,
  isActive,
  onClick,
}: {
  route: {
    route_name: string
    total_time_minutes: number
    distance_km: number
    signal_count: number
    estimated_signal_wait_minutes: number
    traffic_density: string
    is_recommended: boolean
    key_intersections: string[]
    notes: string
  }
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-64 text-left border rounded-sm p-3 transition-colors duration-150',
        isActive ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-foreground truncate mr-2">{route.route_name}</span>
        {route.is_recommended && (
          <Badge className="bg-accent text-accent-foreground text-[9px] px-1.5 py-0 rounded-sm flex-shrink-0">
            <FiCheck size={8} className="mr-0.5" /> Best
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <FiClock size={9} />
          <span>{route.total_time_minutes} min</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <FiNavigation size={9} />
          <span>{route.distance_km} km</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <FiActivity size={9} />
          <span>{route.signal_count} signals</span>
        </div>
        <div>
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 rounded-sm', getDensityBadgeClass(route.traffic_density))}>
            {route.traffic_density}
          </Badge>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight truncate">{route.notes}</p>
    </button>
  )
}

// ---------- Chat Message Bubble ----------
function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[85%] bg-primary text-primary-foreground px-3 py-2 rounded-sm text-xs leading-tight">
          {msg.content}
        </div>
      </div>
    )
  }

  const data = msg.data
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[90%] bg-card border border-border px-3 py-2 rounded-sm space-y-2">
        <div className="text-xs text-foreground leading-tight">{renderMarkdown(msg.content)}</div>

        {data && (data.congestion_level ?? '') !== '' && data.congestion_level !== 'Unknown' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Congestion:</span>
            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 rounded-sm', getCongestionBadgeClass(data.congestion_level))}>
              {data.congestion_level}
            </Badge>
          </div>
        )}

        {data && (data.best_departure_time ?? '') !== '' && (
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <FiClock size={10} />
            <span>{data.best_departure_time}</span>
          </div>
        )}

        {data && Array.isArray(data.route_recommendations) && data.route_recommendations.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Routes</span>
            {data.route_recommendations.map((r, i) => (
              <div key={i} className={cn('border rounded-sm p-2 text-[10px]', r.is_recommended ? 'border-accent bg-accent/5' : 'border-border')}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{r.route_name}</span>
                  <span className="text-muted-foreground">{r.total_time_minutes} min</span>
                </div>
                <span className="text-muted-foreground">{r.distance_km} km / {r.signal_count} signals</span>
              </div>
            ))}
          </div>
        )}

        {data && Array.isArray(data.signal_data) && data.signal_data.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Signals</span>
            <div className="flex flex-wrap gap-1">
              {data.signal_data.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded-sm">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSignalColor(s.current_phase) }} />
                  <span className="text-foreground">{s.intersection_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && Array.isArray(data.traffic_insights) && data.traffic_insights.length > 0 && (
          <div className="space-y-0.5 pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Insights</span>
            <ul className="space-y-0.5">
              {data.traffic_insights.map((insight, i) => (
                <li key={i} className="text-[10px] text-foreground flex items-start gap-1">
                  <FiInfo size={9} className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Loading Dots ----------
function LoadingDots() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-card border border-border px-4 py-2.5 rounded-sm flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Page() {
  // ----- State -----
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [intersections, setIntersections] = useState<Intersection[]>(INITIAL_INTERSECTIONS)
  const [routeResults, setRouteResults] = useState<TrafficIntelligenceResponse['route_recommendations']>([])
  const [showRouteDrawer, setShowRouteDrawer] = useState(false)
  const [drawerExpanded, setDrawerExpanded] = useState(false)
  const [activeRouteIdx, setActiveRouteIdx] = useState(0)
  const [sampleData, setSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [routeAnalyzing, setRouteAnalyzing] = useState(false)
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [showLayers, setShowLayers] = useState(false)
  const [layerSignals, setLayerSignals] = useState(true)
  const [layerDensity, setLayerDensity] = useState(true)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Record<number, any>>({})
  const densityCirclesRef = useRef<any[]>([])
  const routePolylineRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const intersectionsRef = useRef<Intersection[]>(INITIAL_INTERSECTIONS)

  // Keep intersectionsRef in sync
  useEffect(() => {
    intersectionsRef.current = intersections
  }, [intersections])

  // ----- Sample Data Toggle -----
  const displayMessages = sampleData && messages.length === 0 ? SAMPLE_MESSAGES : messages
  const displayRouteResults = sampleData && routeResults.length === 0 ? SAMPLE_ROUTE_RESULTS : routeResults
  const displayShowDrawer = sampleData && routeResults.length === 0 ? true : showRouteDrawer
  const displaySavedRoutes = sampleData && savedRoutes.length === 0 ? SAMPLE_ROUTES : savedRoutes

  // ----- Load Leaflet via CDN -----
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already loaded
    if ((window as any).L) {
      setLeafletLoaded(true)
      return
    }

    const CDN_SOURCES = [
      {
        css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      },
      {
        css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
        js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
      },
      {
        css: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
        js: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
      },
    ]

    let attempt = 0

    function tryLoadLeaflet() {
      if (attempt >= CDN_SOURCES.length) {
        console.error('Failed to load Leaflet from all CDN sources')
        return
      }

      const source = CDN_SOURCES[attempt]

      // Remove previous attempts
      document.getElementById('leaflet-css')?.remove()
      document.getElementById('leaflet-js')?.remove()

      // Load CSS first
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = source.css
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)

      // Load JS after a small delay to let CSS start loading
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = source.js
      script.crossOrigin = 'anonymous'
      script.onload = () => {
        if ((window as any).L) {
          setLeafletLoaded(true)
        } else {
          attempt++
          tryLoadLeaflet()
        }
      }
      script.onerror = () => {
        attempt++
        tryLoadLeaflet()
      }
      document.body.appendChild(script)
    }

    tryLoadLeaflet()
  }, [])

  // ----- Initialize Leaflet Map -----
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    if (!L) return

    // Ensure container has dimensions before initializing
    const container = mapContainerRef.current
    if (container.clientHeight === 0 || container.clientWidth === 0) {
      // Retry after a frame if container not ready
      const raf = requestAnimationFrame(() => {
        setLeafletLoaded((v) => v) // trigger re-render
      })
      return () => cancelAnimationFrame(raf)
    }

    const map = L.map(container, {
      center: [12.9716, 77.5946],
      zoom: 13,
      zoomControl: false,
    })

    // Try multiple tile sources for reliability
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: 'abcd',
    })
    tileLayer.on('tileerror', () => {
      // Fallback to standard OSM tiles if CartoDB fails
      tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    })
    tileLayer.addTo(map)

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    mapInstanceRef.current = map

    // Force Leaflet to recalculate size after mount
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
    setTimeout(() => {
      map.invalidateSize()
    }, 500)

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 14)
          setTimeout(() => map.invalidateSize(), 200)
          const userIcon = L.divIcon({
            html: '<div style="width:14px;height:14px;background:hsl(220,80%,55%);border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>',
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
          userMarkerRef.current = L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon }).addTo(map)
            .bindPopup('<div style="background:hsl(220,22%,10%);color:hsl(220,15%,85%);padding:8px;font-size:11px;font-family:sans-serif;">Your location</div>')
        },
        () => {
          // Geolocation denied, stay on Bangalore center
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    // Add initial signal markers
    const currentIntersections = intersectionsRef.current
    currentIntersections.forEach((inter) => {
      const icon = createSignalIcon(L, inter.status, inter.countdown)
      const marker = L.marker([inter.lat, inter.lng], { icon }).addTo(map)
      marker.bindPopup(createPopupContent(inter), { className: 'traffic-popup', maxWidth: 250 })
      markersRef.current[inter.id] = marker
    })

    // Add density circles for high-density intersections
    currentIntersections.filter((i) => i.density >= 4).forEach((inter) => {
      const circle = L.circle([inter.lat, inter.lng], {
        radius: 300,
        color: inter.density >= 5 ? 'hsla(0, 75%, 55%, 0.15)' : 'hsla(35, 85%, 55%, 0.1)',
        fillColor: inter.density >= 5 ? 'hsla(0, 75%, 55%, 0.08)' : 'hsla(35, 85%, 55%, 0.05)',
        fillOpacity: 1,
        weight: 1,
      }).addTo(map)
      densityCirclesRef.current.push(circle)
    })

    // Handle window resize
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      map.remove()
      mapInstanceRef.current = null
      markersRef.current = {}
      densityCirclesRef.current = []
    }
  }, [leafletLoaded])

  // ----- Signal Countdown Timer + Update Leaflet Markers -----
  useEffect(() => {
    const interval = setInterval(() => {
      setIntersections((prev) =>
        prev.map((inter) => {
          if (inter.countdown <= 1) {
            const newStatus = cycleSignal(inter.status)
            return { ...inter, status: newStatus, countdown: getMaxCountdownForStatus(newStatus) }
          }
          return { ...inter, countdown: inter.countdown - 1 }
        })
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ----- Update Leaflet marker icons when intersections change -----
  useEffect(() => {
    const L = (window as any).L
    if (!L || !mapInstanceRef.current) return

    intersections.forEach((inter) => {
      const marker = markersRef.current[inter.id]
      if (marker) {
        const newIcon = createSignalIcon(L, inter.status, inter.countdown)
        marker.setIcon(newIcon)
        marker.setPopupContent(createPopupContent(inter))
      }
    })
  }, [intersections])

  // ----- Toggle signal marker visibility -----
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    Object.values(markersRef.current).forEach((marker: any) => {
      if (layerSignals) {
        if (!map.hasLayer(marker)) map.addLayer(marker)
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker)
      }
    })
  }, [layerSignals])

  // ----- Toggle density circle visibility -----
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    densityCirclesRef.current.forEach((circle: any) => {
      if (layerDensity) {
        if (!map.hasLayer(circle)) map.addLayer(circle)
      } else {
        if (map.hasLayer(circle)) map.removeLayer(circle)
      }
    })
  }, [layerDensity])

  // ----- Draw route polyline when route results change -----
  useEffect(() => {
    const L = (window as any).L
    const map = mapInstanceRef.current
    if (!L || !map) return

    // Remove old polyline
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current)
      routePolylineRef.current = null
    }

    const activeRoute = displayRouteResults[activeRouteIdx]
    if (!displayShowDrawer || !activeRoute || !Array.isArray(activeRoute?.key_intersections)) return

    const points: [number, number][] = []
    activeRoute.key_intersections.forEach((name: string) => {
      const found = intersections.find((i) => i.name === name)
      if (found) {
        points.push([found.lat, found.lng])
      }
    })

    if (points.length >= 2) {
      routePolylineRef.current = L.polyline(points, {
        color: 'hsl(220,80%,55%)',
        weight: 4,
        dashArray: '10, 6',
        opacity: 0.8,
      }).addTo(map)

      // Fit map to show the route
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [60, 60] })
    }
  }, [displayRouteResults, activeRouteIdx, displayShowDrawer, intersections])

  // ----- Invalidate map size when chat panel toggles -----
  useEffect(() => {
    const map = mapInstanceRef.current
    if (map) {
      // Delay to let CSS transition finish
      const t = setTimeout(() => map.invalidateSize(), 350)
      return () => clearTimeout(t)
    }
  }, [chatOpen])

  // ----- Auto-scroll chat -----
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [displayMessages, isLoading])

  // ----- My Location button handler -----
  const handleMyLocation = useCallback(() => {
    const map = mapInstanceRef.current
    const L = (window as any).L
    if (!map || !L) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 15)
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude])
          } else {
            const userIcon = L.divIcon({
              html: '<div style="width:14px;height:14px;background:hsl(220,80%,55%);border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>',
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })
            userMarkerRef.current = L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon }).addTo(map)
              .bindPopup('<div style="background:hsl(220,22%,10%);color:hsl(220,15%,85%);padding:8px;font-size:11px;font-family:sans-serif;">Your location</div>')
          }
        },
        () => {
          // Geolocation denied - fly to Bangalore center
          map.flyTo([12.9716, 77.5946], 14)
        },
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // ----- Agent Call -----
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return
    setMessages((prev) => [...prev, { role: 'user', content: message, data: null }])
    setIsLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success) {
        const d = result?.response?.result
        const parsed: TrafficIntelligenceResponse = {
          analysis_type: d?.analysis_type ?? 'general',
          summary: d?.summary ?? '',
          route_recommendations: Array.isArray(d?.route_recommendations) ? d.route_recommendations : [],
          signal_data: Array.isArray(d?.signal_data) ? d.signal_data : [],
          traffic_insights: Array.isArray(d?.traffic_insights) ? d.traffic_insights : [],
          congestion_level: d?.congestion_level ?? 'Unknown',
          best_departure_time: d?.best_departure_time ?? '',
        }
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: parsed.summary || 'Response received.', data: parsed },
        ])
        if (parsed.route_recommendations.length > 0) {
          setRouteResults(parsed.route_recommendations)
          setShowRouteDrawer(true)
          const bestIdx = parsed.route_recommendations.findIndex((r) => r.is_recommended)
          setActiveRouteIdx(bestIdx >= 0 ? bestIdx : 0)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: result?.error ?? 'Failed to get response.', data: null },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: 'Network error. Please try again.', data: null },
      ])
    }
    setIsLoading(false)
    setActiveAgentId(null)
    setRouteAnalyzing(false)
  }, [])

  // ----- Route Analysis -----
  const handleRouteAnalysis = useCallback(async () => {
    if (!origin.trim() || !destination.trim()) return
    setRouteAnalyzing(true)
    setChatOpen(true)
    const message = `Analyze the best route from ${origin} to ${destination} in Bangalore. Provide route recommendations with signal timing predictions, traffic density at key intersections, and estimated travel times. Use these Bangalore intersections as reference points: MG Road & Brigade Road, Silk Board Junction, Marathahalli Bridge, Hebbal Flyover, KR Puram Junction, Koramangala BDA Complex, Indiranagar 100ft Road, Jayanagar 4th Block, Banashankari Circle, Yeshwanthpur Circle, Majestic Bus Station, Electronic City Phase 1, Whitefield Main Road, JP Nagar 6th Phase, Yelahanka Junction, HSR Layout Sector 1, BTM Layout 2nd Stage, Rajajinagar Junction.`
    await handleSendMessage(message)
  }, [origin, destination, handleSendMessage])

  // ----- Chat Submit -----
  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim() || isLoading) return
    const msg = chatInput
    setChatInput('')
    handleSendMessage(msg)
  }, [chatInput, isLoading, handleSendMessage])

  // ----- Quick Query -----
  const handleQuickQuery = useCallback((q: string) => {
    if (isLoading) return
    handleSendMessage(q)
  }, [isLoading, handleSendMessage])

  // ----- Save Route -----
  const handleSaveRoute = useCallback(() => {
    if (!origin.trim() || !destination.trim()) return
    const newRoute: SavedRoute = {
      id: String(Date.now()),
      name: `${origin} to ${destination}`,
      origin,
      destination,
    }
    setSavedRoutes((prev) => [...prev, newRoute])
  }, [origin, destination])

  // ----- Load Saved Route -----
  const handleLoadRoute = useCallback((route: SavedRoute) => {
    setOrigin(route.origin)
    setDestination(route.destination)
    setSavedOpen(false)
  }, [])

  // ----- Swap Locations -----
  const swapLocations = useCallback(() => {
    const o = origin
    const d = destination
    setOrigin(d)
    setDestination(o)
  }, [origin, destination])

  // ----- Route info for timeline -----
  const activeRoute = displayRouteResults[activeRouteIdx]

  const QUICK_QUERIES = [
    'Best route from Koramangala to Hebbal?',
    'Silk Board Junction congestion?',
    'Signal timing on MG Road?',
    'Traffic density near Whitefield?',
  ]

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans tracking-tight">
        {/* ========== TOP NAV BAR ========== */}
        <header className="flex-shrink-0 h-12 border-b border-border bg-card flex items-center px-3 gap-3 z-50">
          {/* Logo */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FiActivity className="text-primary" size={18} />
            <span className="text-sm font-bold tracking-tight text-foreground">TrafficPulse</span>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Route Analysis Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <FiMapPin size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-accent" />
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Enter origin (e.g. Koramangala)..."
                className="h-7 text-xs pl-7 bg-secondary border-border rounded-sm"
              />
            </div>
            <button
              onClick={swapLocations}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Swap"
            >
              <FiRepeat size={13} />
            </button>
            <div className="relative flex-1">
              <FiMapPin size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-destructive" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination (e.g. Hebbal)..."
                className="h-7 text-xs pl-7 bg-secondary border-border rounded-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleRouteAnalysis}
              disabled={!origin.trim() || !destination.trim() || isLoading}
              className="h-7 text-[10px] px-3 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
            >
              <FiNavigation size={10} />
              Analyze
            </Button>
            {origin.trim() && destination.trim() && (
              <button
                onClick={handleSaveRoute}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-accent transition-colors"
                title="Save Route"
              >
                <FiBookmark size={13} />
              </button>
            )}
          </div>

          <div className="flex-1" />

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 mr-2">
              <Label htmlFor="sample-toggle" className="text-[10px] text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleData}
                onCheckedChange={setSampleData}
                className="scale-75"
              />
            </div>
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={cn('p-1.5 rounded-sm transition-colors', showLayers ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Layers"
            >
              <FiLayers size={14} />
            </button>
            <button
              onClick={() => setSavedOpen(!savedOpen)}
              className={cn('p-1.5 rounded-sm transition-colors', savedOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Saved Routes"
            >
              <FiBookmark size={14} />
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={cn('p-1.5 rounded-sm transition-colors', chatOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
              title="Chat"
            >
              <FiMessageSquare size={14} />
            </button>
          </div>
        </header>

        {/* ========== MAIN CONTENT ========== */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* ---------- Saved Routes Slide-out (Left) ---------- */}
          <div
            className={cn(
              'absolute top-0 left-0 h-full w-64 bg-card border-r border-border z-30 transition-transform duration-300',
              savedOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                <FiBookmark size={13} className="text-primary" />
                <span className="text-xs font-semibold">Saved Routes</span>
              </div>
              <button onClick={() => setSavedOpen(false)} className="text-muted-foreground hover:text-foreground">
                <FiX size={14} />
              </button>
            </div>
            <ScrollArea className="h-[calc(100%-44px)]">
              <div className="p-3 space-y-2">
                {displaySavedRoutes.length === 0 ? (
                  <div className="text-center py-8">
                    <FiBookmark size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Save your first route</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Enter origin & destination, then click bookmark</p>
                  </div>
                ) : (
                  displaySavedRoutes.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => handleLoadRoute(route)}
                      className="w-full text-left border border-border rounded-sm p-2.5 hover:border-primary/40 transition-colors bg-secondary/50"
                    >
                      <p className="text-xs font-semibold text-foreground truncate">{route.name}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <FiMapPin size={8} className="text-accent" />
                        <span className="truncate">{route.origin}</span>
                        <FiArrowRight size={8} />
                        <FiMapPin size={8} className="text-destructive" />
                        <span className="truncate">{route.destination}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ---------- MAP AREA (Real Leaflet Map) ---------- */}
          <div className="flex-1 relative overflow-hidden bg-background">
            {/* Leaflet Map Container - absolute positioning ensures it always has dimensions */}
            <div
              id="map-container"
              ref={mapContainerRef}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
            />

            {/* Loading overlay while Leaflet loads */}
            {!leafletLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                  <FiActivity size={28} className="text-primary animate-pulse" />
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Loading Bangalore map...</span>
                  <span className="text-[10px] text-muted-foreground/60">Connecting to map tile servers</span>
                </div>
              </div>
            )}

            {/* Route Analyzing Overlay */}
            {routeAnalyzing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
                <div className="bg-card border border-border rounded-sm px-5 py-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-foreground">Analyzing route...</span>
                </div>
              </div>
            )}

            {/* Floating Controls - Bottom Right */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              {!chatOpen && (
                <button
                  onClick={() => setChatOpen(true)}
                  className="w-10 h-10 bg-primary text-primary-foreground rounded-sm flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
                  title="Open Chat"
                >
                  <FiMessageSquare size={16} />
                </button>
              )}
              <button
                onClick={handleMyLocation}
                className="w-10 h-10 bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="My Location"
              >
                <FiCrosshair size={16} />
              </button>
            </div>

            {/* Layers Panel - Top Right of map */}
            {showLayers && (
              <div className="absolute top-3 right-3 z-20 w-48">
                <Card className="border border-border bg-card shadow-none">
                  <CardHeader className="p-2.5 pb-1.5">
                    <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Map Layers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2.5 pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FiMapPin size={10} className="text-muted-foreground" />
                        <span className="text-[10px]">Signal Markers</span>
                      </div>
                      <Switch checked={layerSignals} onCheckedChange={setLayerSignals} className="scale-[0.6]" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FiActivity size={10} className="text-muted-foreground" />
                        <span className="text-[10px]">Density Zones</span>
                      </div>
                      <Switch checked={layerDensity} onCheckedChange={setLayerDensity} className="scale-[0.6]" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Signal Legend - Bottom Left of map (offset for zoom control) */}
            <div className="absolute bottom-4 left-16 z-20 flex items-center gap-3 bg-card/90 border border-border rounded-sm px-3 py-1.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(160, 70%, 45%)' }} />
                <span className="text-[9px] text-muted-foreground">Green</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(35, 85%, 55%)' }} />
                <span className="text-[9px] text-muted-foreground">Yellow</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(0, 75%, 55%)' }} />
                <span className="text-[9px] text-muted-foreground">Red</span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[9px] text-muted-foreground">{intersections.filter((i) => i.status === 'green').length} active</span>
            </div>
          </div>

          {/* ---------- CHAT PANEL (Right) ---------- */}
          <div
            className={cn(
              'flex-shrink-0 h-full border-l border-border bg-card flex flex-col transition-all duration-300 overflow-hidden',
              chatOpen ? 'w-80' : 'w-0 border-l-0'
            )}
          >
            {chatOpen && (
              <>
                {/* Chat Header */}
                <div className="flex-shrink-0 h-10 border-b border-border flex items-center justify-between px-3">
                  <div className="flex items-center gap-1.5">
                    <FiZap size={12} className="text-primary" />
                    <span className="text-xs font-semibold">TrafficPulse AI</span>
                    {activeAgentId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    )}
                  </div>
                  <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <FiX size={14} />
                  </button>
                </div>

                {/* Chat Messages */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3">
                  {displayMessages.length === 0 && !isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center mb-3">
                        <FiZap size={18} className="text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">TrafficPulse AI</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-4">
                        Ask about Bangalore traffic conditions, route analysis, signal timing at major intersections, or congestion patterns.
                      </p>
                      <div className="w-full space-y-1.5">
                        {QUICK_QUERIES.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleQuickQuery(q)}
                            className="w-full text-left text-[10px] px-2.5 py-1.5 bg-secondary border border-border rounded-sm text-foreground hover:border-primary/40 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {displayMessages.map((msg, i) => (
                        <ChatBubble key={i} msg={msg} />
                      ))}
                      {isLoading && <LoadingDots />}
                    </>
                  )}
                </div>

                {/* Quick Queries (when messages exist) */}
                {displayMessages.length > 0 && !isLoading && (
                  <div className="flex-shrink-0 px-3 pb-1.5 flex flex-wrap gap-1">
                    {QUICK_QUERIES.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuickQuery(q)}
                        className="text-[9px] px-2 py-0.5 bg-secondary border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat Input */}
                <div className="flex-shrink-0 border-t border-border p-2 flex gap-1.5">
                  <Input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit() } }}
                    placeholder="Ask about Bangalore traffic..."
                    className="h-7 text-xs bg-secondary border-border rounded-sm flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    onClick={handleChatSubmit}
                    disabled={isLoading || !chatInput.trim()}
                    className="h-7 w-7 p-0 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <FiSend size={12} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========== BOTTOM ROUTE DRAWER ========== */}
        {displayShowDrawer && displayRouteResults.length > 0 && (
          <div
            className={cn(
              'flex-shrink-0 border-t border-border bg-card transition-all duration-300 overflow-hidden',
              drawerExpanded ? 'h-64' : 'h-28'
            )}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-8 border-b border-border">
              <div className="flex items-center gap-2">
                <FiNavigation size={11} className="text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Route Analysis</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-sm border-primary/30 text-primary">
                  {displayRouteResults.length} routes
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDrawerExpanded(!drawerExpanded)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title={drawerExpanded ? 'Collapse' : 'Expand'}
                >
                  {drawerExpanded ? <FiChevronDown size={13} /> : <FiChevronUp size={13} />}
                </button>
                <button
                  onClick={() => { setShowRouteDrawer(false); setRouteResults([]) }}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <FiX size={13} />
                </button>
              </div>
            </div>

            {/* Route Cards */}
            <div className="px-4 py-2 overflow-x-auto">
              <div className="flex gap-3">
                {displayRouteResults.map((route, idx) => (
                  <RouteCard
                    key={idx}
                    route={route}
                    isActive={activeRouteIdx === idx}
                    onClick={() => setActiveRouteIdx(idx)}
                  />
                ))}
              </div>
            </div>

            {/* Signal Timeline (expanded) */}
            {drawerExpanded && activeRoute && (
              <div className="px-4 py-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Signal Timeline</span>
                <div className="flex items-center gap-1 mt-2 overflow-x-auto">
                  {Array.isArray(activeRoute?.key_intersections) && activeRoute.key_intersections.map((name: string, idx: number) => {
                    const inter = intersections.find((i) => i.name === name)
                    const color = inter ? getSignalColor(inter.status) : 'hsl(220, 12%, 55%)'
                    return (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center" style={{ backgroundColor: color }}>
                            <span className="text-[6px] font-bold text-white">{inter?.countdown ?? '?'}</span>
                          </div>
                          <span className="text-[7px] text-muted-foreground mt-0.5 max-w-[80px] text-center truncate">{name}</span>
                        </div>
                        {idx < (activeRoute?.key_intersections?.length ?? 0) - 1 && (
                          <div className="w-8 h-px bg-border flex-shrink-0" />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
                {activeRoute?.notes && (
                  <p className="text-[10px] text-muted-foreground mt-2">{activeRoute.notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== AGENT STATUS BAR ========== */}
        <footer className="flex-shrink-0 h-6 bg-card border-t border-border flex items-center px-3 justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', activeAgentId ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40')} />
            <span className="text-[9px] text-muted-foreground">
              Traffic Intelligence Agent
            </span>
            {activeAgentId && (
              <span className="text-[9px] text-accent">Processing...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-muted-foreground">
              {intersections.filter((i) => i.status === 'green').length} green / {intersections.filter((i) => i.status === 'red').length} red / {intersections.filter((i) => i.status === 'yellow').length} yellow
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              Bangalore | 18 junctions
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              Agent: {AGENT_ID.slice(0, 8)}...
            </span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
