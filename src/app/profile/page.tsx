'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Calendar, 
  BookOpen, 
  Award, 
  BarChart3,
  Settings,
  Users,
  GraduationCap
} from 'lucide-react'

// Import global utility functions
import { getRoleColor, getRoleDisplayName } from '@/lib/utils'

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to view your profile.</AlertDescription>
      </Alert>
    )
  }

  const userRole = session.user.role

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'TEACHER': return 'Create and manage assignments, track student progress, and provide feedback.'
      case 'STUDENT': return 'Complete assignments, track your learning progress, and achieve your language goals.'
      case 'PARENT': return 'Monitor your child\'s learning progress and stay updated on their achievements.'
      default: return 'Welcome to the JIS AI Portal!'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and view your activity
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                {session.user.username?.charAt(0).toUpperCase() || 
                 session.user.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{session.user.username || 'User'}</h2>
              <Badge className={getRoleColor(userRole || '')}>
                {getRoleDisplayName(userRole || '')}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {getRoleDescription(userRole || '')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">{userRole}</p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {userRole === 'TEACHER' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Classes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Active classes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Assignments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Created assignments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Total students
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === 'STUDENT' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Available assignments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Assignments completed
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

        {userRole === 'PARENT' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Children</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Connected children
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Average progress
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reports</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Available reports
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for your role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {userRole === 'TEACHER' && (
            <div className="flex space-x-2">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Classes
              </Button>
            </div>
          )}
          
          {userRole === 'STUDENT' && (
            <div className="flex space-x-2">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                View Assignments
              </Button>
              <Button variant="outline">
                <Award className="mr-2 h-4 w-4" />
                View Achievements
              </Button>
            </div>
          )}
          
          {userRole === 'PARENT' && (
            <div className="flex space-x-2">
              <Button>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Progress
              </Button>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 