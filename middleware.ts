import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Check if route requires specific roles
    const matchedRoute = Object.keys(protectedRoutes).find(route => 
      pathname.startsWith(route)
    )

    if (matchedRoute) {
      const requiredRoles = protectedRoutes[matchedRoute as keyof typeof protectedRoutes]
      const userRole = token?.role

      if (!userRole || !requiredRoles.includes(userRole)) {
        // Redirect to unauthorized page or login
        const url = req.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    // Protect dashboard routes - only admins and teachers can access
    if (pathname.startsWith('/dashboard')) {
      if (!token?.role || !['ADMIN'].includes(token.role)) {
        // Redirect unauthorized users to their profile
        return NextResponse.redirect(new URL('/profile', req.url))
      }
    }

    // Allow access to profile page for authenticated users
    if (pathname.startsWith('/profile')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow access to auth pages without token
        if (pathname.startsWith('/auth/')) {
          return true
        }

        // Allow access to public pages
        if (pathname === '/' || pathname.startsWith('/public')) {
          return true
        }

        // Require token for protected routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/teachers/:path*',
    '/students/:path*',
    '/classes/:path*',
    '/assignments/:path*',
    '/tools/:path*',
    '/api/admin/:path*',
    '/api/teachers/:path*',
    '/api/students/:path*',
    '/api/classes/:path*',
    '/api/assignments/:path*',
    '/api/tools/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
  ]
} 