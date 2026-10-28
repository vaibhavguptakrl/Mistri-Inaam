import { authToken, configureApi } from '@app/api'
import { projectConfig } from '@app/config'
import { reachableUrl } from './platform'
import { storage } from './storage'

const TOKEN_KEY = 'auth-token'

/**
 * Points the API at the right place and remembers the signed-in user between
 * visits. .env.local (VITE_API_URL, VITE_USE_MOCKS) wins over project.config.json.
 */
export function setupApi() {
  const env = import.meta.env
  configureApi({
    baseUrl: reachableUrl(env.VITE_API_URL ?? projectConfig.api.baseUrl),
    useMocks: env.VITE_USE_MOCKS === undefined ? projectConfig.api.mode === 'mock' : env.VITE_USE_MOCKS === 'true'
  })
  authToken.set(storage.get(TOKEN_KEY))
  authToken.subscribe((token) => storage.set(TOKEN_KEY, token))
}
