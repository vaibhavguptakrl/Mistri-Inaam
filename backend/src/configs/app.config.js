import convict from 'convict'
import dotenv from 'dotenv'
import fs from 'fs'

if (fs.existsSync('.env')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env'))

  for (const key in envConfig) {
    process.env[key] = envConfig[key]
  }
}

const config = convict({
  app: {
    name: {
      doc: 'Name of the service',
      format: String,
      default: 'BackendBoilerplate',
      env: 'APP_NAME'
    },
    url: {
      doc: 'URL of the service',
      format: String,
      default: 'backend-boilerplate:8080',
      env: 'APP_URL'
    }
  },

  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'staging', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },

  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 8080,
    env: 'PORT'
  },

  origin: {
    doc: 'cors origin',
    format: String,
    default: '*',
    env: 'ORIGIN'
  },

  db: {
    dialect: {
      doc: 'Database engine. sqlite needs nothing installed; postgres covers local Postgres, Docker, Supabase and any hosted Postgres.',
      format: ['sqlite', 'postgres'],
      default: 'sqlite',
      env: 'DB_DIALECT'
    },
    storage: {
      doc: 'SQLite database file (only used when DB_DIALECT=sqlite)',
      format: String,
      default: 'data/database.sqlite',
      env: 'DB_STORAGE'
    },
    url: {
      doc: 'Full Postgres connection string (Supabase, Neon, ...). When set, it replaces the DB_* host/user/password settings.',
      format: '*',
      default: '',
      env: 'DATABASE_URL'
    },
    ssl: {
      doc: 'Connect to Postgres over SSL (required by Supabase and most hosted Postgres)',
      format: Boolean,
      default: false,
      env: 'DB_SSL'
    },
    name: {
      doc: 'Database Name',
      format: String,
      default: 'backend_boilerplate',
      env: 'DB_NAME'
    },
    username: {
      doc: 'Database user',
      format: String,
      default: 'postgres',
      env: 'DB_USERNAME'
    },
    password: {
      doc: 'Database password',
      format: '*',
      default: 'postgres',
      env: 'DB_PASSWORD'
    },
    readHost: {
      doc: 'DB read host',
      format: String,
      default: '127.0.0.1',
      env: 'DB_READ_HOST'
    },
    writeHost: {
      doc: 'DB write host',
      format: String,
      default: '127.0.0.1',
      env: 'DB_WRITE_HOST'
    },
    port: {
      doc: 'DB PORT',
      format: 'port',
      default: 5432,
      env: 'DB_PORT'
    }
  },

  // Redis is optional: leave REDIS_URL and REDIS_DB_HOST empty to run without
  // it (sockets and rate limits then live in this one process's memory).
  redis_db: {
    url: {
      doc: 'Full Redis connection string, e.g. rediss://... from Upstash. Takes precedence over host/port/password.',
      format: '*',
      default: '',
      env: 'REDIS_URL'
    },
    password: {
      doc: 'Redis Database password',
      format: '*',
      default: '',
      env: 'REDIS_DB_PASSWORD'
    },
    host: {
      doc: 'Redis DB host (empty = Redis disabled unless REDIS_URL is set)',
      format: String,
      default: '',
      env: 'REDIS_DB_HOST'
    },
    port: {
      doc: 'Redis DB PORT',
      format: 'port',
      default: 6379,
      env: 'REDIS_DB_PORT'
    }
  },

  log_level: {
    doc: 'level of logs to show',
    format: String,
    default: 'debug',
    env: 'LOG_LEVEL'
  },

  jwt: {
    loginTokenSecret: {
      doc: 'Secret used to sign login JWTs',
      format: '*',
      default: '',
      env: 'JWT_LOGIN_SECRET'
    },
    loginTokenExpiry: {
      doc: 'Login JWT expiry',
      format: String,
      default: '2d',
      env: 'JWT_LOGIN_TOKEN_EXPIRY'
    }
  },

  socket: {
    encryptionKey: {
      doc: 'Key used to encrypt socket handshake payloads',
      format: '*',
      default: '',
      env: 'SOCKET_ENCRYPTION_KEY'
    },
    maxPerUserConnection: {
      doc: 'Max concurrent socket connections allowed per user',
      format: Number,
      default: 2,
      env: 'SOCKET_MAX_PER_USER_CONNECTION'
    }
  },

  frontendUrl: {
    doc: 'Frontend Url',
    format: String,
    default: '',
    env: 'FRONTEND_URL'
  },

  rate_limit_opt_timewindow: {
    doc: 'Rate limit time window (in minutes)',
    format: Number,
    default: 2,
    env: 'RATE_LIMIT_OPT_TIMEWINDOW'
  },

  rate_limit_opt_max_requests: {
    doc: 'Rate limit max requests within the time window',
    format: Number,
    default: 5,
    env: 'RATE_LIMIT_OPT_MAX_REQUESTS'
  }
})

config.validate({ allowed: 'strict' })

export default config
