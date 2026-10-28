import { cn } from '@/lib/cn'

/** A spinning circle that says "loading". */
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dimensions = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-10 border-[3px]' }[size]
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-primary',
        dimensions,
        className
      )}
    />
  )
}
