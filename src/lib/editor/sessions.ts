/**
 * src/lib/editor/sessions.ts
 *
 * Saved edit sessions — persist an edit *recipe* (the full snapshot: all
 * adjustments + geometry) to localStorage so it can be resumed later or reused
 * on another image. We deliberately do NOT store the pixels (they can be
 * megabytes and localStorage is tiny); a session is the non-destructive recipe,
 * which is the whole point of the editor's parameter model.
 */

import type { Snapshot } from "./store"

const KEY = "pxl-editor-sessions"
const MAX = 50

export interface EditorSession {
  id: string
  name: string
  createdAt: number
  snapshot: Snapshot
}

function read(): EditorSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as EditorSession[]) : []
  } catch {
    return []
  }
}

function write(sessions: EditorSession[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX)))
  } catch {
    /* quota exceeded or disabled — sessions are best-effort */
  }
}

export function listSessions(): EditorSession[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveSession(name: string, snapshot: Snapshot): EditorSession {
  const session: EditorSession = {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || `Session ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    snapshot,
  }
  write([session, ...read()])
  return session
}

export function deleteSession(id: string): void {
  write(read().filter((s) => s.id !== id))
}
