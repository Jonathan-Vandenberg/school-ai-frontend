'use client'

import { useEffect, useState } from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'
import { useSession } from 'next-auth/react'
import { useThemeSync } from '@/hooks/use-theme-sync'

interface ExtendedThemeProviderProps extends ThemeProviderProps {
  children: React.ReactNode
}

function ThemeSync() {
  useThemeSync()
  return null
}

export function ThemeProvider({ children, ...props }: ExtendedThemeProviderProps) {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  // Sync theme with user preferences
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange
      {...props}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
} 