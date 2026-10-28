import { StyleSheet, Text, View } from 'react-native'
import { errorMessage } from '@app/api'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from './Button'

/** A friendly red box for something that went wrong, with an optional "Try again" button. */
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <View accessibilityRole="alert" style={[styles.box, { borderColor: colors.danger, borderRadius: radius.md }]}>
      <Text style={{ color: colors.danger, flex: 1 }}>{errorMessage(error)}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' }
})
