import { useState, type FormEvent } from 'react'
import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from '@app/api'
import { Button, Card, EmptyState, ErrorMessage, Input, PageHeader, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Example page: shows a list from the API with loading and error states, and
 * changes it (add, tick, delete). Copy this pattern for your own lists.
 */
export function TodosPage() {
  const todos = useTodos()
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const [title, setTitle] = useState('')

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    await createTodo.mutateAsync({ title })
    setTitle('')
  }

  return (
    <>
      <PageHeader title="Todos" description="Example: a list you can change. Data lives in packages/api/src/todos." />

      <Card className="mb-6">
        <form onSubmit={onAdd} className="flex items-start gap-2">
          <Input
            className="flex-1"
            placeholder="What needs doing?"
            aria-label="New todo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={createTodo.error ? String(createTodo.error.message) : null}
          />
          <Button type="submit" loading={createTodo.isPending} disabled={!title.trim()}>
            Add
          </Button>
        </form>
      </Card>

      {todos.isPending && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {todos.isError && <ErrorMessage error={todos.error} onRetry={() => todos.refetch()} />}
      {todos.data?.length === 0 && <EmptyState title="Nothing to do" description="Add your first todo above." />}

      {todos.data && todos.data.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {todos.data.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="size-4 accent-[var(--theme-primary)]"
                checked={todo.done}
                onChange={() => updateTodo.mutate({ id: todo.id, done: !todo.done })}
                aria-label={`Mark "${todo.title}" as ${todo.done ? 'not done' : 'done'}`}
              />
              <span className={cn('flex-1 text-sm', todo.done ? 'text-text-muted line-through' : 'text-text')}>
                {todo.title}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteTodo.mutate(todo.id)}
                aria-label={`Delete "${todo.title}"`}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
