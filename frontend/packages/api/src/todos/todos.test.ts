import { beforeEach, describe, expect, it } from 'vitest'
import { configureApi } from '../client'
import { todosApi } from './todos.api'
import './todos.mock'

beforeEach(() => configureApi({ useMocks: true, mockDelayMs: 0 }))

describe('todos API (fake data)', () => {
  it('creates, updates and deletes a todo', async () => {
    const { todo } = await todosApi.create({ title: 'Write a test' })
    expect(todo.done).toBe(false)
    await todosApi.update(todo.id, { done: true })
    const { todos } = await todosApi.list()
    expect(todos.find((row) => row.id === todo.id)?.done).toBe(true)
    await todosApi.remove(todo.id)
    await expect(todosApi.get(todo.id)).rejects.toMatchObject({ status: 404 })
  })

  it('refuses a todo without a title', async () => {
    await expect(todosApi.create({ title: '  ' })).rejects.toMatchObject({ status: 422 })
  })
})
