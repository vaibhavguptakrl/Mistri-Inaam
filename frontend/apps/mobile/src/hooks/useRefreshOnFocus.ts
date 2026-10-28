import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'

/**
 * Reloads a screen's data when you come back to it (e.g. after editing something
 * on another screen). Pass the refetch function from a query hook:
 *   const todos = useTodos()
 *   useRefreshOnFocus(todos.refetch)
 */
export function useRefreshOnFocus(refetch: () => unknown) {
  const firstTime = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstTime.current) {
        firstTime.current = false
        return
      }
      refetch()
    }, [refetch])
  )
}
