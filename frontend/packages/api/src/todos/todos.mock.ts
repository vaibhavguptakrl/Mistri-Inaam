import { mock, mockError, nextId } from '../mock/server'
import type { Todo } from './todos.types'

const todos: Todo[] = [
  { id: 1, title: 'Run npm run setup', done: true, createdAt: '2026-01-01T09:00:00.000Z' },
  { id: 2, title: 'Open the app with npm run dev', done: true, createdAt: '2026-01-01T09:05:00.000Z' },
  { id: 3, title: 'Ask the AI to build your first page', done: false, createdAt: '2026-01-01T09:10:00.000Z' }
]

const find = (id: string) => {
  const todo = todos.find((row) => row.id === Number(id))
  if (!todo) throw mockError(404, 'Todo not found')
  return todo
}

mock('GET', '/todos', () => ({ todos }))

mock('GET', '/todos/:id', ({ params }) => ({ todo: find(params.id) }))

mock('POST', '/todos', ({ body }) => {
  const title = String(body.title ?? '').trim()
  if (!title) throw mockError(422, 'Give the todo a title')
  const todo: Todo = { id: nextId(todos), title, done: false, createdAt: new Date().toISOString() }
  todos.push(todo)
  return { todo }
})

mock('PATCH', '/todos/:id', ({ params, body }) => {
  const todo = find(params.id)
  if (body.title !== undefined) todo.title = String(body.title)
  if (body.done !== undefined) todo.done = Boolean(body.done)
  return { todo }
})

mock('DELETE', '/todos/:id', ({ params }) => {
  todos.splice(todos.indexOf(find(params.id)), 1)
  return { deleted: true }
})
