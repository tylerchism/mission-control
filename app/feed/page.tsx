'use client'
import { useState, useEffect, useRef } from 'react'
import { formatRelativeTime } from '@/lib/utils'

type ActivityEvent = {
  id: string; agent: string; action: string;
  action_type: string; payload: Record<string, unknown>; created_at: string;
}

const AGENT_EMOJI: Record<string, string> = { dex: '🎯', sage: '🌿' }
const AGENT_COLORS: Record<string, string> = {
  dex: 'text-blue-400',
  sage: 'text-green-400',
}

export default function FeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Initial load
  useEffect(() => {
    fetch('/api/agent-activity?limit=50')
      .then(r => r.json())
      .then(setEvents)
  }, [])

  // SSE connection
  useEffect(() => {
    const es = new EventSource('/api/feed/stream')

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'connected') return
        setEvents(prev => [data, ...prev])
      } catch {}
    }

    return () => es.close()
  }, [])

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Agent Feed</h1>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-[#444455]'}`} />
          <span className="text-xs text-[#6b6b80]">{connected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📡</div>
          <p className="text-[#555565]">No agent activity yet.</p>
          <p className="text-[#333344] text-sm mt-1">Events appear here when Dex or Sage take actions.</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {events.map(ev => (
            <div
              key={ev.id}
              className="bg-[#111118] border border-[#1e1e2e] rounded-lg px-4 py-3 hover:border-[#2a2a3e] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{AGENT_EMOJI[ev.agent] || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${AGENT_COLORS[ev.agent] || 'text-white'}`}>
                    {ev.agent}
                  </span>
                  <span className="text-sm text-[#c0c0d0] ml-2">{ev.action}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#444455]">{formatRelativeTime(ev.created_at)}</span>
                  <button
                    onClick={() => toggleExpand(ev.id)}
                    className="text-xs text-[#333344] hover:text-[#9090a0] transition-colors px-1.5 py-0.5 rounded border border-[#1e1e2e] hover:border-[#2a2a3e]"
                  >
                    {expanded === ev.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {expanded === ev.id && (
                <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#444455] font-mono">{ev.action_type}</span>
                  </div>
                  <pre className="text-xs text-[#6b6b80] font-mono bg-[#0a0a0f] rounded p-3 overflow-x-auto">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
