import { http } from '../client'
import { authToken } from '../token'
import type { LoginInput, Session, User } from './auth.types'

export const authApi = {
  /** Signs in and remembers the token for later requests. */
  login: async (input: LoginInput) => {
    const session = await http.post<Session>('/auth/login', input)
    authToken.set(session.token)
    return session
  },
  /** The signed-in user. Fails with status 401 when nobody is signed in. */
  me: () => http.get<{ user: User }>('/auth/me'),
  logout: async () => {
    await http.post('/auth/logout').catch(() => {})
    authToken.set(null)
  }
}
