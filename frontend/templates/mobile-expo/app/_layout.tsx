import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { createQueryClient } from '@app/api'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { setupApi } from '@/lib/setupApi'

/**
 * The frame around every screen. Files in this folder are screens:
 * app/login.tsx is the /login screen, app/(tabs)/ are the tabs at the bottom.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    setupApi().finally(() => setReady(true))
  }, [])
  if (!ready) return null

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Screens />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function Screens() {
  const { colors, resolved } = useTheme()
  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
      </Stack>
    </>
  )
}
