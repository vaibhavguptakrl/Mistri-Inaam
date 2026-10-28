import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** The page around a screen's content: background color, padding and scrolling. */
export function Screen({
  title,
  description,
  children,
  scroll = true
}: {
  title?: string
  description?: string
  children: ReactNode
  scroll?: boolean
}) {
  const { colors, font } = useTheme()
  const header = title ? (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text, fontFamily: font }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textMuted, fontFamily: font }]}>{description}</Text>
      ) : null}
    </View>
  ) : null
  if (!scroll)
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        {header}
        {children}
      </View>
    )
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20, gap: 16 },
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 }
})
