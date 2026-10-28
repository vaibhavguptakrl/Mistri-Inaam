import type { ReactNode } from 'react'
import { HomePage } from '@/pages/home/HomePage'
import { LoginPage } from '@/pages/login/LoginPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
// demo:start
import { TodosPage } from '@/pages/todos/TodosPage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { UsersPage } from '@/pages/users/UsersPage'
// demo:end
// plop:imports

export interface AppRoute {
  /** The address, e.g. '/profile' or '/users/:id' (":id" is filled in from the address). */
  path: string
  element: ReactNode
  /** Shown in the navigation menu when set. Leave it out for pages you reach by a link. */
  label?: string
  /** Only signed-in users may open it; others are sent to /login first. */
  requiresLogin?: boolean
}

/**
 * Every page in the app. Add one with: npm run generate page
 * (it adds its own line here), or add a line by hand.
 */
export const routes: AppRoute[] = [
  { path: '/', element: <HomePage />, label: 'Home' },
  // demo:start
  { path: '/todos', element: <TodosPage />, label: 'Todos', requiresLogin: true },
  { path: '/users', element: <UsersPage />, label: 'Users' },
  { path: '/users/:id', element: <UserDetailPage /> },
  // demo:end
  // plop:routes
  { path: '/settings', element: <SettingsPage />, label: 'Settings' },
  { path: '/login', element: <LoginPage /> }
]
