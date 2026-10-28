import { beforeEach, describe, expect, it } from 'vitest'
import { configureApi } from '../client'
import { authToken } from '../token'
import { authApi } from './auth.api'
import './auth.mock'

beforeEach(() => configureApi({ useMocks: true, mockDelayMs: 0 }))

describe('auth API (fake data)', () => {
  it('signs in with the demo password and remembers the token', async () => {
    await expect(authApi.login({ email: 'me@example.com', password: 'nope' })).rejects.toMatchObject({ status: 401 })
    const session = await authApi.login({ email: 'me@example.com', password: 'password' })
    expect(authToken.get()).toBe(session.token)
    expect((await authApi.me()).user.email).toBe('me@example.com')
    await authApi.logout()
    expect(authToken.get()).toBeNull()
  })
})
