import type { ChatSession, Message } from './types'

const STORAGE_KEY = 'carlo_health_sessions'
const MAX_SESSIONS = 25

export function getSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined') return
  try {
    const sessions = getSessions()
    const idx = sessions.findIndex(s => s.id === session.id)
    if (idx >= 0) {
      sessions[idx] = session
    } else {
      sessions.unshift(session)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function deleteSession(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const sessions = getSessions().filter(s => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {}
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function createNewSession(): ChatSession {
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: 'New conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  }
}

export function createMessage(
  role: 'user' | 'assistant',
  content: string,
  extra?: Partial<Message>
): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: Date.now(),
    ...extra,
  }
}

export function sessionTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'New conversation'
  return firstUser.content.length > 45
    ? firstUser.content.slice(0, 45) + '…'
    : firstUser.content
}
