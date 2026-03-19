import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastActivity } from '@/lib/sse'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const CreateActivitySchema = z.object({
  agent: z.string().min(1),
  action: z.string().min(1),
  action_type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const items = db.prepare('SELECT * FROM agent_activity ORDER BY created_at DESC LIMIT ?').all(limit)
  return NextResponse.json(items.map((i: any) => ({ ...i, payload: JSON.parse(i.payload) })))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateActivitySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const now = new Date().toISOString()
  const id = nanoid()

  db.prepare(`INSERT INTO agent_activity (id, agent, action, action_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, data.agent, data.action, data.action_type, JSON.stringify(data.payload), now)

  const event = { id, agent: data.agent, action: data.action, action_type: data.action_type, payload: data.payload, created_at: now }
  broadcastActivity(event)

  return NextResponse.json(event, { status: 201 })
}
