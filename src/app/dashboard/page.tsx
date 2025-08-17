"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    console.log('Dashboard useEffect - Status:', status, 'Session:', session)
    
    if (status === 'loading') return // Still loading

    if (status === 'unauthenticated' || !session?.user) {
      console.log('No session found, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    console.log('User role:', session.user.role)
    
    // Only allow teachers and admins to access dashboard
    if (!['TEACHER', 'ADMIN'].includes(session.user.role || '')) {
      console.log('Insufficient role, redirecting to home')
      router.push('/')
      return
    }

    console.log('Rendering dashboard for user:', session.user.username)
  }, [session, status, router])

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show loading while redirecting if no session
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecting to sign in...</p>
        </div>
      </div>
    )
  }

  // Check role access
  if (!['TEACHER', 'ADMIN'].includes(session.user.role || '')) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Access denied. You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="text-sm text-gray-600">
          Welcome, {session.user.username}
        </div>
      </div>
      
      <DashboardCharts />
    </div>
  )
} 