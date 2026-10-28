import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { authToken, useLogin, useLogout, useMe, type LoginInput, type User } from '@app/api'

interface AuthState {
  user: User | null
  /** True while we check whether the saved login still works. */
  isLoading: boolean
  isSignedIn: boolean
  signIn: (input: LoginInput) => Promise<User>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(authToken.subscribe, authToken.get)
  const me = useMe(Boolean(token))
  const login = useLogin()
  const logout = useLogout()

  const user = token ? (me.data?.user ?? null) : null
  const value: AuthState = {
    user,
    isLoading: Boolean(token) && me.isPending,
    isSignedIn: Boolean(user),
    signIn: async (input) => (await login.mutateAsync(input)).user,
    signOut: () => logout.mutateAsync()
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** The signed-in user and signIn / signOut. Works in any page or component. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
