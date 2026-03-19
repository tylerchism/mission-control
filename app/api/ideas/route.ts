import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const CreateIdeaSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(''),
  source: z.string().optional().default('tyler'),
  tags: z.array(z.string()).optional().default([]),
  idea_type: z.enum(['idea', 'spike']).optional().default('idea'),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  let ideas
  if (statusFilter === 'all') {
    ideas = db.prepare('SELECT * FROM ideas ORDER BY created_at DESC').all()
  } else if (statusFilter) {
    ideas = db.prepare('SELECT * FROM ideas WHERE status = ? ORDER BY created_at DESC').all(statusFilter)
  } else {
    // Default: exclude dismissed and converted
    ideas = db.prepare("SELECT * FROM ideas WHERE status NOT IN ('dismissed', 'converted') ORDER BY created_at DESC").all()
  }
  return NextResponse.json(ideas.map((i: any) => ({ ...i, tags: JSON.parse(i.tags) })))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateIdeaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data
  const now = new Date().toISOString()
  const id = nanoid()
  db.prepare('INSERT INTO ideas (id, title, body, source, tags, created_at, status, idea_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, data.title, data.body, data.source, JSON.stringify(data.tags), now, 'backlog', data.idea_type)
  const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as any
  return NextResponse.json({ ...idea, tags: JSON.parse(idea.tags) }, { status: 201 })
}
