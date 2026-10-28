/** localStorage that never crashes (private windows and some webviews block it). */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string | null) {
    try {
      value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value)
    } catch {}
  }
}
