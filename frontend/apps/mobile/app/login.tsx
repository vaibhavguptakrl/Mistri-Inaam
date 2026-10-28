import { router } from 'expo-router'
import { useState } from 'react'
import { errorMessage, getApiSettings } from '@app/api'
import { Button, Card, Input, Screen, Text } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit() {
    setError(null)
    setSaving(true)
    try {
      await signIn({ email, password })
      if (router.canGoBack()) router.back()
      else router.replace('/')
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Card>
        {getApiSettings().useMocks && <Text tone="muted">Demo mode: use any email and the password "password".</Text>}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          error={error}
          onSubmitEditing={onSubmit}
        />
        <Button title="Sign in" onPress={onSubmit} loading={saving} />
      </Card>
    </Screen>
  )
}
