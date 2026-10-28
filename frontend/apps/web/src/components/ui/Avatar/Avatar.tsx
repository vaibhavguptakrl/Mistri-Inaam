import { cn } from '@/lib/cn'

/** A round picture, or the person's initials when there is no picture. */
export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl' }[size]
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover', dimensions)} />
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary',
        dimensions
      )}
    >
      {initials}
    </span>
  )
}
