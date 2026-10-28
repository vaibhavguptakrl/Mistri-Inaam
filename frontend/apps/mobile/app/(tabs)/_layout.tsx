import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { projectConfig } from '@app/config'
import { useTheme } from '@/providers/ThemeProvider'

type IconName = keyof typeof Ionicons.glyphMap

const icon =
  (name: IconName) =>
  ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />

/**
 * The tabs at the bottom of the app. Each file in app/(tabs)/ is one tab.
 * Add one with: npm run generate page  (and answer "yes" to "show in navigation")
 */
export default function TabsLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: projectConfig.name, tabBarLabel: 'Home', tabBarIcon: icon('home-outline') }}
      />
      {/* demo:start */}
      <Tabs.Screen name="todos" options={{ title: 'Todos', tabBarIcon: icon('checkbox-outline') }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: icon('people-outline') }} />
      {/* demo:end */}
      {/* plop:tabs */}
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  )
}
