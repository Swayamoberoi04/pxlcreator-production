"use client"

import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

/** Label + input + error/hint wrapper — the shared shape every admin form field uses. */
export function FormField({ label, htmlFor, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[0.75rem] font-medium text-white/60">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <span className="text-[0.75rem] text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-[0.7rem] text-white/35">{hint}</span>
      ) : null}
    </div>
  )
}

/** Section wrapper for grouping related fields inside a longer admin form. */
export function FormSection({ title, description, children, className }: {
  title: string; description?: string; children: React.ReactNode; className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5", className)}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[0.8125rem] font-semibold text-white/85">{title}</h3>
        {description && <p className="text-[0.75rem] text-white/40">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Text input matching .admin-input, exposed as a component for consistent props (error state etc). */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, className, ...rest } = props
  return (
    <input
      {...rest}
      className={cn("admin-input", error && "border-red-500/50", className)}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  const { error, className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={cn("admin-input min-h-[7rem] resize-y", error && "border-red-500/50", className)}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  const { error, className, children, ...rest } = props
  return (
    <select {...rest} className={cn("admin-input", error && "border-red-500/50", className)}>
      {children}
    </select>
  )
}
