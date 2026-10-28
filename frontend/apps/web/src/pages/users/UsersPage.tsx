import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { useUsers } from '@app/api'
import { Avatar, Badge, EmptyState, ErrorMessage, Input, PageHeader, Spinner } from '@/components/ui'

/** Example page: a searchable list where each row links to its own page. */
export function UsersPage() {
  const [search, setSearch] = useState('')
  const users = useUsers(useDeferredValue(search))

  return (
    <>
      <PageHeader title="Users" description="Example: search a list and open a detail page." />
      <Input
        className="mb-6 max-w-sm"
        placeholder="Search by name or email"
        aria-label="Search users"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {users.isPending && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {users.isError && <ErrorMessage error={users.error} onRetry={() => users.refetch()} />}
      {users.data?.users.length === 0 && <EmptyState title="No one matches" description="Try a different search." />}

      <ul className="grid gap-3 sm:grid-cols-2">
        {users.data?.users.map((user) => (
          <li key={user.id}>
            <Link
              to={`/users/${user.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition hover:border-primary"
            >
              <Avatar name={user.name} src={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{user.name}</p>
                <p className="truncate text-sm text-text-muted">{user.email}</p>
              </div>
              {user.role === 'admin' && <Badge tone="primary">Admin</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
