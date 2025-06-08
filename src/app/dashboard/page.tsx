'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { getRoleColor, getRoleDisplayName } from '@/lib/utils'

interface ActivityLogEntry {
  id: string
  type: string
  action?: string | null
  details?: any
  createdAt: string
  userId?: string | null
  classId?: string | null
  assignmentId?: string | null
  user?: {
    id: string
    username: string
    email: string
    customRole: string
  } | null
  class?: {
    id: string
    name: string
  } | null
  assignment?: {
    id: string
    topic?: string | null
  } | null
}

interface Assignment {
  id: string
  name: string
  description?: string
  assignmentType: 'CLASS' | 'INDIVIDUAL'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  teacherId: string
  classId?: string
  studentId?: string
  scheduledPublishAt?: string
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  username: string
  email: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roleCounts, setRoleCounts] = useState({
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0,
    total: 0
  })
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Load assignments
        const assignmentsResponse = await fetch('/api/assignments')
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json()
          setAssignments(assignmentsData.data || [])
        }

        // Load users (only for admin and teachers)
        if (session?.user?.role === 'ADMIN' || session?.user?.role === 'TEACHER') {
          const usersResponse = await fetch('/api/users')
          if (usersResponse.ok) {
            const usersData = await usersResponse.json()
            setUsers(usersData.data || [])
            
            // Use the accurate role counts from the API
            if (usersData.roleCounts) {
              const counts = usersData.roleCounts
              setRoleCounts({
                admin: counts.admin || 0,
                teacher: counts.teacher || 0,
                student: counts.student || 0,
                parent: counts.parent || 0,
                total: (counts.admin || 0) + (counts.teacher || 0) + (counts.student || 0) + (counts.parent || 0)
              })
            }
          }
        }

        // Load recent activity logs (for admins)
        if (session?.user?.role === 'ADMIN') {
          try {
            const logsResponse = await fetch('/api/activity-logs?limit=10')
            if (logsResponse.ok) {
              const logsData = await logsResponse.json()
              setActivityLogs(logsData.data || [])
            }
          } catch (err) {
            console.error('Error loading activity logs:', err)
          }
        }
      } catch (err) {
        setError('Failed to load data')
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      loadData()
    }
  }, [session])

  const getDashboardTitle = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin Dashboard'
      case 'TEACHER': return 'Teacher Dashboard'
      case 'STUDENT': return 'Student Dashboard'
      case 'PARENT': return 'Parent Dashboard'
      default: return 'Dashboard'
    }
  }

  const getDashboardDescription = (role: string, username: string) => {
    switch (role) {
      case 'ADMIN': 
        return `Welcome back, ${username}! Manage the entire JIS AI platform from here.`
      case 'TEACHER': 
        return `Welcome back, ${username}! Create and manage assignments for your students.`
      case 'STUDENT': 
        return `Welcome back, ${username}! Complete your assignments and track your progress.`
      case 'PARENT': 
        return `Welcome back, ${username}! Monitor your child's learning progress.`
      default: 
        return `Welcome back, ${username}!`
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'USER_DELETED':
      case 'USER_BLOCKED':
        return 'bg-red-100 text-red-800'
      case 'CLASS_CREATED':
      case 'CLASS_UPDATED':
        return 'bg-blue-100 text-blue-800'
      case 'ASSIGNMENT_CREATED':
      case 'ASSIGNMENT_UPDATED':
        return 'bg-purple-100 text-purple-800'
      case 'USER_LOGIN':
        return 'bg-gray-100 text-gray-800'
      case 'USER_LOGIN_FAILED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const userRole = session?.user?.role || ''
  const username = session?.user?.username || session?.user?.email || 'User'

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          {getDashboardTitle(userRole)}
        </h1>
        <p className="text-muted-foreground mt-2">
          {getDashboardDescription(userRole, username)}
        </p>
      </div>

      {/* Stats Cards - Role-based */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active learning modules
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignments.filter(a => a.status === 'ACTIVE').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently available
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === 'ADMIN' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roleCounts.total}</div>
                <p className="text-xs text-muted-foreground">
                  Students, teachers, and admins
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {roleCounts.student}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enrolled learners
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === 'STUDENT' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Assignments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignments.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available to complete
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Assignments finished
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Currently working on
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Overall performance
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Content based on role */}
      {(userRole === 'ADMIN' || userRole === 'TEACHER') && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>
              Latest assignments created in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.slice(0, 5).map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.name || 'Untitled Assignment'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {assignment.assignmentType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          assignment.status === 'ACTIVE' ? 'default' :
                          assignment.status === 'DRAFT' ? 'secondary' : 'destructive'
                        }
                      >
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {userRole === 'ADMIN' && activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.slice(0, 10).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.action || 'System activity'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActivityTypeColor(log.type)}>
                        {formatActivityType(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getRoleColor(log.user.customRole)}>
                            {getRoleDisplayName(log.user.customRole)}
                          </Badge>
                          <span>{log.user.username}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {userRole === 'STUDENT' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>
              Your latest assignments to complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No assignments yet</h3>
                <p className="text-muted-foreground">
                  Check back later for new assignments from your teachers.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.name || 'Untitled Assignment'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assignment.assignmentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Not Started
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.scheduledPublishAt ? 
                          new Date(assignment.scheduledPublishAt).toLocaleDateString() : 
                          'No due date'
                        }
                      </TableCell>
                      <TableCell>
                        <Button size="sm">
                          Start
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 