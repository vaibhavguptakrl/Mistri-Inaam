export interface Todo {
  id: number
  title: string
  done: boolean
  createdAt: string
}

export interface CreateTodoInput {
  title: string
}

export interface UpdateTodoInput {
  title?: string
  done?: boolean
}
