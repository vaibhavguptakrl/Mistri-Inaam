import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { errorMessage, getApiSettings } from '@app/api'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'

export function LoginPage() {
  const { signIn, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (isSignedIn) return <Navigate to={next} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await signIn({ email, password })
      navigate(next, { replace: true })
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <h1 className="mb-1 text-xl font-semibold text-text">Sign in</h1>
        {getApiSettings().useMocks && (
          <p className="mb-5 text-sm text-text-muted">
            Demo mode: use any email and the password <code className="font-mono">password</code>.
          </p>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error}
          />
          <Button type="submit" loading={saving} fullWidth>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  )
}
