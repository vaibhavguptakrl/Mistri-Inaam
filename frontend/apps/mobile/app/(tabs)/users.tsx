import { Link } from 'expo-router'
import { useDeferredValue, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useUsers } from '@app/api'
import { Avatar, EmptyState, ErrorMessage, Input, Screen, Spinner, Text } from '@/components/ui'
import { useTheme } from '@/providers/ThemeProvider'

/** Example screen: a searchable list where each row opens its own screen. */
export default function UsersScreen() {
  const { colors } = useTheme()
  const [search, setSearch] = useState('')
  const users = useUsers(useDeferredValue(search))

  return (
    <Screen>
      <Input
        placeholder="Search by name or email"
        accessibilityLabel="Search users"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      {users.isPending && <Spinner />}
      {users.isError && <ErrorMessage error={users.error} onRetry={() => users.refetch()} />}
      {users.data?.users.length === 0 && <EmptyState title="No one matches" description="Try a different search." />}
      {users.data?.users.map((user) => (
        <Link key={user.id} href={`/users/${user.id}`} asChild>
          <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Avatar name={user.name} src={user.avatarUrl} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{user.name}</Text>
              <Text tone="muted">{user.email}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 }
})
