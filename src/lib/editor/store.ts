/**
 * src/lib/editor/store.ts
 *
 * The editor's state container (Zustand). Holds the non-destructive parameter
 * model plus a full undo/redo history, and nothing about rendering.
 *
 * HISTORY MODEL
 * -------------
 * `history` is an array of committed snapshots; `index` points at the current
 * one. `present` is the *live* value the canvas renders every frame.
 *
 *   - Dragging a slider calls `setAdjustment` → mutates `present` only (smooth,
 *     no history spam).
 *   - Releasing the slider calls `commit` → if `present` differs from the
 *     snapshot at `index`, we truncate any redo branch and push a checkpoint.
 *   - `undo`/`redo` move `index` and copy that snapshot back into `present`.
 *
 * This gives Lightroom-style behaviour: continuous dragging is one undo step,
 * and the AI original is always snapshot 0 (Reset returns to it).
 */

import { create } from "zustand"
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GEOMETRY,
  type Adjustments,
  type AdjustmentKey,
  type Geometry,
  type CropRect,
} from "./adjustments"

interface Snapshot {
  adjustments: Adjustments
  geometry: Geometry
}

interface EditorStore {
  adjustments: Adjustments
  geometry: Geometry
  history: Snapshot[]
  index: number
  showBefore: boolean
  /** Bumped whenever `present` changes so the canvas knows to re-render. */
  revision: number

  // ── live edits (no history) ──
  setAdjustment: (key: AdjustmentKey, value: number) => void
  setGeometry: (partial: Partial<Geometry>) => void
  setCrop: (crop: CropRect | null) => void

  // ── history checkpoints ──
  commit: () => void
  undo: () => void
  redo: () => void
  jumpTo: (index: number) => void
  canUndo: () => boolean
  canRedo: () => boolean

  // ── bulk ──
  applyAdjustments: (partial: Partial<Adjustments>) => void

  // ── resets ──
  resetAll: () => void
  resetSection: (keys: AdjustmentKey[]) => void

  // ── view ──
  setShowBefore: (v: boolean) => void

  /** Reset the whole store when a new image is opened. */
  init: () => void
}

const clone = (s: Snapshot): Snapshot => ({
  adjustments: { ...s.adjustments },
  geometry: { ...s.geometry, crop: s.geometry.crop ? { ...s.geometry.crop } : null },
})

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  const ak = Object.keys(a.adjustments) as AdjustmentKey[]
  for (const k of ak) if (a.adjustments[k] !== b.adjustments[k]) return false
  const g1 = a.geometry
  const g2 = b.geometry
  if (
    g1.rotate90 !== g2.rotate90 ||
    g1.flipH !== g2.flipH ||
    g1.flipV !== g2.flipV ||
    g1.straighten !== g2.straighten
  )
    return false
  const c1 = g1.crop
  const c2 = g2.crop
  if (!c1 && !c2) return true
  if (!c1 || !c2) return false
  return c1.x === c2.x && c1.y === c2.y && c1.w === c2.w && c1.h === c2.h
}

const initialSnapshot = (): Snapshot => ({
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  geometry: { ...DEFAULT_GEOMETRY },
})

export const useEditorStore = create<EditorStore>((set, get) => ({
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  geometry: { ...DEFAULT_GEOMETRY },
  history: [initialSnapshot()],
  index: 0,
  showBefore: false,
  revision: 0,

  setAdjustment: (key, value) =>
    set((s) => ({
      adjustments: { ...s.adjustments, [key]: value },
      revision: s.revision + 1,
    })),

  setGeometry: (partial) =>
    set((s) => ({
      geometry: { ...s.geometry, ...partial },
      revision: s.revision + 1,
    })),

  setCrop: (crop) =>
    set((s) => ({
      geometry: { ...s.geometry, crop },
      revision: s.revision + 1,
    })),

  commit: () => {
    const s = get()
    const current: Snapshot = { adjustments: s.adjustments, geometry: s.geometry }
    if (snapshotsEqual(current, s.history[s.index])) return
    const history = s.history.slice(0, s.index + 1)
    history.push(clone(current))
    set({ history, index: history.length - 1 })
  },

  undo: () => {
    const s = get()
    if (s.index <= 0) return
    const index = s.index - 1
    const snap = clone(s.history[index])
    set({
      index,
      adjustments: snap.adjustments,
      geometry: snap.geometry,
      revision: s.revision + 1,
    })
  },

  redo: () => {
    const s = get()
    if (s.index >= s.history.length - 1) return
    const index = s.index + 1
    const snap = clone(s.history[index])
    set({
      index,
      adjustments: snap.adjustments,
      geometry: snap.geometry,
      revision: s.revision + 1,
    })
  },

  jumpTo: (index) => {
    const s = get()
    if (index < 0 || index >= s.history.length || index === s.index) return
    const snap = clone(s.history[index])
    set({
      index,
      adjustments: snap.adjustments,
      geometry: snap.geometry,
      revision: s.revision + 1,
    })
  },

  canUndo: () => get().index > 0,
  canRedo: () => get().index < get().history.length - 1,

  applyAdjustments: (partial) => {
    const s = get()
    // A preset starts from the AI original, then layers its look on top.
    const adjustments = { ...DEFAULT_ADJUSTMENTS, ...partial }
    const history = s.history.slice(0, s.index + 1)
    history.push(clone({ adjustments, geometry: s.geometry }))
    set({
      adjustments,
      history,
      index: history.length - 1,
      revision: s.revision + 1,
    })
  },

  resetAll: () => {
    const s = get()
    const snap = initialSnapshot()
    if (snapshotsEqual({ adjustments: s.adjustments, geometry: s.geometry }, snap)) return
    const history = s.history.slice(0, s.index + 1)
    history.push(clone(snap))
    set({
      history,
      index: history.length - 1,
      adjustments: snap.adjustments,
      geometry: snap.geometry,
      revision: s.revision + 1,
    })
  },

  resetSection: (keys) => {
    const s = get()
    const adjustments = { ...s.adjustments }
    for (const k of keys) adjustments[k] = DEFAULT_ADJUSTMENTS[k]
    const history = s.history.slice(0, s.index + 1)
    const next: Snapshot = { adjustments, geometry: s.geometry }
    history.push(clone(next))
    set({
      adjustments,
      history,
      index: history.length - 1,
      revision: s.revision + 1,
    })
  },

  setShowBefore: (v) => set((s) => ({ showBefore: v, revision: s.revision + 1 })),

  init: () =>
    set({
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      geometry: { ...DEFAULT_GEOMETRY },
      history: [initialSnapshot()],
      index: 0,
      showBefore: false,
      revision: 0,
    }),
}))
