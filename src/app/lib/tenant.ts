import 'server-only'

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

export function parseSubdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = host.split(':')[0]
  // Handle localhost and Vercel previews gracefully
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    // Support demo.localhost or fall back to DEV_TENANT_SUBDOMAIN or 'demo'
    const labels = hostname.split('.')
    if (labels.length > 1 && labels[0] !== 'localhost') return labels[0]
    return process.env.DEV_TENANT_SUBDOMAIN || 'demo'
  }
  const labels = hostname.split('.')
  if (labels.length < 3) return null
  return labels[0]
}

export async function getTenantConfigForHost(host: string): Promise<TenantConfig | null> {
  const apiBase = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'
  const url = `${apiBase.replace(/\/$/, '')}/tenants/config?host=${encodeURIComponent(host)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data || null
}


