import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { slugify } from '@/lib/utils'

const CreateContentSchema = z.object({
  title: z.string().min(1),
  body_markdown: z.string().optional().default(''),
  created_by: z.string().optional().default('tyler'),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  let query = 'SELECT * FROM content_items WHERE 1=1'
  const params: string[] = []
  if (status) { query += ' AND status = ?'; params.push(status) }
  query += ' ORDER BY created_at DESC'
  const items = db.prepare(query).all(...params)
  return NextResponse.json(items.map((i: any) => ({ ...i, tags: JSON.parse(i.tags) })))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateContentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const now = new Date().toISOString()
  const id = nanoid()

  // Ensure unique slug
  let slug = slugify(data.title)
  const existing = db.prepare('SELECT id FROM content_items WHERE slug = ?').get(slug)
  if (existing) slug = `${slug}-${nanoid(4)}`

  db.prepare(`
    INSERT INTO content_items (id, title, slug, body_markdown, status, created_by, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `).run(id, data.title, slug, data.body_markdown, data.created_by, JSON.stringify(data.tags), now, now)

  const item = db.prepare('SELECT * FROM content_items WHERE id = ?').get(id) as any
  return NextResponse.json({ ...item, tags: JSON.parse(item.tags) }, { status: 201 })
}
