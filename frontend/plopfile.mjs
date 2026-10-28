// Generators: `npm run generate` (menu) or `npm run generate <page|component|api|hook>`.
// They create files that follow this project's rules and wire them in
// (routes, navigation, exports), so nothing has to be connected by hand.
//
// Without questions (for AI assistants), answers go in order, "_" keeps the default:
//   npm run generate -- page "Order History" web yes no
//   npm run generate -- component "Price Tag" web ui yes
//   npm run generate -- api products "name:string,price:number,inStock:boolean" "list,get,create,update,delete"
//   npm run generate -- hook countdown web
import { existsSync } from 'node:fs'
import path from 'node:path'
import { formatFiles, installedApps, ROOT } from './scripts/lib/project.mjs'

const WEB = 'apps/web/src'
const MOBILE = 'apps/mobile'
const API = 'packages/api/src'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const words = (text) =>
  String(text)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
const pascal = (text) =>
  words(text)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join('')
const camel = (text) => {
  const value = pascal(text)
  return value[0].toLowerCase() + value.slice(1)
}
const kebab = (text) =>
  words(text)
    .map((word) => word.toLowerCase())
    .join('-')
const title = (text) =>
  words(text)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/** products → product, categories → category, boxes → box */
function singularize(text) {
  const parts = words(text)
  const last = parts.pop() ?? ''
  const single = /ies$/i.test(last)
    ? last.replace(/ies$/i, 'y')
    : /(ss|sh|ch|x|z)es$/i.test(last)
      ? last.replace(/es$/i, '')
      : /[^s]s$/i.test(last)
        ? last.slice(0, -1)
        : last
  return [...parts, single].join(' ')
}

const pluralize = (text) => (singularize(text) === text ? `${text}s` : text)

const appChoices = () => {
  const apps = installedApps()
  const choices = []
  if (apps.web)
    choices.push({ name: 'web      (website; also the emulator mobile app and the desktop app)', value: 'web' })
  if (apps.mobile === 'expo') choices.push({ name: 'mobile   (the Expo phone app)', value: 'mobile' })
  return choices
}

const requireName = (kind) => (value) =>
  /^[A-Za-z][A-Za-z0-9 _-]*$/.test(String(value).trim())
    ? true
    : `Give the ${kind} a name that starts with a letter (letters, numbers, spaces)`

const yes = (value) => value === true || value === 'yes' || value === 'y' || value === 'true'

/** Tells the person what was made and what to do next. */
const tell = (message) => () => message

// Fields for `generate api`: "name:string,price:number" → [{ name, type, tsType }]
const TS_TYPES = {
  string: 'string',
  text: 'string',
  number: 'number',
  int: 'number',
  integer: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'string'
}

function parseFields(input) {
  return String(input || 'name:string')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [rawName, rawType = 'string'] = pair.split(':').map((part) => part.trim())
      const type = rawType.toLowerCase()
      if (!TS_TYPES[type])
        throw new Error(`Unknown type "${rawType}" for "${rawName}". Use: string, number, boolean, date`)
      return { name: camel(rawName), type, tsType: TS_TYPES[type] }
    })
}

function sampleValue(field, index, singular) {
  if (field.tsType === 'number') return index * 10
  if (field.tsType === 'boolean') return index % 2 === 1
  if (field.type === 'date') return `2026-01-0${index}T09:00:00.000Z`
  return `${title(singular)} ${index} ${field.name}`
}

const sampleRow = (fields, index, singular) =>
  Object.fromEntries(fields.map((field) => [field.name, sampleValue(field, index, singular)]))

/** A JavaScript object literal in this project's style: { id: 1, name: 'x' } */
const literal = (object) =>
  `{ ${Object.entries(object)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : value}`)
    .join(', ')} }`

/** Inserts `line` above a "plop:<marker>" comment, with the marker's indentation. */
const insertAbove = (file, marker, line) => ({
  type: 'modify',
  path: file,
  pattern: new RegExp(`^([ \\t]*)(.*plop:${marker}.*)$`, 'm'),
  // "\{{" keeps Handlebars from reading JSX like options={{ ... }} as a template tag.
  template: `$1${line.replace(/{{/g, '\\{{')}\n$1$2`
})

/** Adds a last step that formats every file the generator created or changed. */
function withFormatting(actions) {
  const files = actions.filter((action) => typeof action === 'object' && action.path).map((action) => action.path)
  return [
    ...actions.slice(0, -1),
    () => {
      formatFiles([...new Set(files)])
      return 'Formatted'
    },
    actions.at(-1)
  ]
}

export default function (plop) {
  // Every generator formats what it wrote before printing its "what next" message.
  const generator = (name, config) =>
    plop.setGenerator(name, { ...config, actions: (answers) => withFormatting(config.actions(answers)) })

  plop.setWelcomeMessage('What do you want to create?')
  plop.setHelper('lowerCase', (text) => String(text).toLowerCase())

  // -------------------------------------------------------------------------
  // page
  // -------------------------------------------------------------------------
  generator('page', {
    description: 'A new page / screen (adds it to the app and, if you like, the menu)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Page name (e.g. Profile, Order History):',
        validate: requireName('page')
      },
      { type: 'list', name: 'app', message: 'Which app?', choices: appChoices(), default: 'web' },
      { type: 'confirm', name: 'inNav', message: 'Show it in the navigation menu / tabs?', default: true },
      { type: 'confirm', name: 'requiresLogin', message: 'Only for signed-in users?', default: false }
    ],
    actions(answers) {
      answers.inNav = yes(answers.inNav)
      answers.requiresLogin = yes(answers.requiresLogin)
      const name = pascal(answers.name)
      const slug = kebab(answers.name)

      if (answers.app === 'mobile') {
        const file = answers.inNav ? `${MOBILE}/app/(tabs)/${slug}.tsx` : `${MOBILE}/app/${slug}.tsx`
        const actions = [{ type: 'add', path: file, templateFile: 'plop-templates/mobile/screen.tsx.hbs' }]
        if (answers.inNav) {
          actions.push(
            insertAbove(
              `${MOBILE}/app/(tabs)/_layout.tsx`,
              'tabs',
              `<Tabs.Screen name="${slug}" options={{ title: '${title(answers.name)}', tabBarIcon: icon('ellipse-outline') }} />`
            )
          )
        }
        actions.push(
          tell(
            `Screen ready: ${file}. Open it in Expo Go${answers.inNav ? ` (new "${title(answers.name)}" tab)` : ` with router.push('/${slug}')`}.`
          )
        )
        return actions
      }

      const dir = `${WEB}/pages/${slug}`
      const options = [
        answers.inNav && `label: '${title(answers.name)}'`,
        answers.requiresLogin && 'requiresLogin: true'
      ].filter(Boolean)
      return [
        { type: 'add', path: `${dir}/${name}Page.tsx`, templateFile: 'plop-templates/web/page.tsx.hbs' },
        { type: 'add', path: `${dir}/${name}Page.test.tsx`, templateFile: 'plop-templates/web/page.test.tsx.hbs' },
        insertAbove(`${WEB}/app/routes.tsx`, 'imports', `import { ${name}Page } from '@/pages/${slug}/${name}Page'`),
        insertAbove(
          `${WEB}/app/routes.tsx`,
          'routes',
          `{ path: '/${slug}', element: <${name}Page />${options.length ? `, ${options.join(', ')}` : ''} },`
        ),
        tell(`Page ready at http://localhost:5173/${slug}  (file: ${dir}/${name}Page.tsx)`)
      ]
    }
  })

  // -------------------------------------------------------------------------
  // component
  // -------------------------------------------------------------------------
  const FOLDERS = {
    ui: 'Small building blocks used by every page (buttons, badges, cards...).',
    layout: 'The frame around pages (header, navigation, sidebars...).',
    shared: 'Bigger pieces made from building blocks, used on more than one page.'
  }

  generator('component', {
    description: 'A reusable piece of screen (a card, a list row, a header...)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (e.g. PriceTag, User Card):',
        validate: requireName('component')
      },
      { type: 'list', name: 'app', message: 'Which app?', choices: appChoices(), default: 'web' },
      {
        type: 'list',
        name: 'folder',
        message: 'What kind?',
        choices: [
          { name: 'ui      small building block (button, badge, tag...)', value: 'ui' },
          { name: 'shared  bigger piece used on several pages (product card, comment...)', value: 'shared' },
          { name: 'layout  frame around pages (sidebar, footer...)', value: 'layout' }
        ],
        default: 'ui'
      },
      { type: 'confirm', name: 'withTest', message: 'Add a test file too? (website only)', default: true }
    ],
    actions(answers) {
      const name = pascal(answers.name)
      answers.folderDescription = FOLDERS[answers.folder] ?? FOLDERS.shared

      if (answers.app === 'mobile') {
        const dir = `${MOBILE}/src/components/${answers.folder}`
        return [
          {
            type: 'add',
            path: `${dir}/index.ts`,
            templateFile: 'plop-templates/mobile/barrel.ts.hbs',
            skipIfExists: true
          },
          { type: 'add', path: `${dir}/${name}.tsx`, templateFile: 'plop-templates/mobile/component.tsx.hbs' },
          insertAbove(`${dir}/index.ts`, 'exports', `export * from './${name}'`),
          tell(`Use it with: import { ${name} } from '@/components/${answers.folder}'`)
        ]
      }

      const dir = `${WEB}/components/${answers.folder}`
      const actions = [
        { type: 'add', path: `${dir}/index.ts`, templateFile: 'plop-templates/web/barrel.ts.hbs', skipIfExists: true },
        { type: 'add', path: `${dir}/${name}/${name}.tsx`, templateFile: 'plop-templates/web/component.tsx.hbs' },
        { type: 'add', path: `${dir}/${name}/index.ts`, templateFile: 'plop-templates/web/component-index.ts.hbs' },
        insertAbove(`${dir}/index.ts`, 'exports', `export * from './${name}'`)
      ]
      if (yes(answers.withTest))
        actions.push({
          type: 'add',
          path: `${dir}/${name}/${name}.test.tsx`,
          templateFile: 'plop-templates/web/component.test.tsx.hbs'
        })
      actions.push(tell(`Use it with: import { ${name} } from '@/components/${answers.folder}'`))
      return actions
    }
  })

  // -------------------------------------------------------------------------
  // api
  // -------------------------------------------------------------------------
  const OPERATIONS = ['list', 'get', 'create', 'update', 'delete']

  generator('api', {
    description: 'A new kind of data from the server (with fake data and ready-to-use hooks)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What kind of data? Use a plural word (e.g. products, orders, blog posts):',
        validate: (value) => {
          const valid = requireName('data')(value)
          if (valid !== true) return valid
          return existsSync(path.join(ROOT, API, kebab(pluralize(value))))
            ? `packages/api/src/${kebab(pluralize(value))} already exists`
            : true
        }
      },
      {
        type: 'input',
        name: 'fields',
        message: 'Its fields as name:type, comma separated (types: string, number, boolean, date):',
        default: 'name:string',
        validate: (value) => {
          try {
            parseFields(value)
            return true
          } catch (error) {
            return error.message
          }
        }
      },
      {
        type: 'checkbox',
        name: 'operations',
        message: 'What should the app be able to do?',
        choices: [
          { name: 'list    get all of them', value: 'list', checked: true },
          { name: 'get     get one by id', value: 'get', checked: true },
          { name: 'create  add a new one', value: 'create', checked: true },
          { name: 'update  change one', value: 'update', checked: true },
          { name: 'delete  remove one', value: 'delete', checked: true }
        ]
      }
    ],
    actions(answers) {
      const plural = pluralize(answers.name)
      const singular = singularize(plural)
      const chosen = Array.isArray(answers.operations)
        ? answers.operations
        : String(answers.operations || OPERATIONS.join(','))
            .split(',')
            .map((op) => op.trim())
      const ops = Object.fromEntries(OPERATIONS.map((op) => [op, chosen.includes(op)]))
      ops.mutations = ops.create || ops.update || ops.delete
      if (!OPERATIONS.some((op) => ops[op])) throw new Error('Pick at least one operation')

      const fieldList = parseFields(answers.fields)
      Object.assign(answers, {
        folder: kebab(plural),
        singular,
        singularPascal: pascal(singular),
        singularCamel: camel(singular),
        singularTitle: title(singular),
        pluralPascal: pascal(plural),
        pluralCamel: camel(plural),
        fieldList,
        ops,
        requiredFields: fieldList.filter((field) => field.tsType !== 'boolean').map((field) => field.name),
        mockRows: `[\n${[1, 2, 3].map((index) => `  ${literal({ id: index, ...sampleRow(fieldList, index, singular), createdAt: `2026-01-0${index}T09:00:00.000Z` })}`).join(',\n')}\n]`,
        sampleInput: literal(sampleRow(fieldList, 9, singular))
      })

      const dir = `${API}/${answers.folder}`
      const file = (suffix) => `${dir}/${answers.folder}.${suffix}`
      const hooks = [
        ops.list && `use${answers.pluralPascal}()`,
        ops.get && `use${answers.singularPascal}(id)`,
        ops.create && `useCreate${answers.singularPascal}()`,
        ops.update && `useUpdate${answers.singularPascal}()`,
        ops.delete && `useDelete${answers.singularPascal}()`
      ].filter(Boolean)
      return [
        { type: 'add', path: file('types.ts'), templateFile: 'plop-templates/api/types.ts.hbs' },
        { type: 'add', path: file('api.ts'), templateFile: 'plop-templates/api/api.ts.hbs' },
        // No trailing comma after the last entry.
        { type: 'modify', path: file('api.ts'), pattern: /,\n}\n$/, template: '\n}\n' },
        { type: 'add', path: file('mock.ts'), templateFile: 'plop-templates/api/mock.ts.hbs' },
        { type: 'add', path: file('hooks.ts'), templateFile: 'plop-templates/api/hooks.ts.hbs' },
        { type: 'add', path: file('test.ts'), templateFile: 'plop-templates/api/test.ts.hbs' },
        { type: 'add', path: `${dir}/index.ts`, templateFile: 'plop-templates/api/index.ts.hbs' },
        insertAbove(`${API}/index.ts`, 'exports', `export * from './${answers.folder}'`),
        tell(
          `In any page: import { ${hooks.join(', ').replace(/\(.*?\)/g, '')} } from '@app/api'. Fake data lives in ${file('mock.ts')}; the real server needs the same paths (/${answers.folder}).`
        )
      ]
    }
  })

  // -------------------------------------------------------------------------
  // hook
  // -------------------------------------------------------------------------
  generator('hook', {
    description: 'A reusable piece of logic (a timer, a form helper, reading the location...)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Hook name (e.g. countdown → useCountdown):',
        validate: requireName('hook')
      },
      { type: 'list', name: 'app', message: 'Which app?', choices: appChoices(), default: 'web' }
    ],
    actions(answers) {
      answers.hookName = `use${pascal(String(answers.name).replace(/^use(?=[A-Z\s_-])/, ''))}`
      const file =
        answers.app === 'mobile' ? `${MOBILE}/src/hooks/${answers.hookName}.ts` : `${WEB}/hooks/${answers.hookName}.ts`
      return [
        {
          type: 'add',
          path: file,
          templateFile: `plop-templates/${answers.app === 'mobile' ? 'mobile' : 'web'}/hook.ts.hbs`
        },
        tell(`Use it with: import { ${answers.hookName} } from '@/hooks/${answers.hookName}'`)
      ]
    }
  })
}
