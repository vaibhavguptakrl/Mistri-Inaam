import { projectConfig, type ColorMode, type FontStyle, type Radius } from '@app/config'
import { brandPalettes } from './palettes'

export { brandPalettes }

/** Every color the apps use. Use these names instead of hard-coded hex values. */
export interface ThemeColors {
  background: string
  surface: string
  surfaceMuted: string
  border: string
  text: string
  textMuted: string
  primary: string
  onPrimary: string
  danger: string
  success: string
  warning: string
}

export interface Theme {
  light: ThemeColors
  dark: ThemeColors
  /** Corner radius in pixels: small (inputs, chips), medium (buttons, cards), large (dialogs). */
  radius: { sm: number; md: number; lg: number }
  /** CSS font stack (web, desktop) and React Native font family (mobile). */
  font: { web: string; native: string | undefined }
  /** Light, dark, or follow the device. */
  defaultMode: ColorMode
}

const radii: Record<Radius, Theme['radius']> = {
  sharp: { sm: 2, md: 4, lg: 6 },
  rounded: { sm: 6, md: 10, lg: 16 },
  pill: { sm: 999, md: 999, lg: 24 }
}

const fonts: Record<FontStyle, Theme['font']> = {
  modern: { web: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', native: undefined },
  friendly: { web: 'ui-rounded, "SF Pro Rounded", "Nunito", "Quicksand", system-ui, sans-serif', native: undefined },
  classic: { web: 'Georgia, "Times New Roman", ui-serif, serif', native: 'serif' },
  mono: { web: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace', native: 'monospace' }
}

export function createTheme(settings = projectConfig.theme): Theme {
  const brand = brandPalettes[settings.brand] ?? brandPalettes.indigo
  return {
    light: {
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceMuted: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: brand.light,
      onPrimary: brand.onLight,
      danger: '#dc2626',
      success: '#16a34a',
      warning: '#d97706'
    },
    dark: {
      background: '#0b0f17',
      surface: '#121826',
      surfaceMuted: '#1b2333',
      border: '#263042',
      text: '#e5e7eb',
      textMuted: '#94a3b8',
      primary: brand.dark,
      onPrimary: brand.onDark,
      danger: '#f87171',
      success: '#4ade80',
      warning: '#fbbf24'
    },
    radius: radii[settings.radius] ?? radii.rounded,
    font: fonts[settings.font] ?? fonts.modern,
    defaultMode: settings.mode
  }
}

/** The theme built from project.config.json. */
export const theme = createTheme()

/** "surfaceMuted" -> "--theme-surface-muted": the CSS variable the web app uses for each color. */
export const cssVarName = (key: string) => `--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`

/** CSS variables for one color mode, e.g. { '--theme-primary': '#4f46e5', ... }. */
export function toCssVariables(colors: ThemeColors): Record<string, string> {
  return Object.fromEntries(Object.entries(colors).map(([key, value]) => [cssVarName(key), value]))
}
