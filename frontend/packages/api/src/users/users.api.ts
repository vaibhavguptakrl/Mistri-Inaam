import { http } from '../client'
import type { User, UsersPage } from './users.types'

export const usersApi = {
  list: (filter: { search?: string } = {}) => http.get<UsersPage>('/users', filter),
  get: (id: number) => http.get<{ user: User }>(`/users/${id}`)
}
