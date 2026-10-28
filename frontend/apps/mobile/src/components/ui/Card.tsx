import { StyleSheet, View, type ViewProps } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** A box with a border and padding, for grouping related things. */
export function Card({ style, ...props }: ViewProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        style
      ]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 8 }
})
