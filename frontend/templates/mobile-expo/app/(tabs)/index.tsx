import { router } from 'expo-router'
import { getApiSettings } from '@app/api'
import { projectConfig } from '@app/config'
import { Button, Card, Screen, Text } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'

const steps = [
  { title: 'Describe what you want', text: 'Tell your AI assistant about the screen or feature in plain words.' },
  {
    title: 'Let it use the generators',
    text: 'It runs npm run generate to create screens, components and APIs the right way.'
  },
  { title: 'Check it on your phone', text: 'Expo Go reloads by itself whenever a file changes.' }
]

export default function HomeScreen() {
  const { user, signOut } = useAuth()
  return (
    <Screen
      title={`Welcome to ${projectConfig.name}`}
      description="Edit apps/mobile/app/(tabs)/index.tsx to change this screen."
    >
      <Text tone="muted">
        {getApiSettings().useMocks
          ? 'Using fake data (no backend needed).'
          : `Connected to ${getApiSettings().baseUrl}`}
      </Text>
      {steps.map((step, index) => (
        <Card key={step.title}>
          <Text tone="primary" style={{ fontWeight: '600' }}>
            Step {index + 1}
          </Text>
          <Text style={{ fontWeight: '600' }}>{step.title}</Text>
          <Text tone="muted">{step.text}</Text>
        </Card>
      ))}
      {user ? (
        <Button title={`Sign out ${user.name}`} variant="secondary" onPress={() => signOut()} />
      ) : (
        <Button title="Sign in" onPress={() => router.push('/login')} />
      )}
    </Screen>
  )
}
