import { http } from '../client'
import type { CreateTodoInput, Todo, UpdateTodoInput } from './todos.types'

export const todosApi = {
  list: () => http.get<{ todos: Todo[] }>('/todos'),
  get: (id: number) => http.get<{ todo: Todo }>(`/todos/${id}`),
  create: (input: CreateTodoInput) => http.post<{ todo: Todo }>('/todos', input),
  update: (id: number, input: UpdateTodoInput) => http.patch<{ todo: Todo }>(`/todos/${id}`, input),
  remove: (id: number) => http.delete<{ deleted: boolean }>(`/todos/${id}`)
}
