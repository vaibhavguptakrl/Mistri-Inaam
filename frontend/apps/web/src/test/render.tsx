import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { configureApi, createQueryClient } from '@app/api'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

/**
 * Renders a page or component with everything the app normally wraps it in
 * (theme, data cache, signed-in user, router), using fake data with no delay.
 *   renderWithProviders(<TodosPage />, { route: '/todos' })
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  configureApi({ useMocks: true, mockDelayMs: 0 })
  const queryClient = createQueryClient()
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
