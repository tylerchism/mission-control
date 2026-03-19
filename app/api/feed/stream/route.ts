import { sseEmitter } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const handler = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          sseEmitter.off('activity', handler)
        }
      }

      sseEmitter.on('activity', handler)

      // Keep-alive ping every 30s
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
          sseEmitter.off('activity', handler)
        }
      }, 30000)

      // Cleanup on close
      return () => {
        clearInterval(ping)
        sseEmitter.off('activity', handler)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
