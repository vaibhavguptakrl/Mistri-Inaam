/** Joins class names, skipping empty ones: cn('p-2', isActive && 'bg-primary') */
export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')
