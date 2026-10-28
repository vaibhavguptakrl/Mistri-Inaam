import type { ColorMode } from '@app/config'
import { useTheme } from '@/providers/ThemeProvider'

const next: Record<ColorMode, ColorMode> = { light: 'dark', dark: 'system', system: 'light' }
const icons: Record<ColorMode, string> = { light: '☀️', dark: '🌙', system: '🖥️' }

/** One button that cycles light → dark → follow the device. */
export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setMode(next[mode])}
      className="rounded-md px-2 py-1 text-lg hover:bg-surface-muted"
      title={`Theme: ${mode} (click to change)`}
      aria-label={`Theme: ${mode}. Change theme`}
    >
      {icons[mode]}
    </button>
  )
}
