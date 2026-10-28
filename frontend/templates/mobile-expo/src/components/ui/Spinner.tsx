import { ActivityIndicator, View } from 'react-native'
import { useTheme } from '@/providers/ThemeProvider'

/** A spinning circle that says "loading". */
export function Spinner() {
  const { colors } = useTheme()
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}
