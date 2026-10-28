import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ColorMode } from '@app/config'
import { theme, toCssVariables } from '@app/theme'
import { storage } from '@/lib/storage'

const MODE_KEY = 'theme-mode'

interface ThemeState {
  /** What the person picked: light, dark or system (follow the device). */
  mode: ColorMode
  /** What is actually showing right now. */
  resolved: 'light' | 'dark'
  setMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

const savedMode = (): ColorMode => {
  const saved = storage.get(MODE_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : theme.defaultMode
}

/** Writes the theme's CSS variables onto <html>. Also called before the first render to avoid a flash. */
export function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  const variables = {
    ...toCssVariables(theme[resolved]),
    '--theme-radius-sm': `${theme.radius.sm}px`,
    '--theme-radius-md': `${theme.radius.md}px`,
    '--theme-radius-lg': `${theme.radius.lg}px`,
    '--theme-font': theme.font.web
  }
  for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

export const initialResolvedTheme = () => {
  const mode = savedMode()
  return mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(savedMode)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
  useEffect(() => applyTheme(resolved), [resolved])

  const value = useMemo<ThemeState>(
    () => ({
      mode,
      resolved,
      setMode: (next) => {
        storage.set(MODE_KEY, next)
        setModeState(next)
      }
    }),
    [mode, resolved]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
