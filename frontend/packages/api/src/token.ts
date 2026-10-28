type Listener = (token: string | null) => void

let current: string | null = null
const listeners = new Set<Listener>()

/**
 * The signed-in user's token, sent with every request. Each app saves it
 * (localStorage on web, AsyncStorage on Expo) by subscribing to changes.
 */
export const authToken = {
  get: () => current,
  set(next: string | null) {
    if (next === current) return
    current = next
    listeners.forEach((listener) => listener(next))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
}
