import { Link, useParams } from 'react-router'
import { useUser } from '@app/api'
import { Avatar, Badge, Card, ErrorMessage, Spinner } from '@/components/ui'

/** Example page: reads the id from the address (/users/3) and loads that one user. */
export function UserDetailPage() {
  const { id } = useParams()
  const user = useUser(Number(id))

  return (
    <>
      <Link to="/users" className="mb-6 inline-block text-sm text-primary">
        ← All users
      </Link>
      {user.isPending && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {user.isError && <ErrorMessage error={user.error} />}
      {user.data && (
        <Card className="flex items-center gap-5">
          <Avatar name={user.data.name} src={user.data.avatarUrl} size="lg" />
          <div>
            <h1 className="text-xl font-semibold text-text">{user.data.name}</h1>
            <p className="text-sm text-text-muted">{user.data.email}</p>
            <div className="mt-2">
              <Badge tone={user.data.role === 'admin' ? 'primary' : 'neutral'}>{user.data.role}</Badge>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
