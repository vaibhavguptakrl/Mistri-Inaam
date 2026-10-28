import { beforeEach, describe, expect, it } from 'vitest'
import { configureApi } from '../client'
import { usersApi } from './users.api'
import './users.mock'

beforeEach(() => configureApi({ useMocks: true, mockDelayMs: 0 }))

describe('users API (fake data)', () => {
  it('searches users by name', async () => {
    const { users } = await usersApi.list({ search: 'grace' })
    expect(users.map((user) => user.name)).toEqual(['Grace Hopper'])
  })

  it('answers 404 for an unknown user', async () => {
    await expect(usersApi.get(999)).rejects.toMatchObject({ status: 404 })
  })
})
