import { projectConfig } from '@app/config'
import { ApiError } from './errors'
import { handleMock } from './mock/server'
import { authToken } from './token'

export interface ApiSettings {
  /** Where the backend lives, e.g. https://api.example.com/api/v1 */
  baseUrl: string
  /** true: answer every request with the fake data in the *.mock.ts files. No backend needed. */
  useMocks: boolean
  /** How long fake requests take, so loading spinners are visible. */
  mockDelayMs: number
  /** Give up on a request after this long. */
  timeoutMs: number
}

let settings: ApiSettings = {
  baseUrl: projectConfig.api.baseUrl,
  useMocks: projectConfig.api.mode === 'mock',
  mockDelayMs: 300,
  timeoutMs: 15000
}

/** Called once by each app at startup to override the defaults from project.config.json. */
export function configureApi(next: Partial<ApiSettings>) {
  settings = { ...settings, ...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)) }
}

export const getApiSettings = () => settings

export type Query = Record<string, string | number | boolean | undefined | null>
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const toSearch = (query?: Query) => {
  const entries = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)])
  return entries.length ? `?${new URLSearchParams(entries)}` : ''
}

interface ErrorItem {
  description?: string
  message?: string
}

/**
 * Sends one request. Understands both plain JSON answers and the
 * `{ data, errors }` envelope the backend boilerplate sends.
 */
async function request<T>(
  method: Method,
  path: string,
  { body, query }: { body?: unknown; query?: Query } = {}
): Promise<T> {
  const url = `${path}${toSearch(query)}`
  const token = authToken.get()
  if (settings.useMocks) return handleMock<T>(method, url, body, token, settings.mockDelayMs)

  let response: Response
  try {
    response = await fetch(`${settings.baseUrl}${url}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(settings.timeoutMs)
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your internet connection.')
  }

  const payload = await response.json().catch(() => null)
  const isEnvelope = payload !== null && typeof payload === 'object' && 'data' in payload && 'errors' in payload
  const errors: ErrorItem[] = isEnvelope && Array.isArray(payload.errors) ? payload.errors : []

  if (!response.ok || errors.length) {
    if (response.status === 401) authToken.set(null)
    const message =
      errors[0]?.description ?? errors[0]?.message ?? payload?.message ?? `Request failed (${response.status})`
    throw new ApiError(response.status, message, errors.length ? errors : payload)
  }
  return (isEnvelope ? payload.data : payload) as T
}

/** Use these in the *.api.ts files: http.get('/todos'), http.post('/todos', { title }) ... */
export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path)
}
