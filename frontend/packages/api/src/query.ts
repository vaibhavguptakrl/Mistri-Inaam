import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'

/**
 * Caches what the API sends back, so screens load instantly the second time.
 * Each app creates one and wraps itself in <QueryClientProvider client={...}>.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Don't retry answers that won't change on a retry (not found, not allowed, bad input).
        retry: (failures, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 2
      }
    }
  })
}
