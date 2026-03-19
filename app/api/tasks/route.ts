import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkApiKey } from '@/lib/auth'
import { broadcastActivity } from '@/lib/sse'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  status: z.enum(['backlog', 'ready', 'in_progress', 'blocked', 'review', 'done']).optional().default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  created_by: z.string().optional().default('tyler'),
  tags: z.array(z.string()).optional().default([]),
  due_date: z.string().optional(),
  assigned_to: z.string().optional(),
  blocked_reason: z.string().optional(),
  needs_approval: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const created_by = searchParams.get('created_by')
  const priority = searchParams.get('priority')
  const includeArchived = searchParams.get('archived') === 'true'

  let query = 'SELECT * FROM tasks WHERE 1=1'
  const params: string[] = []

  if (!includeArchived) { query += ' AND (is_archived = 0 OR is_archived IS NULL)' }
  if (status) { query += ' AND status = ?'; params.push(status) }
  if (created_by) { query += ' AND created_by = ?'; params.push(created_by) }
  if (priority) { query += ' AND priority = ?'; params.push(priority) }
  query += ' ORDER BY created_at DESC'

  const tasks = db.prepare(query).all(...params) as any[]
  return NextResponse.json(tasks.map(t => ({ ...t, tags: JSON.parse(t.tags), needs_approval: !!t.needs_approval })))
}

export async function POST(request: NextRequest) {
  const isApiKey = checkApiKey(request)
  const body = await request.json()
  const parsed = CreateTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const now = new Date().toISOString()
  const id = nanoid()

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, created_by, tags, due_date, assigned_to, blocked_reason, needs_approval, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.title, data.description, data.status, data.priority, data.created_by, JSON.stringify(data.tags), data.due_date ?? null, data.assigned_to ?? null, data.blocked_reason ?? null, data.needs_approval ? 1 : 0, now, now)

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any

  if (data.created_by === 'dex' || data.created_by === 'sage') {
    const actId = nanoid()
    db.prepare(`INSERT INTO agent_activity (id, agent, action, action_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      actId, data.created_by,
      `Created task: ${data.title}`,
      'task.created',
      JSON.stringify({ taskId: id, title: data.title }),
      now
    )
    broadcastActivity({ id: actId, agent: data.created_by, action: `Created task: ${data.title}`, action_type: 'task.created', created_at: now })
  }

  return NextResponse.json({ ...task, tags: JSON.parse(task.tags), needs_approval: !!task.needs_approval }, { status: 201 })
}
