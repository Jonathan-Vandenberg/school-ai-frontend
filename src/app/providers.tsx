'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { TenantConfig } from '@/components/providers/tenant-provider'

interface ProvidersProps {
  children: React.ReactNode
  tenant?: TenantConfig | null
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