import 'server-only'
import { headers } from 'next/headers'
import { getTenantConfigForHost, parseSubdomainFromHost } from './tenant'

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


