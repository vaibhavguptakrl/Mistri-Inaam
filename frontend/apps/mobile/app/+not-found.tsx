import { Link, Stack } from 'expo-router'
import { EmptyState, Screen, Text } from '@/components/ui'

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState
        title="Screen not found"
        action={
          <Link href="/">
            <Text tone="primary">Go home</Text>
          </Link>
        }
      />
    </Screen>
  )
}
