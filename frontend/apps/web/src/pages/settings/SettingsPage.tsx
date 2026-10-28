import type { ColorMode } from '@app/config'
import { getApiSettings } from '@app/api'
import { projectConfig } from '@app/config'
import { Card, PageHeader } from '@/components/ui'
import { cn } from '@/lib/cn'
import { platform } from '@/lib/platform'
import { useTheme } from '@/providers/ThemeProvider'

const modes: Array<{ value: ColorMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Same as device' }
]

export function SettingsPage() {
  const { mode, setMode } = useTheme()
  const api = getApiSettings()

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-3 font-medium text-text">Appearance</h2>
          <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-border p-1">
            {modes.map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={mode === option.value}
                onClick={() => setMode(option.value)}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-sm',
                  mode === option.value ? 'bg-primary text-on-primary' : 'text-text-muted hover:text-text'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-text">About this app</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-text-muted">Name</dt>
            <dd className="text-text">{projectConfig.name}</dd>
            <dt className="text-text-muted">Running on</dt>
            <dd className="text-text">{platform}</dd>
            <dt className="text-text-muted">Data</dt>
            <dd className="text-text">{api.useMocks ? 'Fake data (no backend)' : api.baseUrl}</dd>
          </dl>
        </Card>
      </div>
    </>
  )
}
