import type { User } from '../auth/auth.types'

export type { User }

export interface UsersPage {
  users: User[]
  total: number
}
