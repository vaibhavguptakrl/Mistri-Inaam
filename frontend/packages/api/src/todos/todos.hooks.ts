import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todosApi } from './todos.api'
import type { UpdateTodoInput } from './todos.types'

export const todoKeys = {
  all: ['todos'] as const,
  one: (id: number) => ['todos', id] as const
}

export function useTodos() {
  return useQuery({ queryKey: todoKeys.all, queryFn: todosApi.list, select: (data) => data.todos })
}

export function useTodo(id: number) {
  return useQuery({ queryKey: todoKeys.one(id), queryFn: () => todosApi.get(id), select: (data) => data.todo })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all })
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTodoInput & { id: number }) => todosApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all })
  })
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: todosApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all })
  })
}
