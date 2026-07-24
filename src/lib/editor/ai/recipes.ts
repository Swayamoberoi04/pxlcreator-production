/**
 * src/lib/editor/ai/recipes.ts
 *
 * Edit Recipes — a named, reusable, shareable adjustment stack (the full
 * non-destructive snapshot). Recipes persist in localStorage and can be
 * exported as JSON or a compact shareable code, and imported back. This is the
 * portable, community-ready form of an edit; the in-app "Sessions" are the
 * quick local resume, recipes are the thing you name, keep, and share.
 */

import type { Snapshot } from "../store"

const KEY = "pxl-editor-recipes"
const MAX = 100

export interface EditRecipe {
  id: string
  name: string
  createdAt: number
  snapshot: Snapshot
}

function read(): EditRecipe[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as EditRecipe[]) : []
  } catch {
    return []
  }
}
function write(list: EditRecipe[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* best-effort */
  }
}

export function listRecipes(): EditRecipe[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveRecipe(name: string, snapshot: Snapshot): EditRecipe {
  const recipe: EditRecipe = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Untitled Recipe",
    createdAt: Date.now(),
    snapshot,
  }
  write([recipe, ...read()])
  return recipe
}

export function deleteRecipe(id: string): void {
  write(read().filter((r) => r.id !== id))
}

/** Download a recipe as a .json file. */
export function exportRecipeFile(recipe: EditRecipe): void {
  const blob = new Blob([JSON.stringify({ name: recipe.name, snapshot: recipe.snapshot }, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${recipe.name.replace(/[^\w-]+/g, "-").toLowerCase()}.pxlrecipe.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Compact, copy-pasteable share code (base64 of the recipe payload). */
export function encodeShareCode(name: string, snapshot: Snapshot): string {
  const json = JSON.stringify({ v: 1, name, snapshot })
  const b64 = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(json))) : ""
  return `PXL1:${b64}`
}

export function decodeShareCode(code: string): { name: string; snapshot: Snapshot } | null {
  try {
    const b64 = code.trim().replace(/^PXL1:/, "")
    const json = decodeURIComponent(escape(window.atob(b64)))
    const parsed = JSON.parse(json)
    if (parsed && parsed.snapshot) return { name: parsed.name ?? "Imported Recipe", snapshot: parsed.snapshot }
    return null
  } catch {
    return null
  }
}
