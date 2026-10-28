import { useCallback, useState } from 'react'
import { storage } from '@/lib/storage'

/** Like useState, but remembered after the app is closed. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = storage.get(key)
    if (saved === null) return initial
    try {
      return JSON.parse(saved) as T
    } catch {
      return initial
    }
  })
  const save = useCallback(
    (next: T) => {
      setValue(next)
      storage.set(key, JSON.stringify(next))
    },
    [key]
  )
  return [value, save] as const
}
