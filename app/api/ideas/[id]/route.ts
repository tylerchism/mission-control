import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateIdeaSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['backlog', 'ready', 'dismissed', 'converted']).optional(),
  idea_type: z.enum(['idea', 'spike']).optional(),
  linked_task_id: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = db.prepare('SELECT id FROM ideas WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reqBody = await request.json()
  const parsed = UpdateIdeaSchema.safeParse(reqBody)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const updates: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title) }
  if (data.body !== undefined) { updates.push('body = ?'); values.push(data.body) }
  if (data.source !== undefined) { updates.push('source = ?'); values.push(data.source) }
  if (data.idea_type !== undefined) { updates.push('idea_type = ?'); values.push(data.idea_type) }
  if (data.linked_task_id !== undefined) { updates.push('linked_task_id = ?'); values.push(data.linked_task_id) }

  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
    const now = new Date().toISOString()
    if (data.status === 'dismissed') { updates.push('dismissed_at = ?'); values.push(now) }
    if (data.status === 'converted') { updates.push('converted_at = ?'); values.push(now) }
  }

  if (updates.length > 0) {
    values.push(id)
    db.prepare(`UPDATE ideas SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as any
  return NextResponse.json({ ...idea, tags: JSON.parse(idea.tags) })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!db.prepare('SELECT id FROM ideas WHERE id = ?').get(id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM ideas WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
