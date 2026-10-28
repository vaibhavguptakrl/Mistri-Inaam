import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '@/components/ui'
import { useAuth } from './AuthProvider'

/** Shows its children only to signed-in users; everyone else goes to /login and comes back after. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  if (!isSignedIn) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  return children
}
