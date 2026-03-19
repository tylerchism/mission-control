'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

type Idea = {
  id: string; title: string; body: string;
  source: string; tags: string[]; created_at: string;
  status: string; idea_type: string;
  linked_task_id?: string; dismissed_at?: string; converted_at?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  tyler: 'bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]',
  dex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sage: 'bg-green-500/20 text-green-400 border-green-500/30',
  telegram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}
const SOURCE_EMOJI: Record<string, string> = { tyler: '👤', dex: '🎯', sage: '🌿', telegram: '📱' }
const TYPE_EMOJI: Record<string, string> = { idea: '💡', spike: '🔬' }
const TYPE_LABEL: Record<string, string> = { idea: 'Idea', spike: 'Spike' }

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${className}`}>{children}</span>
}

function isStale(created_at: string): boolean {
  const created = new Date(created_at).getTime()
  const now = Date.now()
  return (now - created) > 30 * 24 * 60 * 60 * 1000
}

// Droppable column wrapper
function DroppableColumn({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex-1 min-w-[340px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-semibold text-[#9090a0] uppercase tracking-wider">{title}</h3>
        <span className="text-xs text-[#555565] bg-[#1a1a2e] px-1.5 py-0.5 rounded">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-[200px] rounded-lg p-2 transition-colors",
          isOver ? "bg-blue-500/5 ring-1 ring-blue-500/20" : "bg-transparent"
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Sortable idea card
function IdeaCard({
  idea,
  onEdit,
  onDismiss,
  isDragging,
}: {
  idea: Idea
  onEdit: (idea: Idea) => void
  onDismiss: (id: string) => void
  isDragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: idea.id, data: { idea } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  }

  const stale = idea.status === 'backlog' && isStale(idea.created_at)
  const dismissed = idea.status === 'dismissed'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 group hover:border-[#2a2a3e] transition-colors cursor-grab active:cursor-grabbing",
        dismissed && "opacity-50",
        isDragging && "shadow-lg shadow-blue-500/10 border-blue-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div
          className="text-sm text-white font-medium leading-snug flex-1 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onEdit(idea) }}
        >
          {idea.title}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!dismissed && (
            <button
              onClick={e => { e.stopPropagation(); onDismiss(idea.id) }}
              className="text-[#333344] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs mt-0.5"
              title="Dismiss"
            >✕</button>
          )}
        </div>
      </div>
      {idea.body && <p className="text-xs text-[#6b6b80] mt-1 leading-relaxed line-clamp-2">{idea.body}</p>}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge className={idea.idea_type === 'spike'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
          : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
        }>
          {TYPE_EMOJI[idea.idea_type] || '💡'} {TYPE_LABEL[idea.idea_type] || 'Idea'}
        </Badge>
        <Badge className={SOURCE_COLORS[idea.source] || SOURCE_COLORS.tyler}>
          {SOURCE_EMOJI[idea.source] || '?'} {idea.source}
        </Badge>
        {stale && <Badge className="bg-orange-500/10 text-orange-400/70 border-orange-500/20">🕰️ stale</Badge>}
        <span className="text-xs text-[#333344] ml-auto">{formatRelativeTime(idea.created_at)}</span>
      </div>
      {idea.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {idea.tags.map(t => <span key={t} className="text-xs bg-[#1a1a2e] text-[#555565] px-1.5 py-0.5 rounded">{t}</span>)}
        </div>
      )}
    </div>
  )
}

// Static card for DragOverlay
function IdeaCardOverlay({ idea }: { idea: Idea }) {
  return (
    <div className="bg-[#111118] border border-blue-500/30 rounded-lg p-3 shadow-lg shadow-blue-500/10 w-[340px]">
      <div className="text-sm text-white font-medium leading-snug mb-1.5">{idea.title}</div>
      {idea.body && <p className="text-xs text-[#6b6b80] leading-relaxed line-clamp-2">{idea.body}</p>}
      <div className="flex items-center gap-1.5 mt-2">
        <Badge className={idea.idea_type === 'spike'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
          : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
        }>
          {TYPE_EMOJI[idea.idea_type] || '💡'} {TYPE_LABEL[idea.idea_type] || 'Idea'}
        </Badge>
        <Badge className={SOURCE_COLORS[idea.source] || SOURCE_COLORS.tyler}>
          {SOURCE_EMOJI[idea.source] || '?'} {idea.source}
        </Badge>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [showDismissed, setShowDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [form, setForm] = useState({ title: '', body: '', idea_type: 'idea' as 'idea' | 'spike' })
  const [quickTitle, setQuickTitle] = useState('')
  const [quickType, setQuickType] = useState<'idea' | 'spike'>('idea')
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null)
  const [dismissedIdeas, setDismissedIdeas] = useState<Idea[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    const [activeRes, dismissedRes] = await Promise.all([
      fetch('/api/ideas'),
      fetch('/api/ideas?status=dismissed'),
    ])
    setIdeas(await activeRes.json())
    setDismissedIdeas(await dismissedRes.json())
  }, [])

  useEffect(() => { load() }, [load])

  const backlogIdeas = useMemo(() => ideas.filter(i => i.status === 'backlog'), [ideas])
  const readyIdeas = useMemo(() => ideas.filter(i => i.status === 'ready'), [ideas])
  const backlogIds = useMemo(() => backlogIdeas.map(i => i.id), [backlogIdeas])
  const readyIds = useMemo(() => readyIdeas.map(i => i.id), [readyIdeas])

  const openEdit = (idea: Idea) => {
    setEditingIdea(idea)
    setForm({ title: idea.title, body: idea.body || '', idea_type: (idea.idea_type as 'idea' | 'spike') || 'idea' })
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingIdea) {
      await fetch(`/api/ideas/${editingIdea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, body: form.body, idea_type: form.idea_type }),
      })
    }
    setOpen(false)
    setForm({ title: '', body: '', idea_type: 'idea' })
    setEditingIdea(null)
    load()
  }

  const quickCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickTitle.trim(), idea_type: quickType }),
    })
    setQuickTitle('')
    setQuickType('idea')
    load()
  }

  const dismissIdea = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    })
    load()
  }

  const restoreIdea = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'backlog' }),
    })
    load()
  }

  const handleDragStart = (event: DragStartEvent) => {
    const idea = ideas.find(i => i.id === event.active.id)
    setActiveIdea(idea || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIdea(null)
    const { active, over } = event
    if (!over) return

    const idea = ideas.find(i => i.id === active.id)
    if (!idea) return

    // Determine target column
    let targetStatus: string | null = null
    const overId = String(over.id)

    if (overId === 'backlog' || overId === 'ready') {
      targetStatus = overId
    } else {
      // Dropped on another card - find which column it's in
      const overIdea = ideas.find(i => i.id === overId)
      if (overIdea) targetStatus = overIdea.status
    }

    if (!targetStatus || targetStatus === idea.status) return

    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    })
    load()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Ideas</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#555565]">{ideas.length} active</span>
          {dismissedIdeas.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs text-[#555565] hover:text-[#9090a0] transition-colors"
            >
              {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissedIdeas.length})
            </button>
          )}
        </div>
      </div>

      {/* Quick-capture bar */}
      <form onSubmit={quickCapture} className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setQuickType(quickType === 'idea' ? 'spike' : 'idea')}
          className="shrink-0 text-lg w-9 h-9 flex items-center justify-center rounded-md border border-[#2a2a3e] bg-[#111118] hover:bg-[#1a1a2e] transition-colors"
          title={`Type: ${quickType === 'idea' ? 'Idea' : 'Spike'} (click to toggle)`}
        >
          {quickType === 'idea' ? '💡' : '🔬'}
        </button>
        <Input
          placeholder="Quick capture — type an idea and press Enter..."
          className="bg-[#111118] border-[#2a2a3e] text-white flex-1"
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
        />
        <Button
          type="submit"
          disabled={!quickTitle.trim()}
          className={cn(buttonVariants({ size: 'sm' }), 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30')}
        >
          Capture
        </Button>
      </form>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          <DroppableColumn id="backlog" title="Backlog" count={backlogIdeas.length}>
            <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
              {backlogIdeas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onEdit={openEdit} onDismiss={dismissIdea} />
              ))}
            </SortableContext>
            {backlogIdeas.length === 0 && (
              <div className="text-center py-8 text-[#333344] text-sm">No backlog ideas</div>
            )}
          </DroppableColumn>

          <DroppableColumn id="ready" title="Ready" count={readyIdeas.length}>
            <SortableContext items={readyIds} strategy={verticalListSortingStrategy}>
              {readyIdeas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onEdit={openEdit} onDismiss={dismissIdea} />
              ))}
            </SortableContext>
            {readyIdeas.length === 0 && (
              <div className="text-center py-8 text-[#333344] text-sm">Drag ideas here when vetted</div>
            )}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {activeIdea ? <IdeaCardOverlay idea={activeIdea} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Dismissed ideas toggle section */}
      {showDismissed && dismissedIdeas.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-[#555565] uppercase tracking-wider mb-3">Dismissed</h3>
          <div className="space-y-2">
            {dismissedIdeas.map(idea => (
              <div
                key={idea.id}
                className="bg-[#111118]/50 border border-[#1e1e2e] rounded-lg p-3 flex items-center justify-between group opacity-60 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-[#6b6b80]">{TYPE_EMOJI[idea.idea_type] || '💡'}</span>
                  <span className="text-sm text-[#9090a0] truncate">{idea.title}</span>
                  {idea.dismissed_at && (
                    <span className="text-xs text-[#333344] shrink-0">dismissed {formatRelativeTime(idea.dismissed_at)}</span>
                  )}
                </div>
                <button
                  onClick={() => restoreIdea(idea.id)}
                  className="text-xs text-[#555565] hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-[#111118] border-[#1e1e2e] text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Idea</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="idea-title" className="text-[#9090a0]">Title *</Label>
              <Input
                id="idea-title"
                className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="idea-body" className="text-[#9090a0]">Description</Label>
              <textarea
                id="idea-body"
                className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md p-2 mt-1 text-sm resize-none h-32"
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[#9090a0]">Type</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, idea_type: 'idea' }))}
                  className={cn(
                    "flex-1 py-2 rounded-md border text-sm transition-colors",
                    form.idea_type === 'idea'
                      ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                      : "bg-[#0a0a0f] border-[#2a2a3e] text-[#555565] hover:text-[#9090a0]"
                  )}
                >💡 Idea</button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, idea_type: 'spike' }))}
                  className={cn(
                    "flex-1 py-2 rounded-md border text-sm transition-colors",
                    form.idea_type === 'spike'
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-[#0a0a0f] border-[#2a2a3e] text-[#555565] hover:text-[#9090a0]"
                  )}
                >🔬 Spike</button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
