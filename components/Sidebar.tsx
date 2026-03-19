'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const nav = [
  { href: '/', label: 'Dashboard', icon: '🎯' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/ideas', label: 'Ideas', icon: '💡' },
  { href: '/feed', label: 'Agent Feed', icon: '📡' },
]

function NavItems({ pathname, onNavigate, blockedCount }: { pathname: string; onNavigate?: () => void; blockedCount: number }) {
  return (
    <>
      {nav.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              active
                ? 'bg-[#1a1a2e] text-white'
                : 'text-[#9090a0] hover:text-white hover:bg-[#14141e]'
            }`}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
            {href === '/tasks' && blockedCount > 0 && (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                {blockedCount}
              </span>
            )}
            {active && <span className={`${href === '/tasks' && blockedCount > 0 ? '' : 'ml-auto'} w-1 h-4 rounded-full bg-blue-500`} />}
          </Link>
        )
      })}
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)

  // Fetch blocked task count
  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const res = await fetch('/api/tasks?status=blocked')
        const tasks = await res.json()
        setBlockedCount(Array.isArray(tasks) ? tasks.length : 0)
      } catch { /* ignore */ }
    }
    fetchBlocked()
    const interval = setInterval(fetchBlocked, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d0d14] border-b border-[#1a1a2e] flex items-center h-12 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[#9090a0] hover:text-white transition-colors p-1 -ml-1"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>
        <span className="text-sm font-semibold tracking-widest text-[#6b6b80] uppercase ml-3">Mission Control</span>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-52 min-h-screen bg-[#0d0d14] border-r border-[#1a1a2e] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-5 border-b border-[#1a1a2e] flex items-center justify-between">
              <span className="text-sm font-semibold tracking-widest text-[#6b6b80] uppercase">Mission Control</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-[#555565] hover:text-white transition-colors text-lg"
                aria-label="Close menu"
              >✕</button>
            </div>
            <nav className="flex-1 py-3">
              <NavItems pathname={pathname} onNavigate={() => setMobileOpen(false)} blockedCount={blockedCount} />
            </nav>
            <div className="px-4 py-3 border-t border-[#1a1a2e]">
              <span className="text-xs text-[#444455]">🎯 Dex + Tyler</span>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 min-h-screen bg-[#0d0d14] border-r border-[#1a1a2e] flex-col shrink-0">
        <div className="px-4 py-5 border-b border-[#1a1a2e]">
          <span className="text-sm font-semibold tracking-widest text-[#6b6b80] uppercase">Mission Control</span>
        </div>
        <nav className="flex-1 py-3">
          <NavItems pathname={pathname} blockedCount={blockedCount} />
        </nav>
        <div className="px-4 py-3 border-t border-[#1a1a2e]">
          <span className="text-xs text-[#444455]">🎯 Dex + Tyler</span>
        </div>
      </aside>
    </>
  )
}
