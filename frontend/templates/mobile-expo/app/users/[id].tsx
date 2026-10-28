import { Stack, useLocalSearchParams } from 'expo-router'
import { useUser } from '@app/api'
import { Avatar, Card, ErrorMessage, Screen, Spinner, Text } from '@/components/ui'

/** Example screen: reads the id from the address (/users/3) and loads that one user. */
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useUser(Number(id))

  return (
    <Screen>
      <Stack.Screen options={{ title: user.data?.name ?? 'User' }} />
      {user.isPending && <Spinner />}
      {user.isError && <ErrorMessage error={user.error} />}
      {user.data && (
        <Card style={{ alignItems: 'center' }}>
          <Avatar name={user.data.name} src={user.data.avatarUrl} size={72} />
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{user.data.name}</Text>
          <Text tone="muted">{user.data.email}</Text>
          <Text tone="primary">{user.data.role}</Text>
        </Card>
      )}
    </Screen>
  )
}
