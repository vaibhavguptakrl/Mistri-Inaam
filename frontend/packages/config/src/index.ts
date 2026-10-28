import project from '../../../project.config.json'

export type ColorMode = 'system' | 'light' | 'dark'
export type BrandColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate'
export type Radius = 'sharp' | 'rounded' | 'pill'
export type FontStyle = 'modern' | 'friendly' | 'classic' | 'mono'

export interface ProjectConfig {
  name: string
  slug: string
  appId: string
  targets: { web: boolean; mobile: boolean; desktop: boolean }
  mobile: { type: 'none' | 'expo' | 'emulator'; platforms: Array<'android' | 'ios'> }
  docker: boolean
  api: { mode: 'mock' | 'remote'; baseUrl: string }
  theme: { mode: ColorMode; brand: BrandColor; radius: Radius; font: FontStyle }
  demo: boolean
  setupComplete: boolean
}

/** Everything chosen during `npm run setup`. Edit project.config.json to change it. */
export const projectConfig = project as ProjectConfig
