/**
 * src/lib/api/validate.ts
 *
 * Lightweight server-side validation helpers for API route handlers.
 *
 * No third-party dependency — pure TypeScript. Consistent error shape:
 *
 *   { field: string; message: string }[]
 *
 * Usage:
 *   import { Validator, apiError, apiOk } from "@/lib/api/validate"
 *
 *   const v = new Validator(body)
 *   v.required("email").email("email").maxLen("name", 120)
 *   if (v.hasErrors()) return apiError(v.errors(), 400)
 */

import { NextResponse } from "next/server"

/* ── Types ────────────────────────────────────────────────── */

export interface ValidationError {
  field:   string
  message: string
}

/* ── Response helpers ────────────────────────────────────── */

/**
 * 2xx success response with consistent shape.
 */
export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response with consistent shape.
 * `errors` can be a single string or an array of ValidationError objects.
 */
export function apiError(
  errors: string | ValidationError[],
  status: number
): NextResponse {
  if (typeof errors === "string") {
    return NextResponse.json({ success: false, error: errors }, { status })
  }
  return NextResponse.json({ success: false, errors }, { status })
}

/* ── Validator ────────────────────────────────────────────── */

export class Validator {
  private _errors: ValidationError[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _data: Record<string, any>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data: Record<string, any>) {
    this._data = data ?? {}
  }

  /** Field must be present and non-empty string. */
  required(field: string, label?: string): this {
    const v = this._data[field]
    if (v === undefined || v === null || String(v).trim() === "") {
      this._errors.push({ field, message: `${label ?? field} is required.` })
    }
    return this
  }

  /** Field, if present, must be a valid email format. */
  email(field: string, label?: string): this {
    const v = this._data[field]
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
      this._errors.push({ field, message: `${label ?? field} must be a valid email address.` })
    }
    return this
  }

  /** Field, if present, must be a number within [min, max]. */
  numberRange(field: string, min: number, max: number, label?: string): this {
    const v = this._data[field]
    if (v !== undefined && v !== null) {
      const n = Number(v)
      if (isNaN(n)) {
        this._errors.push({ field, message: `${label ?? field} must be a number.` })
      } else if (n < min || n > max) {
        this._errors.push({
          field,
          message: `${label ?? field} must be between ${min} and ${max}.`,
        })
      }
    }
    return this
  }

  /** Field, if present, must be a non-negative number. */
  nonNegative(field: string, label?: string): this {
    return this.numberRange(field, 0, Number.MAX_SAFE_INTEGER, label)
  }

  /** Field must be a string shorter than `limit` characters. */
  maxLen(field: string, limit: number, label?: string): this {
    const v = this._data[field]
    if (v !== undefined && String(v).length > limit) {
      this._errors.push({
        field,
        message: `${label ?? field} must be at most ${limit} characters.`,
      })
    }
    return this
  }

  /** Field must be one of the allowed values. */
  oneOf<T>(field: string, allowed: T[], label?: string): this {
    const v = this._data[field]
    if (v !== undefined && !allowed.includes(v as T)) {
      this._errors.push({
        field,
        message: `${label ?? field} must be one of: ${allowed.join(", ")}.`,
      })
    }
    return this
  }

  /** Field, if present, must be an ISO 8601 date string in the future. */
  futureDate(field: string, label?: string): this {
    const v = this._data[field]
    if (v) {
      const d = new Date(String(v))
      if (isNaN(d.getTime())) {
        this._errors.push({ field, message: `${label ?? field} must be a valid date.` })
      } else if (d <= new Date()) {
        this._errors.push({ field, message: `${label ?? field} must be a future date.` })
      }
    }
    return this
  }

  /** Field, if present, must be a valid URL string. */
  url(field: string, label?: string): this {
    const v = this._data[field]
    if (v) {
      try {
        new URL(String(v))
      } catch {
        this._errors.push({ field, message: `${label ?? field} must be a valid URL.` })
      }
    }
    return this
  }

  /** Returns true if any validation errors were recorded. */
  hasErrors(): boolean {
    return this._errors.length > 0
  }

  /** Returns the list of validation errors. */
  errors(): ValidationError[] {
    return this._errors
  }

  /** Returns the first error message, or undefined. */
  firstError(): string | undefined {
    return this._errors[0]?.message
  }
}
