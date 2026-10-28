import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** What to show when a list has nothing in it yet. */
export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.box, { borderColor: colors.border, borderRadius: radius.lg }]}>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{title}</Text>
      {description ? <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{description}</Text> : null}
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderStyle: 'dashed', padding: 24, gap: 8, alignItems: 'center' }
})
