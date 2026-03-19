import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'blocked', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  due_date: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  blocked_reason: z.string().nullable().optional(),
  needs_approval: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.string().nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = UpdateTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data

  // If setting status to blocked, require blocked_reason
  if (data.status === 'blocked' && !data.blocked_reason && !(existing as any).blocked_reason) {
    return NextResponse.json({ error: 'blocked_reason is required when status is blocked' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const values: unknown[] = [now]

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
  if (data.status !== undefined) {
    updates.push('status = ?'); values.push(data.status)
    // If moving to done, set archived_at to 7 days from now
    if (data.status === 'done') {
      const archiveDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      updates.push('archived_at = ?'); values.push(archiveDate)
    }
    // If moving away from done, clear archived_at
    if (data.status !== 'done') {
      updates.push('archived_at = ?'); values.push(null)
    }
  }
  if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority) }
  if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
  if (data.due_date !== undefined) { updates.push('due_date = ?'); values.push(data.due_date) }
  if (data.assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(data.assigned_to) }
  if (data.blocked_reason !== undefined) { updates.push('blocked_reason = ?'); values.push(data.blocked_reason) }
  if (data.needs_approval !== undefined) { updates.push('needs_approval = ?'); values.push(data.needs_approval ? 1 : 0) }
  if (data.is_archived !== undefined) { updates.push('is_archived = ?'); values.push(data.is_archived ? 1 : 0) }
  if (data.archived_at !== undefined) { updates.push('archived_at = ?'); values.push(data.archived_at) }

  values.push(id)
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
  return NextResponse.json({ ...task, tags: JSON.parse(task.tags), needs_approval: !!task.needs_approval })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
