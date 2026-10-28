import { mock, mockError } from '../mock/server'
import type { User } from './auth.types'

// Demo login: any email works, the password is "password".
const DEMO_PASSWORD = 'password'
const TOKEN_PREFIX = 'demo.'

const userFor = (email: string): User => ({
  id: 1,
  name: email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()),
  email,
  role: 'admin',
  avatarUrl: null
})

// Fake data forgets everything on reload, so the demo token carries the email
// itself: a saved login still knows who you are after the page reloads.
const emailFromToken = (token: string | null) =>
  token?.startsWith(TOKEN_PREFIX) ? decodeURIComponent(token.split('.').slice(2).join('.')) : null

mock('POST', '/auth/login', ({ body }) => {
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  if (!email.includes('@')) throw mockError(422, 'Enter a valid email address')
  if (body.password !== DEMO_PASSWORD)
    throw mockError(401, `Wrong password. In demo mode the password is "${DEMO_PASSWORD}".`)
  const token = `${TOKEN_PREFIX}${Math.random().toString(36).slice(2)}.${encodeURIComponent(email)}`
  return { token, user: userFor(email) }
})

mock('GET', '/auth/me', ({ token }) => {
  const email = emailFromToken(token)
  if (!email) throw mockError(401, 'Please sign in')
  return { user: userFor(email) }
})

mock('POST', '/auth/logout', () => ({ signedOut: true }))
