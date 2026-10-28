// Everything the apps import from '@app/api'.
// Add a new API with: npm run generate api   (it adds its line below by itself)

export { configureApi, getApiSettings, http, type ApiSettings, type Query } from './client'
export { ApiError, errorMessage } from './errors'
export { authToken } from './token'
export { createQueryClient } from './query'
export { mock, mockError, nextId, type MockRequest } from './mock/server'

export * from './auth'
// demo:start
export * from './todos'
export * from './users'
// demo:end
// plop:exports
