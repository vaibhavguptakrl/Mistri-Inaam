import { Link } from 'react-router'
import { getApiSettings } from '@app/api'
import { projectConfig } from '@app/config'
import { Badge, Card, PageHeader } from '@/components/ui'
import { platform } from '@/lib/platform'

const steps = [
  { title: 'Describe what you want', text: 'Tell your AI assistant about the page or feature in plain words.' },
  {
    title: 'Let it use the generators',
    text: 'It runs npm run generate to create pages, components and APIs the right way.'
  },
  { title: 'Check it here', text: 'This window reloads by itself whenever a file changes.' }
]

export function HomePage() {
  const usingFakeData = getApiSettings().useMocks
  return (
    <>
      <PageHeader
        title={`Welcome to ${projectConfig.name}`}
        description="Your app is running. Edit apps/web/src/pages/home/HomePage.tsx to change this page."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge tone="primary">Running on: {platform}</Badge>
        <Badge tone={usingFakeData ? 'warning' : 'success'}>
          {usingFakeData ? 'Using fake data' : 'Connected to your backend'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <p className="mb-2 text-sm font-semibold text-primary">Step {index + 1}</p>
            <p className="font-medium text-text">{step.title}</p>
            <p className="mt-1 text-sm text-text-muted">{step.text}</p>
          </Card>
        ))}
      </div>

      {/* demo:start */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-text">Examples to learn from</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/todos">
          <Card className="h-full transition hover:border-primary">
            <p className="font-medium text-text">Todo list →</p>
            <p className="mt-1 text-sm text-text-muted">
              Sign in, then add, tick and delete items. Shows loading, saving and errors.
            </p>
          </Card>
        </Link>
        <Link to="/users">
          <Card className="h-full transition hover:border-primary">
            <p className="font-medium text-text">Users →</p>
            <p className="mt-1 text-sm text-text-muted">A searchable list with a detail page for each person.</p>
          </Card>
        </Link>
      </div>
      {/* demo:end */}
    </>
  )
}
