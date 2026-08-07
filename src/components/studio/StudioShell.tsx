"use client"

import { useReducer, useCallback } from "react"
import { UploadZone }         from "./UploadZone"
import { PromptInput }        from "./PromptInput"
import { ProcessingOverlay }  from "./ProcessingOverlay"
import { ResultPanel }        from "./ResultPanel"
import { AESTHETIC_CHIPS }    from "./AestheticChips"
import type {
  StudioState,
  StudioAPIResponse,
  StudioSuccessResponse,
  AestheticChip,
} from "@/types/studio"

interface StudioShellProps {
  /** Overrides the default chip set — admin-managed via /admin/ai-studio. */
  chips?: AestheticChip[]
}

/* ─────────────────────────────────────────────────────────────
   State machine
───────────────────────────────────────────────────────────── */
type Action =
  | { type: "SET_FILE";           file: File; previewUrl: string }
  | { type: "CLEAR_FILE"                                         }
  | { type: "SET_PROMPT";         prompt: string                 }
  | { type: "TOGGLE_AESTHETIC";   id: string                     }
  | { type: "SUBMIT"                                             }
  | { type: "SUCCESS";            result: StudioSuccessResponse  }
  | { type: "ERROR";              message: string                }
  | { type: "RESET"                                              }

const initialState: StudioState = {
  step:               "idle",
  file:               null,
  previewUrl:         null,
  prompt:             "",
  selectedAesthetics: [],
  result:             null,
  errorMessage:       null,
}

function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {

    case "SET_FILE": {
      /* Revoke old object URL to prevent memory leaks */
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      return {
        ...state,
        step:      "ready",
        file:      action.file,
        previewUrl: action.previewUrl,
      }
    }

    case "CLEAR_FILE": {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      return { ...state, step: "idle", file: null, previewUrl: null }
    }

    case "SET_PROMPT":
      return { ...state, prompt: action.prompt }

    case "TOGGLE_AESTHETIC": {
      const exists = state.selectedAesthetics.includes(action.id)
      return {
        ...state,
        selectedAesthetics: exists
          ? state.selectedAesthetics.filter((id) => id !== action.id)
          : [...state.selectedAesthetics, action.id],
      }
    }

    case "SUBMIT":
      return { ...state, step: "processing" }

    case "SUCCESS":
      return { ...state, step: "done", result: action.result, errorMessage: null }

    case "ERROR":
      return { ...state, step: "error", errorMessage: action.message }

    case "RESET": {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      return { ...initialState }
    }

    default:
      return state
  }
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export function StudioShell({ chips = AESTHETIC_CHIPS }: StudioShellProps = {}) {
  const [state, dispatch] = useReducer(reducer, initialState)

  /* ── File selection ── */
  const handleFileSelect = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file)
    dispatch({ type: "SET_FILE", file, previewUrl })
  }, [])

  /* ── Form submission ── */
  const handleSubmit = useCallback(async () => {
    if (!state.file || !state.prompt.trim()) return

    dispatch({ type: "SUBMIT" })

    /* Build the keyword list from selected chip IDs */
    const aestheticKeywords = state.selectedAesthetics.flatMap(
      (id) => chips.find((c) => c.id === id)?.keywords ?? []
    )

    const formData = new FormData()
    formData.append("image",      state.file)
    formData.append("prompt",     state.prompt.trim())
    formData.append("aesthetics", JSON.stringify(aestheticKeywords))

    try {
      const res  = await fetch("/api/studio/process", {
        method: "POST",
        body:   formData,
      })

      const data = await res.json() as StudioAPIResponse

      if (data.success) {
        dispatch({ type: "SUCCESS", result: data })
      } else {
        dispatch({ type: "ERROR", message: data.error })
      }
    } catch {
      dispatch({
        type:    "ERROR",
        message: "Network error — please check your connection and try again.",
      })
    }
  }, [state.file, state.prompt, state.selectedAesthetics, chips])

  const { step } = state

  /* ─────────────────────────────────────────────────────────
     PROCESSING STATE
  ───────────────────────────────────────────────────────── */
  if (step === "processing") {
    return <ProcessingOverlay prompt={state.prompt} />
  }

  /* ─────────────────────────────────────────────────────────
     DONE STATE
  ───────────────────────────────────────────────────────── */
  if (step === "done" && state.result && state.previewUrl) {
    return (
      <ResultPanel
        originalUrl={state.previewUrl}
        result={state.result}
        onReset={() => dispatch({ type: "RESET" })}
        userPrompt={state.prompt}
        sourceFile={state.file}
      />
    )
  }

  /* ─────────────────────────────────────────────────────────
     ERROR STATE
  ───────────────────────────────────────────────────────── */
  if (step === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[320px] rounded-2xl border border-red-500/20 bg-red-500/5 px-8 py-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full border border-red-500/30 bg-red-500/10">
          <ErrorIcon />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-display font-bold text-foreground text-[1rem]">Something went wrong</p>
          <p className="text-[0.875rem] text-muted/92 max-w-sm leading-relaxed">
            {state.errorMessage ?? "An unexpected error occurred."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET" })}
          className="rounded-full border border-border px-6 py-2.5 text-[0.875rem] font-medium text-foreground transition-colors hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </div>
    )
  }

  /* ─────────────────────────────────────────────────────────
     IDLE / READY STATE — main input UI
  ───────────────────────────────────────────────────────── */
  return (
    <div className="grid lg:grid-cols-2 gap-8 items-stretch">

      {/* Left — Upload zone */}
      <UploadZone
        file={state.file}
        previewUrl={state.previewUrl}
        onFileSelect={handleFileSelect}
        onClear={() => dispatch({ type: "CLEAR_FILE" })}
      />

      {/* Right — Prompt + chips + submit */}
      <PromptInput
        prompt={state.prompt}
        selectedAesthetics={state.selectedAesthetics}
        hasFile={state.file !== null}
        isSubmitting={false}
        onPromptChange={(v) => dispatch({ type: "SET_PROMPT", prompt: v })}
        onToggleAesthetic={(id) => dispatch({ type: "TOGGLE_AESTHETIC", id })}
        onSubmit={handleSubmit}
        chips={chips}
      />

    </div>
  )
}

/* ── Icons ── */
function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
