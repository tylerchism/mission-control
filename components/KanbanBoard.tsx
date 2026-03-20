'use client'
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

type Task = {
  id: string; title: string; description: string; status: string;
  priority: string; created_by: string; tags: string[]; due_date: string | null;
  created_at: string; updated_at: string;
  blocked_reason?: string | null; assigned_to?: string | null;
  archived_at?: string | null; is_archived?: number;
  needs_approval?: boolean;
}

const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: '🔴 Awaiting Tyler' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

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
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${className}`}>
      {children}
    </span>
  )
}

function daysUntilArchive(archivedAt: string | null | undefined): number | null {
  if (!archivedAt) return null
  const diff = new Date(archivedAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function TaskCard({ task, isDragOverlay, isNeedsTyler, isConditionBlocked, onCardClick }: {
  task: Task; isDragOverlay?: boolean; isNeedsTyler?: boolean;
  isConditionBlocked?: boolean;
  onCardClick?: () => void;
}) {
  const archiveDays = task.status === 'done' ? daysUntilArchive(task.archived_at) : null

  const borderClass = isNeedsTyler
    ? 'border-l-2 border-l-amber-400'
    : isConditionBlocked
    ? 'border-l-2 border-l-purple-400'
    : task.status === 'blocked'
    ? 'border-l-2 border-l-red-500'
    : ''

  return (
    <div
      className={`bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 ${borderClass} ${isDragOverlay ? 'shadow-xl shadow-black/40 rotate-2' : 'hover:border-[#2a2a3e] cursor-pointer'} transition-colors`}
      onClick={onCardClick ? (e) => { e.stopPropagation(); onCardClick() } : undefined}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="text-sm text-white font-medium leading-snug flex-1">{task.title}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
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
      {task.status === 'blocked' && task.blocked_reason && (
        <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5 leading-relaxed">
          {task.blocked_reason}
        </div>
      )}
      {isConditionBlocked && task.blocked_reason && (
        <div className="mt-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1.5 leading-relaxed">
          {task.blocked_reason}
        </div>
      )}
      {archiveDays !== null && (
        <div className="mt-2 text-xs text-[#555565]">
          archives in {archiveDays}d
        </div>
      )}
    </div>
  )
}

function SortableTaskCard({ task, isNeedsTyler, isConditionBlocked, onCardClick }: {
  task: Task; isNeedsTyler?: boolean; isConditionBlocked?: boolean;
  onCardClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isNeedsTyler={isNeedsTyler} isConditionBlocked={isConditionBlocked} onCardClick={onCardClick} />
    </div>
  )
}

function Column({ col, tasks, onCardClick }: {
  col: typeof KANBAN_COLUMNS[number]; tasks: Task[];
  onCardClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const isBlocked = col.id === 'blocked'
  const isBacklog = col.id === 'backlog'

  return (
    <div
      className={`flex flex-col min-w-[260px] w-[260px] shrink-0 ${isBlocked ? 'border-l-2 border-l-amber-500' : ''}`}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${isBlocked ? 'text-amber-400' : 'text-[#6b6b80]'}`}>
          {col.label}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isBlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1e1e2e] text-[#555565]'}`}>
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 rounded-lg transition-colors min-h-[200px] ${isOver ? 'bg-[#1a1a2e]/50' : 'bg-[#0d0d14]'}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const needsTyler = isBacklog && task.tags.includes('needs-tyler')
            const conditionBlocked = isBacklog && task.tags.includes('condition-blocked')
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                isNeedsTyler={needsTyler}
                isConditionBlocked={conditionBlocked}
                onCardClick={() => onCardClick(task)}
              />
            )
          })}
        </SortableContext>
      </div>
    </div>
  )
}

type Props = {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: string, blockedReason?: string) => Promise<void>
  onUnblock?: (taskId: string, answer: string) => Promise<void>
  onCardClick?: (task: Task) => void
}

export default function KanbanBoard({ tasks, onStatusChange, onUnblock: _onUnblock, onCardClick }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [blockedPrompt, setBlockedPrompt] = useState<{ taskId: string; reason: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    // Determine target column: if dropped over a column droppable or another card
    let targetStatus = over.id as string
    // If dropped on a card, find that card's status
    if (!KANBAN_COLUMNS.find(c => c.id === targetStatus)) {
      const overTask = tasks.find(t => t.id === targetStatus)
      if (overTask) targetStatus = overTask.status
      else return
    }

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // If dragging to blocked and no reason, prompt
    if (targetStatus === 'blocked' && !task.blocked_reason) {
      setBlockedPrompt({ taskId, reason: '' })
      return
    }

    onStatusChange(taskId, targetStatus)
  }

  const confirmBlocked = () => {
    if (!blockedPrompt || !blockedPrompt.reason.trim()) return
    onStatusChange(blockedPrompt.taskId, 'blocked', blockedPrompt.reason.trim())
    setBlockedPrompt(null)
  }

  return (
    <div className="relative">
      {/* Blocked reason prompt */}
      {blockedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setBlockedPrompt(null)}>
          <div className="bg-[#111118] border border-[#2a2a3e] rounded-lg p-4 w-96" onClick={e => e.stopPropagation()}>
            <div className="text-sm text-white font-medium mb-2">What does Tyler need to decide?</div>
            <input
              autoFocus
              value={blockedPrompt.reason}
              onChange={e => setBlockedPrompt(p => p ? { ...p, reason: e.target.value } : null)}
              onKeyDown={e => e.key === 'Enter' && confirmBlocked()}
              className="w-full bg-[#0a0a0f] border border-[#2a2a3e] text-white rounded-md px-3 py-2 text-sm mb-3"
              placeholder="e.g. Need approval on pricing approach"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBlockedPrompt(null)} className="px-3 py-1.5 text-xs text-[#6b6b80] hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmBlocked} className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(col => (
            <Column key={col.id} col={col} tasks={tasksByStatus(col.id)} onCardClick={onCardClick || (() => {})} />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
