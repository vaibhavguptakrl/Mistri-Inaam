import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

export interface InputProps extends TextInputProps {
  label?: string
  /** Shown in red under the field. */
  error?: string | null
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors, radius, font } = useTheme()
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: colors.text, fontFamily: font }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.sm,
            fontFamily: font
          },
          style
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500' },
  input: { minHeight: 44, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  error: { fontSize: 12 }
})
