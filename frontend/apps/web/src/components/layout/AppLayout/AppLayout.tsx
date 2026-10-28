import { NavLink, Outlet, useNavigate } from 'react-router'
import { projectConfig } from '@app/config'
import { routes } from '@/app/routes'
import { Avatar, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from '@/providers/AuthProvider'
import { ThemeToggle } from '../ThemeToggle'

const navRoutes = routes.filter((route) => route.label)

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-muted hover:text-text'
  )

/**
 * The frame around every page: a top bar on wide screens, a bottom tab bar on
 * phones. The page itself appears where <Outlet /> is.
 */
export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <NavLink to="/" className="font-semibold text-text">
            {projectConfig.name}
          </NavLink>
          <nav className="hidden flex-1 gap-1 sm:flex">
            {navRoutes.map((route) => (
              <NavLink key={route.path} to={route.path} end={route.path === '/'} className={linkClass}>
                {route.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <Button size="sm" variant="ghost" onClick={() => signOut().then(() => navigate('/'))}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        {navRoutes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            end={route.path === '/'}
            className={({ isActive }) =>
              cn('flex-1 py-3 text-center text-xs font-medium', isActive ? 'text-primary' : 'text-text-muted')
            }
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
