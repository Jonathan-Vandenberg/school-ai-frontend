import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Define protected routes and their required roles
const protectedRoutes = {
  '/admin': ['ADMIN'],
  '/teachers': ['ADMIN', 'TEACHER'],
  '/students': ['ADMIN', 'TEACHER'],
  '/classes': ['ADMIN', 'TEACHER'],
  '/assignments': ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'],
  '/tools': ['ADMIN', 'TEACHER'],
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

  // Allow auth pages and API auth routes
  if (isAuthPage || isApiAuthRoute) {
    return NextResponse.next()
  }

  // Allow access to the init endpoint
  if (request.nextUrl.pathname === '/api/init') {
    return NextResponse.next()
  }

  // Redirect to signin if no token
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
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
  ],
} 