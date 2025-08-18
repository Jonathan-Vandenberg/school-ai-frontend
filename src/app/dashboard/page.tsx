import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }

  const role = session.user.role
  if (role !== 'ADMIN') {
    redirect('/profile')
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