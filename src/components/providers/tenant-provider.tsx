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
  // Apply CSS variables for branding
  const style = useMemo<React.CSSProperties | undefined>(() => {
    if (!tenant?.branding) return undefined
    const b = tenant.branding
    const css: React.CSSProperties = {}
    if (b.primary_hex) (css as Record<string, string>)['--brand-primary'] = b.primary_hex
    if (b.secondary_hex) (css as Record<string, string>)['--brand-secondary'] = b.secondary_hex
    if (b.accent_hex) (css as Record<string, string>)['--brand-accent'] = b.accent_hex
    return css
  }, [tenant])

  return (
    <TenantContext.Provider value={{ tenant }}>
      <div style={style}>{children}</div>
    </TenantContext.Provider>
  )
}


