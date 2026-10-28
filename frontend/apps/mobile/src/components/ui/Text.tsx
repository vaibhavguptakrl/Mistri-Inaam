import { Text as NativeText, type TextProps } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** Text in the theme's font and color. tone="muted" for secondary text. */
export function Text({
  tone = 'default',
  style,
  ...props
}: TextProps & { tone?: 'default' | 'muted' | 'primary' | 'danger' }) {
  const { colors, font } = useTheme()
  const color = { default: colors.text, muted: colors.textMuted, primary: colors.primary, danger: colors.danger }[tone]
  return <NativeText style={[{ color, fontFamily: font, fontSize: 15 }, style]} {...props} />
}
