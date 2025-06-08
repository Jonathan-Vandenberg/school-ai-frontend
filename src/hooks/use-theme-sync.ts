'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'

export function useThemeSync() {
  const { data: session } = useSession()
  const { setTheme } = useTheme()

  // Load user's theme preference from database when they log in
  useEffect(() => {
    const loadUserThemePreference = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data?.theme) {
              setTheme(result.data.theme)
            }
          }
        } catch (error) {
          console.error('Failed to load user theme preference:', error)
          // Fallback to localStorage or system default
          const storedTheme = localStorage.getItem('theme') || 'system'
          setTheme(storedTheme)
        }
      }
    }

    loadUserThemePreference()
  }, [session?.user?.id, setTheme])

  return null // This hook doesn't return anything
} 