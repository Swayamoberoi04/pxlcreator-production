/**
 * src/lib/editor/store.ts
 *
 * The editor's state container (Zustand). Holds the complete non-destructive
 * parameter model (Phase 1 + Phase 2) plus a full undo/redo history.
 *
 * HISTORY MODEL
 * -------------
 * `history` is an array of committed snapshots; `index` points at the current
 * one. The live top-level fields are what the canvas renders every frame.
 *
 *   - Dragging a control mutates the live fields only (smooth, no history spam).
 *   - Releasing calls `commit` → if the live state differs from the snapshot at
 *     `index`, we truncate any redo branch and push a checkpoint.
 *   - `undo`/`redo`/`jumpTo` move `index` and copy that snapshot back.
 *
 * Continuous dragging is therefore one undo step, and the AI original is always
 * snapshot 0 (Reset returns to it). Snapshots are compared/cloned generically so
 * adding a parameter group needs no bespoke equality code.
 */

import { create } from "zustand"
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GEOMETRY,
  DEFAULT_CURVES,
  DEFAULT_HSL,
  DEFAULT_GRADING,
  DEFAULT_VIGNETTE,
  DEFAULT_GRAIN,
  DEFAULT_NOISE,
  type Adjustments,
  type AdjustmentKey,
  type Geometry,
  type CropRect,
  type Curves,
  type CurveChannel,
  type CurvePoint,
  type HSL,
  type HSLBand,
  type ColorGrading,
  type GradeZone,
  type GradeZoneKey,
  type Vignette,
  type Grain,
  type NoiseReduction,
  type RenderSettings,
  type Mask,
  type MaskType,
  type MaskAdjustmentKey,
  createMask,
} from "./adjustments"

/** A full editor snapshot — everything undo/redo and sessions persist. */
export interface Snapshot {
  adjustments: Adjustments
  geometry: Geometry
  curves: Curves
  hsl: HSL
  grading: ColorGrading
  vignette: Vignette
  grain: Grain
  noise: NoiseReduction
  masks: Mask[]
}

export type ResetGroup = "curves" | "hsl" | "grading" | "vignette" | "grain" | "noise"

interface EditorStore extends Snapshot {
  history: Snapshot[]
  index: number
  showBefore: boolean
  /** Currently selected mask (UI state, not part of the edit snapshot). */
  activeMaskId: string | null
  /** Brush tool settings (UI state, shared by the overlay + controls). */
  brushRadius: number
  brushFeather: number
  brushErase: boolean
  setBrush: (partial: Partial<{ brushRadius: number; brushFeather: number; brushErase: boolean }>) => void
  /** Bumped whenever the live state changes so the canvas re-renders. */
  revision: number

  // ── live edits (no history) ──
  setAdjustment: (key: AdjustmentKey, value: number) => void
  setGeometry: (partial: Partial<Geometry>) => void
  setCrop: (crop: CropRect | null) => void
  setCurve: (channel: CurveChannel, points: CurvePoint[]) => void
  setHSLBand: (index: number, partial: Partial<HSLBand>) => void
  setGrade: (zone: GradeZoneKey, partial: Partial<GradeZone>) => void
  setGradingParam: (partial: Partial<Pick<ColorGrading, "blending" | "balance">>) => void
  setVignette: (partial: Partial<Vignette>) => void
  setGrain: (partial: Partial<Grain>) => void
  setNoise: (partial: Partial<NoiseReduction>) => void

  // ── history checkpoints ──
  commit: () => void
  undo: () => void
  redo: () => void
  jumpTo: (index: number) => void
  canUndo: () => boolean
  canRedo: () => boolean

  // ── masks (Phase 3) ──
  addMask: (type: MaskType) => void
  deleteMask: (id: string) => void
  selectMask: (id: string | null) => void
  updateMask: (id: string, partial: Partial<Mask>) => void
  setMaskAdjustment: (id: string, key: MaskAdjustmentKey, value: number) => void

  // ── bulk / sessions ──
  applyAdjustments: (partial: Partial<Adjustments>) => void
  loadSnapshot: (snap: Snapshot) => void

  // ── resets ──
  resetAll: () => void
  resetSection: (keys: AdjustmentKey[]) => void
  resetGroup: (group: ResetGroup) => void

  // ── view ──
  setShowBefore: (v: boolean) => void

  /** Reset the whole store when a new image is opened. */
  init: () => void
}

/* ── Snapshot helpers (generic, so new groups need no bespoke code) ── */
const deepClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

const emptySnapshot = (): Snapshot => ({
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  geometry: { ...DEFAULT_GEOMETRY },
  curves: deepClone(DEFAULT_CURVES),
  hsl: deepClone(DEFAULT_HSL),
  grading: deepClone(DEFAULT_GRADING),
  vignette: { ...DEFAULT_VIGNETTE },
  grain: { ...DEFAULT_GRAIN },
  noise: { ...DEFAULT_NOISE },
  masks: [],
})

export const snapshotOf = (s: Snapshot): Snapshot => ({
  adjustments: s.adjustments,
  geometry: s.geometry,
  curves: s.curves,
  hsl: s.hsl,
  grading: s.grading,
  vignette: s.vignette,
  grain: s.grain,
  noise: s.noise,
  masks: s.masks,
})

const snapshotsEqual = (a: Snapshot, b: Snapshot): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

/** The subset of a snapshot the WebGL engine consumes (no geometry). */
export function renderSettingsFrom(s: Snapshot): RenderSettings {
  return {
    adjustments: s.adjustments,
    curves: s.curves,
    hsl: s.hsl,
    grading: s.grading,
    vignette: s.vignette,
    grain: s.grain,
    noise: s.noise,
    masks: s.masks,
  }
}

export const useEditorStore = create<EditorStore>((set, get) => {
  /** Push the current live state as a history checkpoint (if it changed). */
  const checkpoint = (next: Partial<Snapshot>) => {
    const s = get()
    const merged: Snapshot = { ...snapshotOf(s), ...next }
    const history = s.history.slice(0, s.index + 1)
    history.push(deepClone(merged))
    set({ ...next, history, index: history.length - 1, revision: s.revision + 1 })
  }

  const live = (next: Partial<Snapshot>) =>
    set((s) => ({ ...next, revision: s.revision + 1 }))

  return {
    ...emptySnapshot(),
    history: [emptySnapshot()],
    index: 0,
    showBefore: false,
    activeMaskId: null,
    brushRadius: 0.06,
    brushFeather: 0.5,
    brushErase: false,
    setBrush: (partial) => set(partial),
    revision: 0,

    // ── live edits ──
    setAdjustment: (key, value) =>
      live({ adjustments: { ...get().adjustments, [key]: value } }),
    setGeometry: (partial) => live({ geometry: { ...get().geometry, ...partial } }),
    setCrop: (crop) => live({ geometry: { ...get().geometry, crop } }),
    setCurve: (channel, points) => live({ curves: { ...get().curves, [channel]: points } }),
    setHSLBand: (index, partial) =>
      live({ hsl: get().hsl.map((b, i) => (i === index ? { ...b, ...partial } : b)) }),
    setGrade: (zone, partial) =>
      live({ grading: { ...get().grading, [zone]: { ...get().grading[zone], ...partial } } }),
    setGradingParam: (partial) => live({ grading: { ...get().grading, ...partial } }),
    setVignette: (partial) => live({ vignette: { ...get().vignette, ...partial } }),
    setGrain: (partial) => live({ grain: { ...get().grain, ...partial } }),
    setNoise: (partial) => live({ noise: { ...get().noise, ...partial } }),

    // ── masks ──
    addMask: (type) => {
      const s = get()
      const mask = createMask(type)
      const masks = [...s.masks, mask]
      const history = s.history.slice(0, s.index + 1)
      history.push(deepClone({ ...snapshotOf(s), masks }))
      set({ masks, history, index: history.length - 1, activeMaskId: mask.id, revision: s.revision + 1 })
    },
    deleteMask: (id) => {
      const s = get()
      const masks = s.masks.filter((m) => m.id !== id)
      const history = s.history.slice(0, s.index + 1)
      history.push(deepClone({ ...snapshotOf(s), masks }))
      set({
        masks,
        history,
        index: history.length - 1,
        activeMaskId: s.activeMaskId === id ? null : s.activeMaskId,
        revision: s.revision + 1,
      })
    },
    selectMask: (id) => set({ activeMaskId: id }),
    updateMask: (id, partial) =>
      live({ masks: get().masks.map((m) => (m.id === id ? { ...m, ...partial } : m)) }),
    setMaskAdjustment: (id, key, value) =>
      live({
        masks: get().masks.map((m) =>
          m.id === id ? { ...m, adjustments: { ...m.adjustments, [key]: value } } : m
        ),
      }),

    // ── history ──
    commit: () => {
      const s = get()
      if (snapshotsEqual(snapshotOf(s), s.history[s.index])) return
      const history = s.history.slice(0, s.index + 1)
      history.push(deepClone(snapshotOf(s)))
      set({ history, index: history.length - 1 })
    },

    undo: () => {
      const s = get()
      if (s.index <= 0) return
      const index = s.index - 1
      const snap = deepClone(s.history[index])
      const activeMaskId = snap.masks.some((m) => m.id === s.activeMaskId) ? s.activeMaskId : null
      set({ ...snap, index, activeMaskId, revision: s.revision + 1 })
    },

    redo: () => {
      const s = get()
      if (s.index >= s.history.length - 1) return
      const index = s.index + 1
      const snap = deepClone(s.history[index])
      const activeMaskId = snap.masks.some((m) => m.id === s.activeMaskId) ? s.activeMaskId : null
      set({ ...snap, index, activeMaskId, revision: s.revision + 1 })
    },

    jumpTo: (index) => {
      const s = get()
      if (index < 0 || index >= s.history.length || index === s.index) return
      const snap = deepClone(s.history[index])
      const activeMaskId = snap.masks.some((m) => m.id === s.activeMaskId) ? s.activeMaskId : null
      set({ ...snap, index, activeMaskId, revision: s.revision + 1 })
    },

    canUndo: () => get().index > 0,
    canRedo: () => get().index < get().history.length - 1,

    // ── bulk / sessions ──
    applyAdjustments: (partial) =>
      checkpoint({ adjustments: { ...DEFAULT_ADJUSTMENTS, ...partial } }),

    loadSnapshot: (snap) => {
      checkpoint(deepClone(snap))
      set({ activeMaskId: null })
    },

    // ── resets ──
    resetAll: () => {
      const s = get()
      const empty = emptySnapshot()
      if (snapshotsEqual(snapshotOf(s), empty)) return
      checkpoint(empty)
      set({ activeMaskId: null })
    },

    resetSection: (keys) => {
      const adjustments = { ...get().adjustments }
      for (const k of keys) adjustments[k] = DEFAULT_ADJUSTMENTS[k]
      checkpoint({ adjustments })
    },

    resetGroup: (group) => {
      switch (group) {
        case "curves":
          return checkpoint({ curves: deepClone(DEFAULT_CURVES) })
        case "hsl":
          return checkpoint({ hsl: deepClone(DEFAULT_HSL) })
        case "grading":
          return checkpoint({ grading: deepClone(DEFAULT_GRADING) })
        case "vignette":
          return checkpoint({ vignette: { ...DEFAULT_VIGNETTE } })
        case "grain":
          return checkpoint({ grain: { ...DEFAULT_GRAIN } })
        case "noise":
          return checkpoint({ noise: { ...DEFAULT_NOISE } })
      }
    },

    // ── view ──
    setShowBefore: (v) => set((s) => ({ showBefore: v, revision: s.revision + 1 })),

    init: () =>
      set({
        ...emptySnapshot(),
        history: [emptySnapshot()],
        index: 0,
        showBefore: false,
        activeMaskId: null,
        revision: 0,
      }),
  }
})
