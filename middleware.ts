import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { parseSubdomainFromHost } from './src/app/lib/tenant'

// Define protected routes and their required roles
const protectedRoutes = {
  '/admin': ['ADMIN'],
  '/teachers': ['ADMIN', 'TEACHER'],
  '/students': ['ADMIN', 'TEACHER'],
  '/classes': ['ADMIN', 'TEACHER'],
  '/assignments': ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
  '/tools': ['ADMIN', 'TEACHER'],
  '/dashboard': ['ADMIN'],
  '/api/admin': ['ADMIN'],
  '/api/teachers': ['ADMIN', 'TEACHER'],
  '/api/students': ['ADMIN', 'TEACHER'],
  '/api/classes': ['ADMIN', 'TEACHER'],
  '/api/assignments': ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
  '/api/tools': ['ADMIN', 'TEACHER'],
} as const

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth')

  // Resolve subdomain and set header for server components/api routes
  const host = request.headers.get('host') || ''
  const subdomain = parseSubdomainFromHost(host)
  const response = NextResponse.next()
  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain)
  }

  // Allow auth pages and API auth routes
  if (isAuthPage || isApiAuthRoute) {
    return response
  }

  // Allow access to the init endpoint
  if (request.nextUrl.pathname === '/api/init') {
    return response
  }

  // Redirect to signin if no token
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  const pathname = request.nextUrl.pathname
  const userRole = token.role as string
  if (pathname === '/dashboard' && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/profile', request.url))
  }

  for (const [route, requiredRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!(requiredRoles as readonly string[]).includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Explicitly include dashboard route
    '/dashboard/:path*',
  ],
} 