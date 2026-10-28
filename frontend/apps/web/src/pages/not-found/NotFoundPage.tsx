import { Link } from 'react-router'
import { EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The address may be mistyped, or the page was moved."
      action={
        <Link to="/" className="text-sm font-medium text-primary">
          Go home
        </Link>
      }
    />
  )
}
