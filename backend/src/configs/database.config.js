import fs from 'fs'
import path from 'path'
import config from './app.config'

const sharedSetting = {
  define: {
    underscored: true,
    timestamps: true
  },
  // Record which seeders already ran (like migrations), so re-running
  // `npm run db:seed` or `npm run setup` never inserts the example rows twice.
  seederStorage: 'sequelize',
  logging: config.get('env') === 'development',
  benchmark: true
}

function sqliteSetting () {
  const storage = path.resolve(config.get('db.storage'))
  fs.mkdirSync(path.dirname(storage), { recursive: true })

  return {
    ...sharedSetting,
    dialect: 'sqlite',
    storage
  }
}

function postgresSetting () {
  const setting = {
    ...sharedSetting,
    dialect: 'postgres',
    dialectOptions: {
      application_name: config.get('app.name'),
      // Hosted Postgres (Supabase, Neon, ...) presents certificates Node
      // doesn't ship a CA for, so verify-full would reject them.
      ...(config.get('db.ssl') && { ssl: { require: true, rejectUnauthorized: false } })
    },
    pool: {
      max: 50,
      min: 5,
      idle: 5000,
      evict: 5000,
      acquire: 60000
    }
  }

  // A single connection string (Supabase, Neon, ...) has no read replica.
  if (config.get('db.url')) {
    return { ...setting, use_env_variable: 'DATABASE_URL' }
  }

  return {
    ...setting,
    database: config.get('db.name'),
    replication: {
      read: {
        username: config.get('db.username'),
        password: config.get('db.password'),
        host: config.get('db.readHost'),
        port: config.get('db.port')
      },
      write: {
        username: config.get('db.username'),
        password: config.get('db.password'),
        host: config.get('db.writeHost'),
        port: config.get('db.port')
      }
    }
  }
}

const commonSetting = config.get('db.dialect') === 'sqlite' ? sqliteSetting() : postgresSetting()

export const development = {
  ...commonSetting
}

export const test = {
  ...commonSetting
}

export const staging = {
  ...commonSetting
}

export const production = {
  ...commonSetting
}
