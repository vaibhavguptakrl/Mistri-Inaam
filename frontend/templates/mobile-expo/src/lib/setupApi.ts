import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { authToken, configureApi } from '@app/api'
import { projectConfig } from '@app/config'

const TOKEN_KEY = 'auth-token'

/**
 * On your phone, "localhost" is the phone itself. While developing, Expo knows
 * your computer's address (the one in the QR code), so use that instead.
 */
function reachableUrl(url: string) {
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0]
  return devHost ? url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${devHost}`) : url
}

/** Points the API at the right place and restores the saved login. Runs once at startup. */
export async function setupApi() {
  const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS
  configureApi({
    baseUrl: reachableUrl(process.env.EXPO_PUBLIC_API_URL ?? projectConfig.api.baseUrl),
    useMocks: useMocks === undefined ? projectConfig.api.mode === 'mock' : useMocks === 'true'
  })
  authToken.set(await AsyncStorage.getItem(TOKEN_KEY).catch(() => null))
  authToken.subscribe((token) => {
    void (token ? AsyncStorage.setItem(TOKEN_KEY, token) : AsyncStorage.removeItem(TOKEN_KEY))
  })
}
