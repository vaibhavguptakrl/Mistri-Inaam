import type { BrandColor } from '@app/config'

/** The main ("primary") color for each brand choice, in light and dark mode. */
export const brandPalettes: Record<BrandColor, { light: string; dark: string; onLight: string; onDark: string }> = {
  indigo: { light: '#4f46e5', dark: '#818cf8', onLight: '#ffffff', onDark: '#0b0b1a' },
  emerald: { light: '#059669', dark: '#34d399', onLight: '#ffffff', onDark: '#04160f' },
  rose: { light: '#e11d48', dark: '#fb7185', onLight: '#ffffff', onDark: '#1c0509' },
  amber: { light: '#d97706', dark: '#fbbf24', onLight: '#ffffff', onDark: '#1a1203' },
  sky: { light: '#0284c7', dark: '#38bdf8', onLight: '#ffffff', onDark: '#03131d' },
  violet: { light: '#7c3aed', dark: '#a78bfa', onLight: '#ffffff', onDark: '#12081f' },
  slate: { light: '#334155', dark: '#cbd5e1', onLight: '#ffffff', onDark: '#0f172a' }
}
