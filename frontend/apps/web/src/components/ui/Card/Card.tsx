import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** A box with a border and padding, for grouping related things. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-surface p-5 shadow-sm', className)} {...props} />
}
