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
  FiGrid,
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
  x: number
  y: number
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

// ---------- Intersection Data ----------
const INITIAL_INTERSECTIONS: Intersection[] = [
  { id: 1, name: 'Main St & 1st Ave', x: 20, y: 25, status: 'green', countdown: 12, density: 2 },
  { id: 2, name: 'Broadway & 5th St', x: 35, y: 40, status: 'red', countdown: 28, density: 4 },
  { id: 3, name: 'Market St & Park Ave', x: 50, y: 15, status: 'green', countdown: 8, density: 1 },
  { id: 4, name: 'Oak Dr & Lake Blvd', x: 65, y: 55, status: 'yellow', countdown: 3, density: 3 },
  { id: 5, name: 'Pine St & River Rd', x: 25, y: 60, status: 'red', countdown: 35, density: 5 },
  { id: 6, name: 'Elm St & College Ave', x: 45, y: 45, status: 'green', countdown: 18, density: 2 },
  { id: 7, name: 'Cedar Ln & Hill St', x: 70, y: 30, status: 'green', countdown: 6, density: 1 },
  { id: 8, name: 'Maple Ave & Center St', x: 15, y: 45, status: 'red', countdown: 22, density: 4 },
  { id: 9, name: 'Walnut St & 3rd Ave', x: 55, y: 70, status: 'yellow', countdown: 2, density: 3 },
  { id: 10, name: 'Birch Rd & Summit Dr', x: 80, y: 20, status: 'green', countdown: 15, density: 1 },
  { id: 11, name: 'Spruce Way & Valley Rd', x: 40, y: 75, status: 'red', countdown: 30, density: 5 },
  { id: 12, name: 'Ash St & Garden Ln', x: 75, y: 65, status: 'green', countdown: 10, density: 2 },
]

// ---------- Sample Data ----------
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: 'Analyze the best route from Main St to Oak Dr',
    data: null,
  },
  {
    role: 'agent',
    content: 'Based on current traffic conditions, I recommend taking the Market St corridor. Here are your route options:',
    data: {
      analysis_type: 'route_analysis',
      summary: 'Based on current traffic conditions, I recommend taking the Market St corridor via Park Ave. Traffic density is low along this route with favorable signal timing. Avoid Broadway & 5th St due to heavy congestion.',
      route_recommendations: [
        {
          route_name: 'Market St Express',
          total_time_minutes: 14,
          distance_km: 5.2,
          signal_count: 4,
          estimated_signal_wait_minutes: 3,
          traffic_density: 'Low',
          is_recommended: true,
          key_intersections: ['Market St & Park Ave', 'Cedar Ln & Hill St'],
          notes: 'Fastest route with minimal signal delays',
        },
        {
          route_name: 'Broadway Central',
          total_time_minutes: 22,
          distance_km: 4.8,
          signal_count: 6,
          estimated_signal_wait_minutes: 8,
          traffic_density: 'High',
          is_recommended: false,
          key_intersections: ['Broadway & 5th St', 'Elm St & College Ave'],
          notes: 'Heavy congestion near Broadway intersection',
        },
        {
          route_name: 'Pine River Route',
          total_time_minutes: 18,
          distance_km: 6.1,
          signal_count: 3,
          estimated_signal_wait_minutes: 4,
          traffic_density: 'Moderate',
          is_recommended: false,
          key_intersections: ['Pine St & River Rd', 'Walnut St & 3rd Ave'],
          notes: 'Longer distance but fewer signals',
        },
      ],
      signal_data: [
        { intersection_name: 'Market St & Park Ave', current_phase: 'green', wait_time_seconds: 8, density_level: 'Low', notes: 'Favorable timing' },
        { intersection_name: 'Broadway & 5th St', current_phase: 'red', wait_time_seconds: 28, density_level: 'High', notes: 'Avoid if possible' },
      ],
      traffic_insights: [
        'Market St corridor has 60% less traffic than Broadway during this hour',
        'Signal synchronization active on Market St - green wave pattern',
        'Construction on Elm St may cause minor delays after 5 PM',
        'Pine River route has school zone speed limit until 4 PM',
      ],
      congestion_level: 'Moderate',
      best_departure_time: 'Leave within the next 10 minutes for optimal conditions',
    },
  },
]

const SAMPLE_ROUTES: SavedRoute[] = [
  { id: '1', name: 'Morning Commute', origin: 'Home - Main St', destination: 'Office - Oak Dr' },
  { id: '2', name: 'Grocery Run', origin: 'Home - Main St', destination: 'Market - Elm St' },
  { id: '3', name: 'Weekend Park', origin: 'Home - Main St', destination: 'Riverside Park' },
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

function getMaxCountdown(status: 'green' | 'red' | 'yellow'): number {
  if (status === 'green') return 15 + Math.floor(Math.random() * 20)
  if (status === 'red') return 20 + Math.floor(Math.random() * 25)
  return 3 + Math.floor(Math.random() * 3)
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

// ============================================================
// INLINE COMPONENTS (defined above default export)
// ============================================================

// ---------- Signal Marker on Map ----------
function SignalMarker({
  intersection,
  isSelected,
  onClick,
}: {
  intersection: Intersection
  isSelected: boolean
  onClick: () => void
}) {
  const color = getSignalColor(intersection.status)
  return (
    <button
      onClick={onClick}
      className="absolute flex flex-col items-center group"
      style={{
        left: `${intersection.x}%`,
        top: `${intersection.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 30 : 10,
      }}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 border-background flex items-center justify-center transition-transform duration-200',
          'group-hover:scale-125',
          isSelected && 'scale-125 ring-2 ring-primary ring-offset-1 ring-offset-background'
        )}
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
      >
        <span className="text-[7px] font-bold text-white leading-none">{intersection.countdown}s</span>
      </div>
    </button>
  )
}

// ---------- Signal Detail Popup ----------
function SignalPopup({
  intersection,
  onClose,
}: {
  intersection: Intersection
  onClose: () => void
}) {
  const color = getSignalColor(intersection.status)
  const densityIcons = Array.from({ length: 5 }, (_, i) => i)
  return (
    <div
      className="absolute z-40 w-56"
      style={{
        left: `${intersection.x}%`,
        top: `${intersection.y}%`,
        transform: intersection.x > 60 ? 'translate(-100%, -110%)' : 'translate(10%, -110%)',
      }}
    >
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="p-2.5 pb-1.5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <CardTitle className="text-xs font-semibold leading-tight">{intersection.name}</CardTitle>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <FiX size={12} />
          </button>
        </CardHeader>
        <CardContent className="p-2.5 pt-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border" style={{ borderColor: color, color: color }}>
              {intersection.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Countdown</span>
            <span className="text-sm font-bold tabular-nums" style={{ color }}>{intersection.countdown}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Wait</span>
            <span className="text-xs text-foreground">{intersection.status === 'red' ? '~30s' : intersection.status === 'yellow' ? '~5s' : '~0s'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vehicle Density</span>
            <div className="flex gap-1 mt-1">
              {densityIcons.map((idx) => (
                <FiTruck
                  key={idx}
                  size={12}
                  className={idx < intersection.density ? 'text-foreground' : 'text-muted-foreground/30'}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null)
  const [routeResults, setRouteResults] = useState<TrafficIntelligenceResponse['route_recommendations']>([])
  const [showRouteDrawer, setShowRouteDrawer] = useState(false)
  const [drawerExpanded, setDrawerExpanded] = useState(false)
  const [activeRouteIdx, setActiveRouteIdx] = useState(0)
  const [sampleData, setSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [routeAnalyzing, setRouteAnalyzing] = useState(false)
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [showLayers, setShowLayers] = useState(false)
  const [layerGrid, setLayerGrid] = useState(true)
  const [layerDensity, setLayerDensity] = useState(true)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // ----- Sample Data Toggle -----
  const displayMessages = sampleData && messages.length === 0 ? SAMPLE_MESSAGES : messages
  const displayRouteResults = sampleData && routeResults.length === 0 ? SAMPLE_ROUTE_RESULTS : routeResults
  const displayShowDrawer = sampleData && routeResults.length === 0 ? true : showRouteDrawer
  const displaySavedRoutes = sampleData && savedRoutes.length === 0 ? SAMPLE_ROUTES : savedRoutes

  // ----- Signal Countdown Timer -----
  useEffect(() => {
    const interval = setInterval(() => {
      setIntersections((prev) =>
        prev.map((inter) => {
          if (inter.countdown <= 1) {
            const newStatus = cycleSignal(inter.status)
            return { ...inter, status: newStatus, countdown: getMaxCountdown(newStatus) }
          }
          return { ...inter, countdown: inter.countdown - 1 }
        })
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // ----- Auto-scroll chat -----
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [displayMessages, isLoading])

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
          setActiveRouteIdx(parsed.route_recommendations.findIndex((r) => r.is_recommended) ?? 0)
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
    const message = `Analyze the best route from ${origin} to ${destination}. Provide route recommendations with signal timing predictions, traffic density at key intersections, and estimated travel times.`
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

  // ----- Route line SVG path from intersection coords -----
  const activeRoute = displayRouteResults[activeRouteIdx]
  const routePathPoints = activeRoute && Array.isArray(activeRoute.key_intersections)
    ? activeRoute.key_intersections
        .map((name) => intersections.find((i) => i.name === name))
        .filter(Boolean)
        .map((i) => i as Intersection)
    : []

  const QUICK_QUERIES = ['Best route home?', 'Congestion ahead?', 'Signal timing?', 'Traffic density?']

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
                placeholder="Enter origin..."
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
                placeholder="Enter destination..."
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

          {/* ---------- MAP AREA ---------- */}
          <div className="flex-1 relative overflow-hidden bg-background">
            {/* Grid Lines (Streets) */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Horizontal streets */}
              {layerGrid && [15, 25, 40, 45, 55, 60, 70, 75].map((y) => (
                <line
                  key={`h-${y}`}
                  x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
                  stroke="hsl(220, 15%, 14%)" strokeWidth="1"
                />
              ))}
              {/* Vertical streets */}
              {layerGrid && [15, 20, 25, 35, 40, 45, 50, 55, 65, 70, 75, 80].map((x) => (
                <line
                  key={`v-${x}`}
                  x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%"
                  stroke="hsl(220, 15%, 14%)" strokeWidth="1"
                />
              ))}
              {/* Major roads - slightly brighter */}
              <line x1="0%" y1="40%" x2="100%" y2="40%" stroke="hsl(220, 15%, 17%)" strokeWidth="2" />
              <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="hsl(220, 15%, 17%)" strokeWidth="2" />
              <line x1="0%" y1="25%" x2="100%" y2="25%" stroke="hsl(220, 15%, 16%)" strokeWidth="1.5" />
              <line x1="35%" y1="0%" x2="35%" y2="100%" stroke="hsl(220, 15%, 16%)" strokeWidth="1.5" />

              {/* Density heat zones */}
              {layerDensity && intersections.filter((i) => i.density >= 4).map((i) => (
                <circle
                  key={`density-${i.id}`}
                  cx={`${i.x}%`} cy={`${i.y}%`}
                  r="30"
                  fill={i.density >= 5 ? 'hsla(0, 75%, 55%, 0.06)' : 'hsla(35, 85%, 55%, 0.05)'}
                />
              ))}

              {/* Route line when route analysis active */}
              {displayShowDrawer && routePathPoints.length >= 2 && (
                <polyline
                  points={routePathPoints.map((p) => `${(p.x / 100) * 1000},${(p.y / 100) * 600}`).join(' ')}
                  fill="none"
                  stroke="hsl(220, 80%, 55%)"
                  strokeWidth="3"
                  strokeDasharray="8 4"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              )}
            </svg>

            {/* Block labels on major roads */}
            <div className="absolute text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-widest" style={{ left: '2%', top: '38%' }}>Main Corridor</div>
            <div className="absolute text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-widest" style={{ left: '2%', top: '23%' }}>Market District</div>
            <div className="absolute text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-widest" style={{ left: '48%', top: '3%', transform: 'rotate(90deg)', transformOrigin: 'left' }}>Central Ave</div>

            {/* Signal Markers */}
            {intersections.map((inter) => (
              <SignalMarker
                key={inter.id}
                intersection={inter}
                isSelected={selectedMarker === inter.id}
                onClick={() => setSelectedMarker(selectedMarker === inter.id ? null : inter.id)}
              />
            ))}

            {/* Signal Popup */}
            {selectedMarker !== null && (
              <SignalPopup
                intersection={intersections.find((i) => i.id === selectedMarker) ?? intersections[0]}
                onClose={() => setSelectedMarker(null)}
              />
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
                className="w-10 h-10 bg-card border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="My Location"
              >
                <FiCrosshair size={16} />
              </button>
            </div>

            {/* Layers Panel - Top Right of map */}
            {showLayers && (
              <div className="absolute top-3 right-3 z-20 w-44">
                <Card className="border border-border bg-card shadow-none">
                  <CardHeader className="p-2.5 pb-1.5">
                    <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Map Layers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2.5 pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FiGrid size={10} className="text-muted-foreground" />
                        <span className="text-[10px]">Street Grid</span>
                      </div>
                      <Switch checked={layerGrid} onCheckedChange={setLayerGrid} className="scale-[0.6]" />
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

            {/* Signal Legend - Bottom Left of map */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-card/90 border border-border rounded-sm px-3 py-1.5">
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
                        Ask about traffic conditions, route analysis, signal timing, or congestion patterns. I have real-time web search.
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
                    placeholder="Ask about traffic..."
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
                  {Array.isArray(activeRoute.key_intersections) && activeRoute.key_intersections.map((name, idx) => {
                    const inter = intersections.find((i) => i.name === name)
                    const color = inter ? getSignalColor(inter.status) : 'hsl(220, 12%, 55%)'
                    return (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center" style={{ backgroundColor: color }}>
                            <span className="text-[6px] font-bold text-white">{inter?.countdown ?? '?'}</span>
                          </div>
                          <span className="text-[7px] text-muted-foreground mt-0.5 max-w-[60px] text-center truncate">{name}</span>
                        </div>
                        {idx < (activeRoute.key_intersections?.length ?? 0) - 1 && (
                          <div className="w-8 h-px bg-border flex-shrink-0" />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
                {activeRoute.notes && (
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
              Agent: {AGENT_ID.slice(0, 8)}...
            </span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}
