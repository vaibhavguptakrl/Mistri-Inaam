import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from '@app/api'
import { Button, Card, EmptyState, ErrorMessage, Input, Screen, Spinner, Text } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'

/** Example screen: a list from the API that you can change. Only for signed-in users. */
export default function TodosScreen() {
  const { isSignedIn, isLoading } = useAuth()
  if (isLoading)
    return (
      <Screen>
        <Spinner />
      </Screen>
    )
  if (!isSignedIn) {
    return (
      <Screen>
        <EmptyState
          title="Sign in to see your todos"
          action={<Button title="Sign in" onPress={() => router.push('/login')} />}
        />
      </Screen>
    )
  }
  return <TodoList />
}

function TodoList() {
  const { colors } = useTheme()
  const todos = useTodos()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const [title, setTitle] = useState('')

  async function onAdd() {
    await createTodo.mutateAsync({ title })
    setTitle('')
  }

  return (
    <Screen description="Example: a list you can change. Data lives in packages/api/src/todos.">
      <Card>
        <Input
          placeholder="What needs doing?"
          accessibilityLabel="New todo"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={onAdd}
          returnKeyType="done"
          error={createTodo.error?.message}
        />
        <Button title="Add" onPress={onAdd} loading={createTodo.isPending} disabled={!title.trim()} />
      </Card>

      {todos.isPending && <Spinner />}
      {todos.isError && <ErrorMessage error={todos.error} onRetry={() => todos.refetch()} />}
      {todos.data?.length === 0 && <EmptyState title="Nothing to do" description="Add your first todo above." />}

      {todos.data?.map((todo) => (
        <View key={todo.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: todo.done }}
            onPress={() => updateTodo.mutate({ id: todo.id, done: !todo.done })}
            style={styles.rowText}
          >
            <Text style={todo.done ? { color: colors.textMuted, textDecorationLine: 'line-through' } : undefined}>
              {todo.done ? '☑︎' : '☐'} {todo.title}
            </Text>
          </Pressable>
          <Button title="Delete" variant="ghost" onPress={() => deleteTodo.mutate(todo.id)} />
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingLeft: 12 },
  rowText: { flex: 1, paddingVertical: 12 }
})
