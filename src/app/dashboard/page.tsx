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
  TrendingUp
} from 'lucide-react'
import { getRoleColor, getRoleDisplayName } from '@/lib/utils'


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

      {/* Phase 1 Completion Alert */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🎉 Phase 1 Complete!</strong> Authentication system with role-based access and global navigation is now fully functional.
        </AlertDescription>
      </Alert>

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
                <div className="text-2xl font-bold">{users.length}</div>
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
                  {users.filter(u => u.customRole === 'STUDENT').length}
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

      {userRole === 'ADMIN' && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Latest users registered in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice(0, 5).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.customRole)}>
                        {getRoleDisplayName(user.customRole)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
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