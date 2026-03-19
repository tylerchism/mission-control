import { EventEmitter } from 'events'

// Module-level emitter for SSE broadcast
export const sseEmitter = new EventEmitter()
sseEmitter.setMaxListeners(100)

export function broadcastActivity(data: unknown) {
  sseEmitter.emit('activity', JSON.stringify(data))
}
