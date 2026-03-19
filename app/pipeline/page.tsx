'use client'
import { useState, useEffect, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatRelativeTime } from '@/lib/utils'

type ContentItem = {
  id: string; title: string; slug: string; body_markdown: string;
  status: string; created_by: string; tags: string[];
  published_at: string | null; created_at: string; updated_at: string;
}

const COLUMNS = [
  { key: 'draft', label: 'Draft' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'published', label: 'Published' },
]

const NEXT_STATUS: Record<string, string> = {
  draft: 'review', review: 'approved', approved: 'published',
}

const CREATOR_COLORS: Record<string, string> = {
  tyler: 'bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]',
  dex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sage: 'bg-green-500/20 text-green-400 border-green-500/30',
}
const CREATOR_EMOJI: Record<string, string> = { tyler: '👤', dex: '🎯', sage: '🌿' }

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${className}`}>{children}</span>
}

function wordCount(md: string) {
  return md.trim().split(/\s+/).filter(Boolean).length
}

export default function PipelinePage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [selected, setSelected] = useState<ContentItem | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body_markdown: '', tags: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/content')
    setItems(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const advance = async (item: ContentItem) => {
    const next = NEXT_STATUS[item.status]
    if (!next) return
    await fetch(`/api/content/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    load()
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/content/${id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) }),
    })
    setForm({ title: '', body_markdown: '', tags: '' })
    setOpen(false)
    load()
  }

  const byStatus = (status: string) => items.filter(i => i.status === status)

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Content Pipeline</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(buttonVariants({ size: 'sm' }), 'bg-blue-600 hover:bg-blue-700 text-white')}>
            + New Draft
          </SheetTrigger>
          <SheetContent className="bg-[#111118] border-[#1e1e2e] text-white w-full sm:w-[480px]">
            <SheetHeader><SheetTitle className="text-white">New Draft</SheetTitle></SheetHeader>
            <form onSubmit={createItem} className="space-y-4 mt-4">
              <div><Label className="text-[#9090a0]">Title *</Label>
                <Input className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
              <div><Label className="text-[#9090a0]">Content (Markdown)</Label>
                <textarea className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md p-2 mt-1 text-sm resize-none h-40 font-mono" value={form.body_markdown} onChange={e => setForm(p => ({ ...p, body_markdown: e.target.value }))} placeholder="# Title&#10;&#10;Write your content here..." /></div>
              <div><Label className="text-[#9090a0]">Tags (comma separated)</Label>
                <Input className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} /></div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Create Draft</Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="overflow-x-auto -mx-6 px-6 pb-4 md:mx-0 md:px-0 md:pb-0">
      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-188px)] md:h-[calc(100vh-140px)] min-w-[640px]">
        {COLUMNS.map(col => (
          <div key={col.key} className="flex flex-col bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[#1a1a2e] flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-[#9090a0] uppercase tracking-wider">{col.label}</span>
              <span className="text-xs text-[#444455] bg-[#1a1a2e] px-1.5 py-0.5 rounded">{byStatus(col.key).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {byStatus(col.key).map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="bg-[#111118] border border-[#1e1e2e] rounded-md p-3 cursor-pointer hover:border-[#2a2a3e] transition-colors"
                >
                  <div className="text-sm text-white font-medium leading-snug mb-2">{item.title}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={CREATOR_COLORS[item.created_by]}>
                      {CREATOR_EMOJI[item.created_by]} {item.created_by}
                    </Badge>
                    {item.body_markdown && (
                      <span className="text-xs text-[#444455]">{wordCount(item.body_markdown)}w</span>
                    )}
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.map(t => (
                        <span key={t} className="text-xs bg-[#1a1a2e] text-[#555565] px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[#444455] mt-2">{formatRelativeTime(item.updated_at)}</div>
                  {NEXT_STATUS[item.status] && (
                    <button
                      onClick={e => { e.stopPropagation(); advance(item) }}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      → Move to {NEXT_STATUS[item.status]}
                    </button>
                  )}
                </div>
              ))}
              {byStatus(col.key).length === 0 && (
                <div className="text-xs text-[#333344] text-center py-6">empty</div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[#111118] border border-[#2a2a3e] rounded-lg p-6 w-full max-w-[640px] mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">{selected.title}</h2>
                <div className="flex gap-2 mt-1">
                  <Badge className={CREATOR_COLORS[selected.created_by]}>{CREATOR_EMOJI[selected.created_by]} {selected.created_by}</Badge>
                  <Badge className="bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]">{selected.status}</Badge>
                  {selected.body_markdown && <span className="text-xs text-[#555565] self-center">{wordCount(selected.body_markdown)} words</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#555565] hover:text-white text-xl ml-4">✕</button>
            </div>
            {selected.body_markdown ? (
              <pre className="text-sm text-[#c0c0d0] font-mono whitespace-pre-wrap bg-[#0a0a0f] rounded p-4 max-h-96 overflow-y-auto">{selected.body_markdown}</pre>
            ) : (
              <p className="text-[#555565] text-sm italic">No content yet</p>
            )}
            <div className="flex gap-2 mt-4">
              {NEXT_STATUS[selected.status] && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { advance(selected); setSelected(null) }}>
                  → Move to {NEXT_STATUS[selected.status]}
                </Button>
              )}
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => deleteItem(selected.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
