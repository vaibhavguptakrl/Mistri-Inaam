import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AdminUser } from '../types'

interface AuthContextType {
  currentUser: User | null
  adminProfile: AdminUser | null
  loading: boolean
  signIn: (email: string, pass: string) => Promise<void>
  createInitialOwner: (email: string, pass: string, name: string) => Promise<void>
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
          if (adminDoc.exists()) {
            setAdminProfile(adminDoc.data() as AdminUser)
          } else {
            // Default to owner for first admin if doc doesn't exist
            const newAdmin: AdminUser = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Store Admin',
              role: 'owner',
              createdAt: new Date().toISOString()
            }
            await setDoc(doc(db, 'admins', user.uid), newAdmin, { merge: true })
            setAdminProfile(newAdmin)
          }
        } catch (err) {
          console.error('Failed to load admin profile:', err)
        }
      } else {
        setAdminProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass)
  }

  const createInitialOwner = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass)
    const newAdmin: AdminUser = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: name,
      role: 'owner',
      createdAt: new Date().toISOString()
    }
    await setDoc(doc(db, 'admins', cred.user.uid), newAdmin)
    setAdminProfile(newAdmin)
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
        createInitialOwner,
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
