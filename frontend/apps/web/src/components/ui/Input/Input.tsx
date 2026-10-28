import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Shown in red under the field. */
  error?: string | null
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 rounded-sm border bg-surface px-3 text-sm text-text placeholder:text-text-muted',
          'focus:outline-2 focus:outline-offset-0 focus:outline-primary',
          error ? 'border-danger' : 'border-border'
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-note` : undefined}
        {...props}
      />
      {(error || hint) && (
        <p id={`${inputId}-note`} className={cn('text-xs', error ? 'text-danger' : 'text-text-muted')}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
