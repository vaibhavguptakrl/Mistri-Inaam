import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AdminUser } from '../types'

interface AuthContextType {
  currentUser: User | null
  adminProfile: AdminUser | null
  loading: boolean
  signIn: (email: string, pass: string) => Promise<void>
  signOut: () => Promise<void>
  isOwner: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid))
          const profile = adminDoc.exists() ? adminDoc.data() as AdminUser : null
          if (!profile || profile.role !== 'owner') {
            setAdminProfile(null)
            await firebaseSignOut(auth)
          } else {
            setAdminProfile(profile)
          }
        } catch (err) {
          console.error('Failed to load admin profile:', err)
          setAdminProfile(null)
          await firebaseSignOut(auth)
        }
      } else {
        setAdminProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, pass: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, pass)
    const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid))
    const profile = adminDoc.exists() ? adminDoc.data() as AdminUser : null
    if (!profile || profile.role !== 'owner') {
      await firebaseSignOut(auth)
      const error = new Error('This account is not authorized for the admin panel.') as Error & { code: string }
      error.code = 'admin/not-authorized'
      throw error
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        adminProfile,
        loading,
        signIn,
        signOut,
        isOwner: adminProfile?.role === 'owner'
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
