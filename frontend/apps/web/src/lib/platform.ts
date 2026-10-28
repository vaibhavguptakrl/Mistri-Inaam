/**
 * Where this code is running. The same screens run in a browser, inside the
 * Capacitor mobile app (Android / iPhone) and inside the Electron desktop app.
 */

declare global {
  interface Window {
    /** Added by Capacitor inside the mobile app. */
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }
    /** Added by apps/desktop/preload.cjs inside the desktop app. */
    desktop?: { isDesktop: true; os: string; version: string }
  }
}

export type Platform = 'web' | 'android' | 'ios' | 'desktop'

function detect(): Platform {
  if (typeof window === 'undefined') return 'web'
  if (window.desktop?.isDesktop) return 'desktop'
  if (window.Capacitor?.isNativePlatform?.()) {
    const name = window.Capacitor.getPlatform?.()
    if (name === 'android' || name === 'ios') return name
  }
  return 'web'
}

export const platform: Platform = detect()
export const isMobileApp = platform === 'android' || platform === 'ios'
export const isDesktopApp = platform === 'desktop'

/**
 * The Android emulator can't reach your computer as "localhost"; it uses
 * 10.0.2.2 instead. This swaps it so a local backend works from the emulator.
 */
export function reachableUrl(url: string) {
  return platform === 'android' ? url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, '//10.0.2.2') : url
}
