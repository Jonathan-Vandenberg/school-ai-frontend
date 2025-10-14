import 'server-only'
import { headers } from 'next/headers'
import { getTenantConfigForHost, parseSubdomainFromHost } from './tenant'
import { AuthService } from '@/lib/services'

export type AudioApiAuth = {
  baseUrl: string
  apiKey: string
  subdomain: string | null
}

export async function getAudioApiAuth(): Promise<AudioApiAuth> {
  const baseUrl = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'
  let apiKey = process.env.AUDIO_ANALYSIS_API_KEY || ''
  const host = (await Promise.resolve(headers())).get('host') || ''
  const subdomain = parseSubdomainFromHost(host)
  // Warm tenant config (optional, not used directly for auth yet)
  if (host) {
    // Fire and forget; ignore errors
    getTenantConfigForHost(host).catch(() => {})
  }
  // TODO: replace with gateway-provided per-tenant key. For now fall back to global key.
  return { baseUrl, apiKey, subdomain }
}

export async function postFormToAudioApi(path: string, form: FormData): Promise<Response> {
  const { baseUrl, apiKey, subdomain } = await getAudioApiAuth()
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Audio analysis API key not configured' }), { status: 500 })
  }

  try {
    // Get current user for tracking
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Add tenant and user context to form data for usage tracking
    if (subdomain) {
      form.append('tenant_subdomain', subdomain)
    }
    form.append('user_id', currentUser.id)
    form.append('user_role', currentUser.customRole)
    
  } catch (error) {
    // If user auth fails, still proceed without user context
    console.warn('Failed to get user context for audio API call:', error)
  }

  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  return fetch(url, {
    method: 'POST',
    body: form,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(subdomain ? { 'x-tenant-subdomain': subdomain } : {}),
    },
  })
}


