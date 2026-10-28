import { mock, mockError } from '../mock/server'
import type { User } from './users.types'

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', avatarUrl: null },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'member', avatarUrl: null },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', role: 'member', avatarUrl: null },
  { id: 4, name: 'Katherine Johnson', email: 'katherine@example.com', role: 'member', avatarUrl: null },
  { id: 5, name: 'Linus Torvalds', email: 'linus@example.com', role: 'member', avatarUrl: null }
]

mock('GET', '/users', ({ query }) => {
  const search = (query.get('search') ?? '').toLowerCase()
  const rows = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search))
  return { users: rows, total: rows.length }
})

mock('GET', '/users/:id', ({ params }) => {
  const user = users.find((row) => row.id === Number(params.id))
  if (!user) throw mockError(404, 'User not found')
  return { user }
})
