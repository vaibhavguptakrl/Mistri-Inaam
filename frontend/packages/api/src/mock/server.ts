import { ApiError } from '../errors'

/** What a fake endpoint receives. */
export interface MockRequest<Body = any> {
  params: Record<string, string>
  query: URLSearchParams
  body: Body
  /** The signed-in user's token, or null. */
  token: string | null
}

type Handler = (request: MockRequest) => unknown

const routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: Handler }> = []

/**
 * Registers a fake endpoint, used while project.config.json has "api": { "mode": "mock" }.
 *
 *   mock('GET', '/todos/:id', ({ params }) => todos.find(todo => todo.id === Number(params.id)))
 */
export function mock(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, handler: Handler) {
  const keys: string[] = []
  const source = path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })
  routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler })
}

/** Throw this from a fake endpoint to answer with an error, e.g. throw mockError(404, 'Todo not found'). */
export const mockError = (status: number, message: string) => new ApiError(status, message)

/** The next free id in a list of rows. */
export const nextId = (rows: Array<{ id: number }>) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function handleMock<T>(
  method: string,
  url: string,
  body: unknown,
  token: string | null,
  delayMs: number
): Promise<T> {
  await sleep(delayMs)
  const [path, search = ''] = url.split('?')
  for (const route of routes) {
    if (route.method !== method) continue
    const match = route.pattern.exec(path)
    if (!match) continue
    const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]))
    const result = await route.handler({ params, query: new URLSearchParams(search), body: body ?? {}, token })
    // A copy, so screens can't change the fake database by accident.
    return (result === undefined ? null : JSON.parse(JSON.stringify(result))) as T
  }
  throw new ApiError(
    404,
    `No fake data for ${method} ${path}. Add it with mock() in a *.mock.ts file in packages/api/src.`
  )
}
