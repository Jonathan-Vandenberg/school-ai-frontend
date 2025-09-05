'use client'

import React, { createContext, useContext, useMemo } from 'react'

export type TenantBranding = {
  logo_url?: string | null
  primary_hex?: string | null
  secondary_hex?: string | null
  accent_hex?: string | null
  dark_mode?: boolean | null
}

export type TenantConfig = {
  id: string
  subdomain: string
  display_name: string
  status: string
  branding: TenantBranding
}

type TenantContextValue = {
  tenant: TenantConfig | null
}

const TenantContext = createContext<TenantContextValue>({ tenant: null })

export function useTenant() {
  return useContext(TenantContext)
}

export function TenantProvider({ tenant, children }: { tenant: TenantConfig | null; children: React.ReactNode }) {
  // Apply CSS variables to the document root
  React.useEffect(() => {
    if (!tenant?.branding) return
    
    const root = document.documentElement
    const b = tenant.branding
    
    // Apply brand colors as CSS custom properties
    if (b.primary_hex) root.style.setProperty('--brand-primary', b.primary_hex)
    if (b.secondary_hex) root.style.setProperty('--brand-secondary', b.secondary_hex)  
    if (b.accent_hex) root.style.setProperty('--brand-accent', b.accent_hex)
    
    // Cleanup function to reset to defaults when component unmounts
    return () => {
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
      root.style.removeProperty('--brand-accent')
    }
  }, [tenant])

  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  )
}


