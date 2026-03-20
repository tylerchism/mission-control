'use client'
import { useState, useEffect, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(() => import('@/components/KanbanBoard'), { ssr: false })

type Task = {
  id: string; title: string; description: string; status: string;
  priority: string; created_by: string; tags: string[]; due_date: string | null;
  created_at: string; updated_at: string;
  blocked_reason?: string | null; assigned_to?: string | null;
  archived_at?: string | null; is_archived?: number;
  needs_approval?: boolean; notes?: string | null;
}

const STATUS_ORDER = ['backlog', 'ready', 'in_progress', 'blocked', 'review', 'done']
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-[#1e1e2e] text-[#6b6b80] border-[#2a2a3e]',
}
const CREATOR_COLORS: Record<string, string> = {
  tyler: 'bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]',
  dex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sage: 'bg-green-500/20 text-green-400 border-green-500/30',
}
const CREATOR_EMOJI: Record<string, string> = { tyler: '👤', dex: '🎯', sage: '🌿' }

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {children}
    </span>
  )
}

function usePersistedView() {
  const [view, setView] = useState<'table' | 'kanban'>('table')
  useEffect(() => {
    const saved = localStorage.getItem('tasks-view')
    if (saved === 'kanban' || saved === 'table') setView(saved)
  }, [])
  const set = (v: 'table' | 'kanban') => {
    setView(v)
    localStorage.setItem('tasks-view', v)
  }
  return [view, set] as const
}

// ── Task Detail Sheet ──────────────────────────────────────────────────────────

function TaskDetailSheet({
  task,
  open,
  onClose,
  onUnblock,
  onSave,
}: {
  task: Task | null
  open: boolean
  onClose: () => void
  onUnblock: (taskId: string, answer: string) => Promise<void>
  onSave: (taskId: string, patch: Partial<Task>) => Promise<void>
}) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  // Reset state when a new task opens
  useEffect(() => {
    setAnswer('')
    setEditingDesc(false)
    setDescDraft(task?.description ?? '')
    setNotesDraft(task?.notes ?? '')
  }, [task?.id])

  if (!task) return null

  const canEditDesc = task.status === 'backlog' || task.status === 'ready'
  const isNeedsTyler = task.status === 'backlog' && task.tags.includes('needs-tyler')
  const isConditionBlocked = task.status === 'backlog' && task.tags.includes('condition-blocked')
  const isAwaitingTyler = task.status === 'blocked'
  const showUnblockForm = isNeedsTyler || isAwaitingTyler

  const handleUnblock = async () => {
    if (!answer.trim()) return
    setSubmitting(true)
    await onUnblock(task.id, answer.trim())
    setSubmitting(false)
    setAnswer('')
    onClose()
  }

  const handleSaveDesc = async () => {
    setSavingDesc(true)
    await onSave(task.id, { description: descDraft })
    setSavingDesc(false)
    setEditingDesc(false)
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await onSave(task.id, { notes: notesDraft })
    setSavingNotes(false)
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="bg-[#111118] border-[#1e1e2e] text-white w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-white text-lg leading-snug pr-8">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5 mt-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]">{task.status.replace('_', ' ')}</Badge>
            <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
            <Badge className={CREATOR_COLORS[task.created_by] || CREATOR_COLORS.tyler}>
              {CREATOR_EMOJI[task.created_by] || '?'} {task.created_by}
            </Badge>
            {task.assigned_to && (
              <Badge className="bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e]">→ {task.assigned_to}</Badge>
            )}
            {isNeedsTyler && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">⚡ Needs you</Badge>
            )}
            {isConditionBlocked && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">⏳ Condition</Badge>
            )}
            {task.needs_approval && (
              <Badge className="bg-[#1e1e2e] text-[#555565] border-[#2a2a3e]">👤 Approval required</Badge>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <div className="text-xs text-[#6b6b80] font-medium uppercase tracking-wider mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span key={tag} className="text-xs bg-[#1a1a2e] text-[#6b6b80] px-2 py-0.5 rounded border border-[#2a2a3e]">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <div>
              <div className="text-xs text-[#6b6b80] font-medium uppercase tracking-wider mb-1">Due Date</div>
              <div className="text-sm text-[#9090a0]">{task.due_date}</div>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-[#6b6b80] font-medium uppercase tracking-wider">Description</div>
              {canEditDesc && !editingDesc && (
                <button
                  onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true) }}
                  className="text-xs text-[#555565] hover:text-[#9090a0] transition-colors"
                >
                  ✎ edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3e] focus:border-blue-500/50 text-white rounded-md p-2.5 text-sm resize-none h-40 focus:outline-none transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDesc}
                    disabled={savingDesc}
                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-md transition-colors font-medium"
                  >
                    {savingDesc ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingDesc(false)}
                    className="px-3 py-1.5 text-xs text-[#6b6b80] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : task.description ? (
              <div
                onClick={canEditDesc ? () => { setDescDraft(task.description ?? ''); setEditingDesc(true) } : undefined}
                className={`text-sm text-[#c0c0d0] leading-relaxed whitespace-pre-wrap bg-[#0d0d14] border border-[#1e1e2e] rounded-md px-3 py-2.5 ${canEditDesc ? 'cursor-text hover:border-[#2a2a3e] hover:bg-[#0f0f1a] transition-colors' : ''}`}
              >
                {task.description}
              </div>
            ) : canEditDesc ? (
              <div
                onClick={() => { setDescDraft(''); setEditingDesc(true) }}
                className="text-sm text-[#444455] italic bg-[#0d0d14] border border-dashed border-[#1e1e2e] rounded-md px-3 py-2.5 cursor-text hover:border-[#2a2a3e] transition-colors"
              >
                No description — click to add
              </div>
            ) : (
              <div className="text-sm text-[#444455] italic">No description</div>
            )}
          </div>

          {/* Blocked reason — for blocked status cards */}
          {isAwaitingTyler && task.blocked_reason && (
            <div>
              <div className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-1.5">Blocked Reason</div>
              <div className="text-sm text-amber-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2.5">
                {task.blocked_reason}
              </div>
            </div>
          )}

          {/* Condition reason — for condition-blocked backlog cards */}
          {isConditionBlocked && task.blocked_reason && (
            <div>
              <div className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-1.5">Waiting on Condition</div>
              <div className="text-sm text-purple-300 leading-relaxed bg-purple-500/10 border border-purple-500/20 rounded-md px-3 py-2.5">
                {task.blocked_reason}
              </div>
              <div className="mt-1.5 text-xs text-[#6b6b80]">
                This task is waiting on an external condition, not Tyler's input.
              </div>
            </div>
          )}

          {/* Unblock form — for needs-tyler backlog cards and blocked cards */}
          {showUnblockForm && (
            <div className="border-t border-[#2a2a3e] pt-4">
              <div className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-2">
                {isAwaitingTyler ? 'Your Decision' : 'Your Answer'}
              </div>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md p-2.5 text-sm resize-none h-24 focus:border-amber-500/50 focus:outline-none transition-colors"
                placeholder={isAwaitingTyler ? 'Enter your decision or answer...' : 'Type your answer...'}
              />
              <button
                onClick={handleUnblock}
                disabled={!answer.trim() || submitting}
                className="mt-2 w-full px-3 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-md transition-colors font-medium"
              >
                {submitting ? 'Submitting...' : 'Unblock → Ready'}
              </button>
            </div>
          )}

          {/* Notes — visible to agents, editable by Tyler */}
          <div>
            <div className="text-xs text-[#6b6b80] font-medium uppercase tracking-wider mb-1.5">Notes</div>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              onBlur={handleSaveNotes}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] focus:border-[#2a2a3e] text-[#9090a0] placeholder-[#3a3a4e] rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none transition-colors"
              placeholder="Context for agents working this ticket — priorities, constraints, things to know…"
            />
            {savingNotes && <div className="text-xs text-[#555565] mt-1">Saving…</div>}
          </div>

          {/* Timestamps */}
          <div className="border-t border-[#1e1e2e] pt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[#555565]">Created</span>
              <span className="text-[#6b6b80]">{formatDate(task.created_at)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#555565]">Updated</span>
              <span className="text-[#6b6b80]">{formatDate(task.updated_at)}</span>
            </div>
            {task.id && (
              <div className="flex justify-between text-xs">
                <span className="text-[#555565]">ID</span>
                <span className="text-[#444455] font-mono">{task.id}</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', tags: '', needs_approval: false })
  const [view, setView] = usePersistedView()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    const url = filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`
    const res = await fetch(url)
    setTasks(await res.json())
  }, [filter])

  useEffect(() => { load() }, [load])

  const openDetail = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    // keep selectedTask briefly for animation
    setTimeout(() => setSelectedTask(null), 300)
  }

  const cycleStatus = async (task: Task) => {
    const idx = STATUS_ORDER.indexOf(task.status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    load()
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), needs_approval: form.needs_approval }),
    })
    setForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '', needs_approval: false })
    setOpen(false)
    load()
  }

  const handleSave = async (taskId: string, patch: Partial<Task>) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': '462f220e3c3f15324825a86373da874f92302bf6fc646e3330731468cc959c22' },
      body: JSON.stringify(patch),
    })
    // Update the selectedTask in place so the sheet reflects the change without closing
    setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, ...patch } : prev)
    load()
  }

  const handleUnblock = async (taskId: string, answer: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newDescription = task.description + '\n\n**Answer:** ' + answer
    const newTags = task.tags.filter(t => t !== 'needs-tyler')
    const patch: Record<string, unknown> = { status: 'ready', description: newDescription, tags: newTags }
    // If unblocking a blocked-column card, clear the blocked_reason
    if (task.status === 'blocked') patch.blocked_reason = null
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': '462f220e3c3f15324825a86373da874f92302bf6fc646e3330731468cc959c22' },
      body: JSON.stringify(patch),
    })
    load()
  }

  const handleKanbanStatusChange = async (taskId: string, newStatus: string, blockedReason?: string) => {
    const body: Record<string, unknown> = { status: newStatus }
    if (blockedReason) body.blocked_reason = blockedReason
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': '462f220e3c3f15324825a86373da874f92302bf6fc646e3330731468cc959c22' },
      body: JSON.stringify(body),
    })
    load()
  }

  const filters = ['all', ...STATUS_ORDER]

  return (
    <div className="p-6">
      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onClose={closeDetail}
        onUnblock={handleUnblock}
        onSave={handleSave}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Tasks</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#111118] border border-[#1e1e2e] rounded-lg overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'table' ? 'bg-[#1e1e2e] text-white' : 'text-[#6b6b80] hover:text-white'}`}
            >
              Table
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-[#1e1e2e] text-white' : 'text-[#6b6b80] hover:text-white'}`}
            >
              Board
            </button>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(true)}
              className={cn(buttonVariants({ size: 'sm' }), 'bg-blue-600 hover:bg-blue-700 text-white')}
            >
              + New Task
            </button>
            <SheetContent className="bg-[#111118] border-[#1e1e2e] text-white">
              <SheetHeader><SheetTitle className="text-white">New Task</SheetTitle></SheetHeader>
              <form onSubmit={createTask} className="space-y-4 mt-4">
                <div><Label htmlFor="task-title" className="text-[#9090a0]">Title *</Label>
                  <Input id="task-title" className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
                <div><Label htmlFor="task-desc" className="text-[#9090a0]">Description</Label>
                  <textarea id="task-desc" className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md p-2 mt-1 text-sm resize-none h-20" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div><Label htmlFor="task-priority" className="text-[#9090a0]">Priority</Label>
                  <select id="task-priority" className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md p-2 mt-1 text-sm" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div><Label htmlFor="task-due" className="text-[#9090a0]">Due Date</Label>
                  <Input id="task-due" type="date" className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div><Label htmlFor="task-tags" className="text-[#9090a0]">Tags (comma separated)</Label>
                  <Input id="task-tags" className="bg-[#0a0a0f] border-[#2a2a3e] text-white mt-1" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="regen-ag, content, research" /></div>
                <div className="flex items-center gap-2">
                  <input id="task-approval" type="checkbox" checked={form.needs_approval} onChange={e => setForm(p => ({ ...p, needs_approval: e.target.checked }))} className="rounded border-[#2a2a3e] bg-[#0a0a0f] text-blue-600" />
                  <Label htmlFor="task-approval" className="text-[#9090a0] text-sm cursor-pointer">Requires my approval before agents start</Label>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Create Task</Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filter tabs (table view only) */}
      {view === 'table' && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-[#1e1e2e] text-white' : 'text-[#6b6b80] hover:text-white'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1e1e2e]">
                {['Title', 'Status', 'Priority', 'By', 'Due', 'Tags', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#6b6b80] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#555565]">No tasks</td></tr>
              ) : tasks.map(t => (
                <tr
                  key={t.id}
                  onClick={() => openDetail(t)}
                  className={`border-b border-[#1a1a2e] hover:bg-[#14141e] transition-colors cursor-pointer ${t.created_by !== 'tyler' ? 'border-l-2 border-l-blue-500/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{t.title}</div>
                    {t.description && <div className="text-[#555565] text-xs mt-0.5 truncate max-w-xs">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); cycleStatus(t) }}>
                    <button className="hover:opacity-80 transition-opacity">
                      <Badge className="bg-[#1e1e2e] text-[#9090a0] border-[#2a2a3e] cursor-pointer">{t.status.replace('_', ' ')}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3"><Badge className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge className={CREATOR_COLORS[t.created_by]}>{CREATOR_EMOJI[t.created_by] || '?'} {t.created_by}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#6b6b80] text-xs">{t.due_date || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {t.tags.map(tag => <span key={tag} className="text-xs bg-[#1a1a2e] text-[#6b6b80] px-1.5 py-0.5 rounded">{tag}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => deleteTask(t.id)} className="text-[#444455] hover:text-red-400 transition-colors text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleKanbanStatusChange}
          onUnblock={handleUnblock}
          onCardClick={openDetail}
        />
      )}
    </div>
  )
}
