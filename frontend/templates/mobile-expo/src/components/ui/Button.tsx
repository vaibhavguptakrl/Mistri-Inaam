import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string
  /** primary: the main action. secondary: other actions. ghost: low-key. danger: deletes things. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Shows a spinner and blocks taps while something is saving. */
  loading?: boolean
}

export function Button({ title, variant = 'primary', loading = false, disabled, style, ...props }: ButtonProps) {
  const { colors, radius, font } = useTheme()
  const background = {
    primary: colors.primary,
    secondary: colors.surfaceMuted,
    ghost: 'transparent',
    danger: colors.danger
  }[variant]
  const foreground = { primary: colors.onPrimary, secondary: colors.text, ghost: colors.text, danger: '#ffffff' }[
    variant
  ]
  const inactive = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.button,
        { backgroundColor: background, borderRadius: radius.md, opacity: inactive ? 0.5 : state.pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        typeof style === 'function' ? style(state) : style
      ]}
      {...props}
    >
      {loading && <ActivityIndicator color={foreground} />}
      <Text style={[styles.label, { color: foreground, fontFamily: font }]}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  label: { fontSize: 15, fontWeight: '600' }
})
