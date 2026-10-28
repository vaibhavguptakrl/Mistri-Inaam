import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import type { ColorMode } from '@app/config'
import { theme, type ThemeColors } from '@app/theme'

const MODE_KEY = 'theme-mode'

interface ThemeState {
  mode: ColorMode
  resolved: 'light' | 'dark'
  /** The colors for what is showing now: colors.primary, colors.text ... */
  colors: ThemeColors
  radius: typeof theme.radius
  font: string | undefined
  setMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [mode, setModeState] = useState<ColorMode>(theme.defaultMode)

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved)
      })
      .catch(() => {})
  }, [])

  const resolved = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode
  const value = useMemo<ThemeState>(
    () => ({
      mode,
      resolved,
      colors: theme[resolved],
      radius: theme.radius,
      font: theme.font.native,
      setMode: (next) => {
        setModeState(next)
        void AsyncStorage.setItem(MODE_KEY, next)
      }
    }),
    [mode, resolved]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Colors and corner sizes for the current light/dark mode. Use it in every component. */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
