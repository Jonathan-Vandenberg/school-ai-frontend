import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get the current tenant info from headers (set by middleware)
    const hdrs = await headers()
    const host = hdrs.get('host') || ''
    
    if (!host) {
      return NextResponse.json(
        { error: 'Unable to determine tenant' },
        { status: 400 }
      )
    }

    // Parse the request body
    const { display_name, logo_url, primary_hex, secondary_hex, accent_hex } = await req.json()

    // Validate hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (primary_hex && !hexColorRegex.test(primary_hex)) {
      return NextResponse.json(
        { error: 'Invalid primary color format' },
        { status: 400 }
      )
    }
    if (secondary_hex && !hexColorRegex.test(secondary_hex)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format' },
        { status: 400 }
      )
    }
    if (accent_hex && !hexColorRegex.test(accent_hex)) {
      return NextResponse.json(
        { error: 'Invalid accent color format' },
        { status: 400 }
      )
    }

    const apiBase = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'

    // If display_name is provided, we need to update the tenant info first
    if (display_name) {
      console.log('Updating tenant display name to:', display_name)
      
      // First, get the tenant ID
      // Extract subdomain (everything before .speechanalyser.com)
      const hostWithoutPort = host.split(':')[0]
      const subdomain = hostWithoutPort.replace('.speechanalyser.com', '')
      console.log('Extracted subdomain:', subdomain)
      
      const tenantIdUrl = `${apiBase.replace(/\/$/, '')}/api/admin/tenant-id?subdomain=${encodeURIComponent(subdomain)}`
      console.log('Calling tenant ID URL:', tenantIdUrl)
      
      const tenantIdResponse = await fetch(tenantIdUrl)
      if (!tenantIdResponse.ok) {
        console.error('Failed to resolve tenant ID:', tenantIdResponse.status, await tenantIdResponse.text())
        return NextResponse.json(
          { error: 'Failed to resolve tenant ID' },
          { status: 500 }
        )
      }
      
      const tenantIdResult = await tenantIdResponse.json()
      console.log('Tenant ID response:', tenantIdResult)
      const { tenant_id } = tenantIdResult
      
      if (!tenant_id) {
        console.error('No tenant ID returned from API')
        return NextResponse.json(
          { error: 'No tenant ID found' },
          { status: 500 }
        )
      }
      
      // Update tenant display name
      const updateTenantUrl = `${apiBase.replace(/\/$/, '')}/api/admin/tenants/${tenant_id}`
      console.log('Updating tenant via:', updateTenantUrl)
      console.log('Update payload:', { display_name })
      
      const tenantUpdateResponse = await fetch(updateTenantUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: display_name
        }),
      })

      const tenantUpdateResult = await tenantUpdateResponse.text()
      console.log('Tenant update response status:', tenantUpdateResponse.status)
      console.log('Tenant update response:', tenantUpdateResult)

      if (!tenantUpdateResponse.ok) {
        console.error('Failed to update tenant display name:', tenantUpdateResponse.status, tenantUpdateResult)
        return NextResponse.json(
          { error: 'Failed to update tenant display name' },
          { status: 500 }
        )
      }
      
      console.log('Tenant display name updated successfully')
    } else {
      console.log('No display_name provided, skipping tenant update')
    }

    // Call the audio-analysis API to update tenant branding
    const updateUrl = `${apiBase.replace(/\/$/, '')}/tenants/branding`
    
    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host,
        branding: {
          logo_url: logo_url || null,
          primary_hex: primary_hex || null,
          secondary_hex: secondary_hex || null,
          accent_hex: accent_hex || null,
          dark_mode: false // Default to false for now
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to update branding:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to update branding' },
        { status: 500 }
      )
    }

    const result = await response.json()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Branding updated successfully',
      data: result 
    })

  } catch (error) {
    console.error('Error updating branding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
