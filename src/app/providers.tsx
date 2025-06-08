'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/providers/theme-provider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
} 