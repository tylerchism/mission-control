import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateContentSchema = z.object({
  title: z.string().min(1).optional(),
  body_markdown: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'published']).optional(),
  tags: z.array(z.string()).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = db.prepare('SELECT * FROM content_items WHERE id = ?').get(id) as any
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = UpdateContentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const values: unknown[] = [now]

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title) }
  if (data.body_markdown !== undefined) { updates.push('body_markdown = ?'); values.push(data.body_markdown) }
  if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
    if (data.status === 'published' && !existing.published_at) {
      updates.push('published_at = ?')
      values.push(now)
    }
  }

  values.push(id)
  db.prepare(`UPDATE content_items SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const item = db.prepare('SELECT * FROM content_items WHERE id = ?').get(id) as any
  return NextResponse.json({ ...item, tags: JSON.parse(item.tags) })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!db.prepare('SELECT id FROM content_items WHERE id = ?').get(id))
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.prepare('DELETE FROM content_items WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
