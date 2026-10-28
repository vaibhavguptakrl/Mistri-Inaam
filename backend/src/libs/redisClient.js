import Redis from 'ioredis'
import config from '~/configs/app.config'

// Redis is optional. With neither REDIS_URL nor REDIS_DB_HOST set, `enabled`
// is false and every client is null — callers fall back to in-process
// memory (see socket-resources/index.js, libs/socketEmitter.js and
// rateLimiter.middleware.js). Turn it on once you run more than one instance.
const url = config.get('redis_db.url')

const connection = {
  host: config.get('redis_db.host'),
  port: config.get('redis_db.port'),
  password: config.get('redis_db.password') || undefined
}

const enabled = Boolean(url || connection.host)

const createClient = () => {
  if (!enabled) return null
  return url ? new Redis(url) : new Redis(connection)
}

export default {
  enabled,
  connection,
  publisherClient: createClient(),
  subscriberClient: createClient(),
  client: createClient()
}
