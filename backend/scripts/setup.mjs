// The setup wizard: `npm run setup`.
// Asks a few plain-English questions (or none, with "Quick setup"), writes
// .env, starts Docker services if you picked them, creates the database
// tables and saves your answers (never passwords) in project.config.json.
//
// Without a keyboard (scripts, CI, the create-app installer):
//   npm run setup -- --yes                      use the defaults / current answers
//   npm run setup -- --answers answers.json     or pass the answers as JSON text
//   add --skip-db to only write the files (no Docker, no migrations)
//
// Answers JSON (every key optional):
//   { "name": "My App", "database": "sqlite" | "postgres-docker" | "postgres-local" | "supabase" | "postgres-url",
//     "databaseUrl": "postgres://...", "postgres": { "host", "port", "username", "password", "name" },
//     "redis": "none" | "docker" | "url", "redisUrl": "rediss://...",
//     "port": 8080, "frontendUrl": "http://localhost:5173", "exampleData": true }
import * as p from '@clack/prompts'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  CONFIG_FILE,
  DATABASES,
  REDIS_OPTIONS,
  ROOT,
  checkDatabase,
  checkRedis,
  createPostgresDatabase,
  databaseSettings,
  describeDatabase,
  fromRoot,
  generateSecret,
  isPlaceholderSecret,
  readConfig,
  readEnv,
  redisSettings,
  slugify,
  updateEnv,
  writeJson
} from './lib/project.mjs'

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const nonInteractive = flag('--yes') || flag('-y') || option('--answers') !== undefined
const skipDb = flag('--skip-db')

function fail (message) {
  p.cancel(message)
  process.exit(1)
}

const stopIfCancelled = (value) => {
  if (p.isCancel(value)) fail('Setup cancelled. Nothing was changed. Run "npm run setup" again whenever you like.')
  return value
}

function answersFromFlag () {
  const value = option('--answers')
  if (!value) return {}
  const text = existsSync(path.resolve(value)) ? readFileSync(path.resolve(value), 'utf8') : value
  try {
    return JSON.parse(text)
  } catch {
    fail(`--answers must be JSON or a path to a JSON file. Got: ${value}`)
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const DATABASE_OPTIONS = [
  { value: 'sqlite', label: 'SQLite (recommended)', hint: 'a file on this computer. Nothing to install, no password.' },
  { value: 'supabase', label: 'Supabase', hint: 'free online Postgres. Needs a free supabase.com account.' },
  { value: 'postgres-docker', label: 'Postgres in Docker', hint: 'needs Docker Desktop installed and running' },
  { value: 'postgres-local', label: 'Postgres on this computer', hint: 'you already installed Postgres yourself' },
  { value: 'postgres-url', label: 'I have a Postgres connection string', hint: 'Neon, Railway, AWS, ...' }
]

const REDIS_CHOICES = [
  { value: 'none', label: 'No Redis (recommended)', hint: 'only needed when you run your API on several servers' },
  { value: 'docker', label: 'Redis in Docker', hint: 'needs Docker Desktop installed and running' },
  { value: 'url', label: 'Hosted Redis', hint: 'paste a redis:// or rediss:// URL, e.g. from upstash.com' }
]

const validUrl = (prefixes, example) => (value) =>
  prefixes.some((prefix) => (value || '').trim().startsWith(prefix)) ? undefined : `It should start with ${example}`

async function askQuestions (current, env) {
  const name = stopIfCancelled(
    await p.text({
      message: 'What is your app called? (press Enter to keep the grey name)',
      // A placeholder, not an initialValue: typing replaces it instead of appending to it.
      placeholder: current.name,
      defaultValue: current.name
    })
  ).trim() || current.name

  const mode = stopIfCancelled(
    await p.select({
      message: 'How do you want to set up?',
      options: [
        {
          value: 'quick',
          label: 'Quick setup (recommended)',
          hint: 'we pick the best options for you: SQLite database, no Redis'
        },
        { value: 'custom', label: 'Custom', hint: 'choose the database, Redis, port, ...' }
      ],
      initialValue: current.setupComplete && (current.database !== 'sqlite' || current.redis !== 'none') ? 'custom' : 'quick'
    })
  )

  if (mode === 'quick') {
    return { ...current, name, database: 'sqlite', redis: 'none' }
  }

  const answers = { ...current, name }

  answers.database = stopIfCancelled(
    await p.select({
      message: 'Which database?',
      options: DATABASE_OPTIONS,
      initialValue: current.database
    })
  )

  if (answers.database === 'supabase') {
    p.note(
      'In your Supabase project click "Connect", open "Session pooler" and copy the URI.\n' +
        'Replace [YOUR-PASSWORD] with your database password.\n' +
        '(Use the Session pooler one: the "Direct connection" does not work on many home networks.)',
      'Where to find it'
    )
  }
  if (answers.database === 'supabase' || answers.database === 'postgres-url') {
    const keep = env.DATABASE_URL && current.database === answers.database
    answers.databaseUrl = stopIfCancelled(
      await p.password({
        message: keep
          ? 'Connection string (leave empty to keep the one already saved in .env)'
          : 'Paste the connection string (hidden while you type)',
        validate: (value) =>
          keep && !(value || '').trim() ? undefined : validUrl(['postgres://', 'postgresql://'], 'postgresql://')(value)
      })
    ).trim() || env.DATABASE_URL
  }

  if (answers.database === 'postgres-local') {
    p.note('Postgres must already be installed and running on this computer.', 'Good to know')
    const postgres = {}
    postgres.host = stopIfCancelled(await p.text({ message: 'Host', initialValue: env.DB_WRITE_HOST || '127.0.0.1' }))
    postgres.port = Number(stopIfCancelled(await p.text({ message: 'Port', initialValue: env.DB_PORT || '5432' })))
    postgres.username = stopIfCancelled(await p.text({ message: 'Username', initialValue: env.DB_USERNAME || 'postgres' }))
    postgres.password = stopIfCancelled(
      await p.password({ message: 'Password (hidden; leave empty to keep the saved one)' })
    ) || env.DB_PASSWORD || ''
    postgres.name = stopIfCancelled(
      await p.text({ message: 'Database name (created for you if missing)', initialValue: env.DB_NAME || slugify(name) })
    )
    answers.postgres = postgres
  }

  answers.redis = stopIfCancelled(
    await p.select({
      message: 'Redis?',
      options: REDIS_CHOICES,
      initialValue: current.redis
    })
  )
  if (answers.redis === 'url') {
    const keep = env.REDIS_URL && current.redis === 'url'
    answers.redisUrl = stopIfCancelled(
      await p.password({
        message: keep ? 'Redis URL (leave empty to keep the saved one)' : 'Paste the Redis URL (hidden while you type)',
        validate: (value) => (keep && !(value || '').trim() ? undefined : validUrl(['redis://', 'rediss://'], 'rediss://')(value))
      })
    ).trim() || env.REDIS_URL
  }

  answers.port = Number(
    stopIfCancelled(
      await p.text({
        message: 'Which port should the API run on? (leave it if unsure)',
        initialValue: String(current.port),
        validate: (value) => (/^\d{2,5}$/.test(value || '') && Number(value) <= 65535 ? undefined : 'A number like 8080')
      })
    )
  )

  answers.frontendUrl = stopIfCancelled(
    await p.text({
      message: 'Website address (leave it if unsure)',
      initialValue: current.frontendUrl,
      validate: validUrl(['http://', 'https://'], 'http://')
    })
  ).trim()

  answers.exampleData = stopIfCancelled(
    await p.confirm({
      message: 'Add example data to the database, to learn from?',
      initialValue: current.exampleData
    })
  )

  return answers
}

function answersWithoutQuestions (current, env) {
  const given = answersFromFlag()
  const answers = { ...current, ...given }

  if (answers.database === 'supabase' || answers.database === 'postgres-url') answers.databaseUrl ??= env.DATABASE_URL
  if (answers.redis === 'url') answers.redisUrl ??= env.REDIS_URL

  const problems = []
  if (!DATABASES.includes(answers.database)) problems.push(`database must be one of ${DATABASES.join(', ')}`)
  if (!REDIS_OPTIONS.includes(answers.redis)) problems.push(`redis must be one of ${REDIS_OPTIONS.join(', ')}`)
  if ((answers.database === 'supabase' || answers.database === 'postgres-url') && !answers.databaseUrl) {
    problems.push(`database "${answers.database}" needs "databaseUrl" (or DATABASE_URL already in .env)`)
  }
  if (answers.redis === 'url' && !answers.redisUrl) {
    problems.push('redis "url" needs "redisUrl" (or REDIS_URL already in .env)')
  }
  if (!Number.isInteger(Number(answers.port))) problems.push('port must be a number')
  if (problems.length) fail(`Can't use these answers:\n- ${problems.join('\n- ')}`)
  answers.port = Number(answers.port)
  return answers
}

// ---------------------------------------------------------------------------
// Making the changes
// ---------------------------------------------------------------------------

/** The .env values for these answers. Unused settings are blanked so an old choice can't linger. */
function envFor (answers, env) {
  const values = {
    APP_NAME: answers.name,
    PORT: answers.port,
    FRONTEND_URL: answers.frontendUrl,
    DB_DIALECT: answers.database === 'sqlite' ? 'sqlite' : 'postgres',
    DB_STORAGE: env.DB_STORAGE || 'data/database.sqlite',
    DATABASE_URL: '',
    DB_SSL: 'false',
    REDIS_URL: '',
    REDIS_DB_HOST: '',
    REDIS_DB_PORT: env.REDIS_DB_PORT || 6379,
    REDIS_DB_PASSWORD: ''
  }

  if (answers.database === 'supabase' || answers.database === 'postgres-url') {
    values.DATABASE_URL = answers.databaseUrl
    const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(answers.databaseUrl)
    values.DB_SSL = answers.database === 'supabase' || (!local && !/sslmode=disable/.test(answers.databaseUrl)) ? 'true' : 'false'
  }
  if (answers.database === 'postgres-docker') {
    Object.assign(values, {
      DB_READ_HOST: '127.0.0.1',
      DB_WRITE_HOST: '127.0.0.1',
      DB_PORT: env.DB_PORT || 5432,
      DB_USERNAME: env.DB_USERNAME || 'postgres',
      DB_PASSWORD: env.DB_PASSWORD || 'postgres',
      DB_NAME: env.DB_NAME || slugify(answers.name)
    })
  }
  if (answers.database === 'postgres-local') {
    const pg = answers.postgres || {}
    Object.assign(values, {
      DB_READ_HOST: pg.host || env.DB_READ_HOST || '127.0.0.1',
      DB_WRITE_HOST: pg.host || env.DB_WRITE_HOST || '127.0.0.1',
      DB_PORT: pg.port || env.DB_PORT || 5432,
      DB_USERNAME: pg.username || env.DB_USERNAME || 'postgres',
      DB_PASSWORD: pg.password ?? env.DB_PASSWORD ?? '',
      DB_NAME: pg.name || env.DB_NAME || slugify(answers.name)
    })
  }

  if (answers.redis === 'docker') {
    values.REDIS_DB_HOST = '127.0.0.1'
  }
  if (answers.redis === 'url') values.REDIS_URL = answers.redisUrl

  // Fresh random secrets, but never replace ones you already set.
  if (isPlaceholderSecret(env.JWT_LOGIN_SECRET)) values.JWT_LOGIN_SECRET = generateSecret()
  if (isPlaceholderSecret(env.SOCKET_ENCRYPTION_KEY)) values.SOCKET_ENCRYPTION_KEY = generateSecret()
  return values
}

const run = (command, commandArgs, options = {}) =>
  spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options
  })

function startDockerServices (services) {
  const compose = run('docker', ['compose', 'version'])
  if (compose.error || compose.status !== 0) {
    fail(
      'Docker is not installed (or too old).\n' +
        'Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and open it once,\n' +
        'then run "npm run setup" again. Or pick SQLite / Supabase instead: they need no Docker.'
    )
  }
  if (run('docker', ['info']).status !== 0) {
    fail('Docker is installed but not running. Open Docker Desktop, wait until it says "running", then run "npm run setup" again.')
  }
  const spinner = p.spinner()
  spinner.start(`Starting ${services.join(' and ')} in Docker (the first time downloads it, which can take a minute)`)
  const result = run('docker', ['compose', 'up', '-d', ...services])
  if (result.status !== 0) {
    spinner.stop('Docker could not start them', 1)
    console.error(result.stderr?.slice(-3000))
    fail('Fix the error above (often: another program already uses the port), then run "npm run setup" again.')
  }
  spinner.stop(`Started ${services.join(' and ')} in Docker`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForDatabase (settings, { retries }) {
  let result = await checkDatabase(settings)
  for (let attempt = 0; !result.ok && attempt < retries; attempt++) {
    // Postgres in a just-started container refuses connections for a few seconds.
    if (result.code === '3D000') break
    await sleep(2000)
    result = await checkDatabase(settings)
  }
  if (!result.ok && result.code === '3D000' && !settings.url) {
    await createPostgresDatabase(settings)
    p.log.success(`Created the database "${settings.database}"`)
    result = await checkDatabase(settings)
  }
  return result
}

function sequelizeCli (command) {
  return run(process.execPath, [
    fromRoot('node_modules', '@babel', 'node', 'bin', 'babel-node.js'),
    fromRoot('node_modules', 'sequelize-cli', 'lib', 'sequelize'),
    command
  ])
}

async function prepareDatabase (answers) {
  const env = readEnv()
  const settings = databaseSettings(env)

  const services = [answers.database === 'postgres-docker' && 'postgres', answers.redis === 'docker' && 'redis'].filter(
    Boolean
  )
  if (services.length) startDockerServices(services)

  const spinner = p.spinner()
  spinner.start(`Connecting to the database (${describeDatabase(settings)})`)
  const database = await waitForDatabase(settings, { retries: answers.database === 'postgres-docker' ? 30 : 0 })
  if (!database.ok) {
    spinner.stop('Could not connect to the database', 1)
    fail(`${database.reason}\n→ ${database.fix}\nYour answers are saved in .env; run "npm run setup" again after fixing it.`)
  }
  spinner.stop(`Connected to ${describeDatabase(settings)}`)

  const redis = redisSettings(env)
  if (redis.enabled) {
    let result = await checkRedis(redis)
    for (let attempt = 0; !result.ok && answers.redis === 'docker' && attempt < 10; attempt++) {
      await sleep(1000)
      result = await checkRedis(redis)
    }
    if (result.ok) p.log.success('Connected to Redis')
    else p.log.warn(`Could not reach Redis: ${result.reason}\n→ ${result.fix}`)
  }

  spinner.start('Creating the database tables')
  const migrate = sequelizeCli('db:migrate')
  if (migrate.status !== 0) {
    spinner.stop('Creating the tables failed', 1)
    console.error(`${migrate.stdout}\n${migrate.stderr}`.slice(-3000))
    fail('Fix the error above (or paste it to someone who can help), then run "npm run db:migrate".')
  }
  spinner.stop('Database tables are ready')

  if (answers.exampleData) {
    spinner.start('Adding the example data')
    const seed = sequelizeCli('db:seed:all')
    if (seed.status !== 0) {
      spinner.stop('Adding the example data failed (the app still works)', 1)
      console.error(`${seed.stdout}\n${seed.stderr}`.slice(-3000))
    } else {
      spinner.stop('Example data added')
    }
  }
}

function saveConfig (answers) {
  // Only non-secret answers: connection strings and passwords stay in .env.
  const config = {
    name: answers.name,
    database: answers.database,
    redis: answers.redis,
    port: answers.port,
    frontendUrl: answers.frontendUrl,
    exampleData: answers.exampleData,
    setupComplete: true
  }
  writeJson(CONFIG_FILE, config)
  return config
}

const DATABASE_LABELS = {
  sqlite: 'SQLite (a file in data/)',
  'postgres-docker': 'Postgres in Docker',
  'postgres-local': 'Postgres on this computer',
  supabase: 'Supabase',
  'postgres-url': 'Postgres (connection string)'
}
const REDIS_LABELS = { none: 'none (not needed yet)', docker: 'Redis in Docker', url: 'hosted Redis' }

function nextSteps (config) {
  const lines = [
    'npm run start:dev      start the API at http://localhost:' + config.port,
    `                       try it: http://localhost:${config.port}/api/v1/demo`,
    'npm run doctor         check everything is still working',
    'npm run generate       add a new API, model or service the right way',
    'npm run setup          change any of these answers later'
  ]
  if (config.database === 'postgres-docker' || config.redis === 'docker') {
    lines.push('docker compose up -d   start the database/Redis again after a restart')
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------

async function main () {
  if (!nonInteractive) console.clear()
  p.intro(" Let's set up your backend ")

  const current = readConfig()
  const env = readEnv()
  if (!nonInteractive && !process.stdin.isTTY) {
    fail(
      'No keyboard input available. Run "npm run setup" in a terminal, or pass answers: npm run setup -- --yes (see scripts/setup.mjs).'
    )
  }
  if (current.setupComplete && !nonInteractive) {
    p.log.info('This project was set up before. Your current answers are pre-filled; change what you like.')
  }

  const answers = nonInteractive ? answersWithoutQuestions(current, env) : await askQuestions(current, env)

  if (!nonInteractive) {
    const summary = [
      `Name:      ${answers.name}`,
      `Database:  ${DATABASE_LABELS[answers.database]}`,
      `Redis:     ${REDIS_LABELS[answers.redis]}`,
      `API:       http://localhost:${answers.port}`,
      `Website:   ${answers.frontendUrl}`,
      `Examples:  ${answers.exampleData ? 'yes' : 'no'}`
    ].join('\n')
    p.note(summary, 'Your choices')
    const ok = stopIfCancelled(await p.confirm({ message: 'Set it up like this?', initialValue: true }))
    if (!ok) fail('Nothing was changed. Run "npm run setup" to start again.')
  }

  updateEnv(envFor(answers, env))
  p.log.success('Saved your settings in .env')

  if (!skipDb) await prepareDatabase(answers)

  const config = saveConfig(answers)
  p.log.success('Saved your answers in project.config.json')

  p.note(nextSteps(config), 'What to do next (type these in the terminal)')
  p.outro('All set.')
}

main().catch((error) => {
  console.error(error)
  fail('Setup stopped because of the error above.')
})
