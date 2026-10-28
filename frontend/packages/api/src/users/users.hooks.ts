import { useQuery } from '@tanstack/react-query'
import { usersApi } from './users.api'

export const userKeys = {
  list: (search: string) => ['users', { search }] as const,
  one: (id: number) => ['users', id] as const
}

export function useUsers(search = '') {
  return useQuery({ queryKey: userKeys.list(search), queryFn: () => usersApi.list({ search }) })
}

export function useUser(id: number) {
  return useQuery({ queryKey: userKeys.one(id), queryFn: () => usersApi.get(id), select: (data) => data.user })
}
