import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'
import { RequireAuth } from '@/providers/RequireAuth'
import { routes } from './routes'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      ...routes.map((route) => ({
        path: route.path,
        element: route.requiresLogin ? <RequireAuth>{route.element}</RequireAuth> : route.element
      })),
      { path: '*', element: <NotFoundPage /> }
    ]
  }
])
