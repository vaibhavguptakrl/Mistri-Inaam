import { Pressable, StyleSheet, View } from 'react-native'
import { getApiSettings } from '@app/api'
import { projectConfig, type ColorMode } from '@app/config'
import { Card, Screen, Text } from '@/components/ui'
import { useTheme } from '@/providers/ThemeProvider'

const modes: Array<{ value: ColorMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Device' }
]

export default function SettingsScreen() {
  const { mode, setMode, colors, radius } = useTheme()
  const api = getApiSettings()
  return (
    <Screen>
      <Card>
        <Text style={{ fontWeight: '600' }}>Appearance</Text>
        <View style={[styles.segments, { borderColor: colors.border, borderRadius: radius.md }]}>
          {modes.map((option) => {
            const active = mode === option.value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setMode(option.value)}
                style={[
                  styles.segment,
                  { borderRadius: radius.sm, backgroundColor: active ? colors.primary : 'transparent' }
                ]}
              >
                <Text style={{ color: active ? colors.onPrimary : colors.textMuted, textAlign: 'center' }}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Card>
      <Card>
        <Text style={{ fontWeight: '600' }}>About this app</Text>
        <Text tone="muted">Name: {projectConfig.name}</Text>
        <Text tone="muted">Data: {api.useMocks ? 'Fake data (no backend)' : api.baseUrl}</Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', borderWidth: 1, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: 8 }
})
