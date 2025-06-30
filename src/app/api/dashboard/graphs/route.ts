import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, isAdmin } from '@/lib/auth'
import { DashboardService } from '@/lib/services/dashboard.service'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and require admin/teacher
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, allow admin and teacher access
    // We can add more specific role checking later if needed
    if (!isAdmin(session.user.customRole) && session.user.customRole !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const days = parseInt(searchParams.get('days') || '30')
    const metric = searchParams.get('metric') as 'completion' | 'success' | 'assignments' | 'students'

    switch (type) {
      case 'overview':
        // Get comprehensive dashboard data
        const dashboardData = await DashboardService.getDashboardGraphData(days)
        return NextResponse.json(dashboardData)

      case 'trend':
        // Get specific metric trend
        if (!metric) {
          return NextResponse.json({ error: 'Metric parameter required for trend data' }, { status: 400 })
        }
        const trendData = await DashboardService.getMetricTrend(metric, days)
        return NextResponse.json({ metric, days, data: trendData })

      case 'summary':
        // Get dashboard summary with changes
        const summaryData = await DashboardService.getDashboardSummary()
        return NextResponse.json(summaryData)

      case 'snapshots':
        // Get raw snapshot data
        const snapshotData = await DashboardService.getSnapshotTrends(days)
        return NextResponse.json({ snapshots: snapshotData, days })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

  } catch (error) {
    console.error('Dashboard graphs API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
} 