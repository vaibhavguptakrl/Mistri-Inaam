import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from './auth.api'

export const authKeys = {
  me: ['auth', 'me'] as const
}

/** The signed-in user (data is undefined while loading, error when signed out). */
export function useMe(enabled = true) {
  return useQuery({ queryKey: authKeys.me, queryFn: authApi.me, enabled, retry: false })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => queryClient.setQueryData(authKeys.me, { user: session.user })
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => queryClient.clear()
  })
}
