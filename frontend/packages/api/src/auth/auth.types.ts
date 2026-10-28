export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'member'
  avatarUrl: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface Session {
  token: string
  user: User
}
