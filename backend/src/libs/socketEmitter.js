import { Emitter } from '@socket.io/redis-emitter'
import redisClient from './redisClient'

// Without Redis there is only this one process, so emit straight through its
// own Socket.io server. Both expose the same `.of(ns).to(room).emit(...)` API.
// The server is required lazily: socket-resources imports handlers that
// import emitters that import this file.
const localEmitter = new Proxy({}, {
  get (_, property) {
    const socketServer = require('~/socket-resources').default
    const value = socketServer[property]
    return typeof value === 'function' ? value.bind(socketServer) : value
  }
})

const socketEmitter = redisClient.enabled ? new Emitter(redisClient.publisherClient) : localEmitter

export default socketEmitter
