// `npm run doctor`: checks this computer and your settings can run the API,
// and says in plain words how to fix anything that's wrong.
//   npm run doctor -- --json    the same checks as JSON (for scripts and installers)
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  ENV_FILE,
  checkDatabase,
  checkRedis,
  databaseSettings,
  describeDatabase,
  fromRoot,
  isPlaceholderSecret,
  optionalRequire,
  pendingMigrations,
  readConfig,
  readEnv,
  readJson,
  redisSettings
} from './lib/project.mjs'

const asJson = process.argv.includes('--json')
const checks = []
let section = ''

const record = (status, label, { detail, fix } = {}) => checks.push({ section, status, label, detail, fix })
const ok = (label, detail) => record('ok', label, { detail })
const warn = (label, fix) => record('warn', label, { fix })
const bad = (label, fix) => record('error', label, { fix })

const commandWorks = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return !result.error && result.status === 0
}

async function main () {
  const config = readConfig()
  const env = readEnv()

  section = 'Basics'
  const required = readJson(fromRoot('package.json')).engines?.node?.match(/\d+/)?.[0] || '20'
  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor >= Number(required)) ok('Node.js', process.versions.node)
  else bad(`Node.js ${process.versions.node} is too old (need ${required}+)`, 'Install the LTS version from https://nodejs.org')

  if (!existsSync(fromRoot('node_modules'))) {
    bad('Packages not installed', 'Run: npm install')
  } else {
    ok('Packages installed')
  }

  if (!existsSync(ENV_FILE)) {
    bad('No .env file', 'Run: npm run setup')
  } else {
    ok('.env file')
    if (isPlaceholderSecret(env.JWT_LOGIN_SECRET) || isPlaceholderSecret(env.SOCKET_ENCRYPTION_KEY)) {
      warn('JWT_LOGIN_SECRET / SOCKET_ENCRYPTION_KEY still have placeholder values', 'Run "npm run setup" to generate them')
    }
  }
  config.setupComplete ? ok('Setup done', config.name) : warn('Setup not run yet', 'Run: npm run setup')

  section = 'Database'
  const database = databaseSettings(env)
  if (database.dialect === 'sqlite' && !optionalRequire('sqlite3')) {
    bad(
      'The SQLite driver (sqlite3) is not installed',
      'Run "npm install" again. If it keeps failing, pick Postgres or Supabase with "npm run setup".'
    )
  } else {
    const connection = await checkDatabase(database)
    if (!connection.ok) {
      bad(`Can't connect: ${connection.reason}`, connection.fix)
    } else {
      ok('Connected', describeDatabase(database))
      const pending = await pendingMigrations(database)
      pending.length
        ? warn(`${pending.length} database change(s) not applied yet`, 'Run: npm run db:migrate')
        : ok('Tables up to date')
    }
  }
  if (database.dialect === 'sqlite' && env.NODE_ENV === 'production') {
    warn('Using SQLite in production', 'Fine for one small server. For anything bigger, switch to Postgres with "npm run setup".')
  }

  section = 'Redis'
  const redis = redisSettings(env)
  if (!redis.enabled) {
    ok('Not used', 'fine while you run one copy of the API')
    if (env.NODE_ENV === 'production') {
      warn(
        'Production without Redis',
        'If you run more than one copy of the API, add Redis (REDIS_URL) so sockets and rate limits are shared.'
      )
    }
  } else {
    const result = await checkRedis(redis)
    result.ok ? ok('Connected') : bad(`Can't connect: ${result.reason}`, result.fix)
  }

  if (config.database === 'postgres-docker' || config.redis === 'docker') {
    section = 'Docker'
    if (!commandWorks('docker', ['compose', 'version'])) {
      bad('Docker not installed', 'Install Docker Desktop from https://www.docker.com/products/docker-desktop/')
    } else if (!commandWorks('docker', ['info'])) {
      bad('Docker is not running', 'Open Docker Desktop and wait until it says "running", then run: docker compose up -d')
    } else {
      ok('Docker running')
    }
  }

  const problems = checks.filter((check) => check.status === 'error').length

  if (asJson) {
    console.log(JSON.stringify({ ok: problems === 0, problems, checks }, null, 2))
  } else {
    let lastSection
    for (const check of checks) {
      if (check.section !== lastSection) console.log(`\n${check.section}`)
      lastSection = check.section
      const icon = { ok: '✔', warn: '!', error: '✖' }[check.status]
      console.log(`  ${icon} ${check.label}${check.detail ? `  (${check.detail})` : ''}`)
      if (check.fix) console.log(`      → ${check.fix}`)
    }
    console.log(problems ? `\n${problems} problem(s) to fix.` : '\nEverything looks good.')
  }
  process.exitCode = problems ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
