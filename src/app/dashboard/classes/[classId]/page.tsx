'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StudentHelpCard } from '@/components/students/student-help-card'
import { 
  ArrowLeft,
  School,
  Users,
  BookOpen,
  Calendar,
  Mail,
  GraduationCap,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Target,
  Award,
  AlertCircle,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  customRole: string
  needsHelp?: boolean
  helpInfo?: {
    reasons: string[]
    needsHelpSince: string
    daysNeedingHelp: number
    severity: string
    overdueAssignments: number
    averageScore: number
    completionRate: number
    teacherNotes?: string
  }
}

interface ClassDetails {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  teachers: User[]
  students: User[]
  _count: {
    users: number
    assignments: number
    teachers: number
    students: number
  }
}

interface ClassStats {
  totalStudents: number
  totalAssignments: number
  averageCompletion: number
  averageScore: number
  totalQuestions: number
  totalAnswers: number
  totalCorrectAnswers: number
  accuracyRate: number
  activeStudents: number
  studentsNeedingHelp: number
  lastActivityDate: string | null
  lastUpdated: string
}

export default function ClassProfilePage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const classId = params.classId as string
  
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null)
  const [classStats, setClassStats] = useState<ClassStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && classId) {
      loadClassDetails()
      loadClassStats()
    }
  }, [session, classId])

  const loadClassDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        setClassDetails(data.data)
      } else {
        setError('Failed to load class details')
      }
    } catch (err) {
      setError('Failed to load class details')
      console.error('Error loading class details:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClassStats = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/stats`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClassStats(data.data.stats)
        }
      }
    } catch (err) {
      console.error('Error loading class stats:', err)
    }
  }

  const handleGoBack = () => {
    router.push('/dashboard/classes')
  }

  const handleViewAssignments = () => {
    router.push(`/dashboard/classes/${classId}/assignments`)
  }

  const getUserInitials = (username: string) => {
    return username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TEACHER': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'STUDENT': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getHelpSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MODERATE': return 'text-yellow-600'
      case 'LOW': return 'text-blue-600'
      case 'RECENT': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const formatHelpDuration = (days: number) => {
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    if (days < 7) return `${days} days`
    const weeks = Math.floor(days / 7)
    if (weeks === 1) return '1 week'
    if (weeks < 4) return `${weeks} weeks`
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }

  const formatReasons = (reasons: string[]) => {
    if (!Array.isArray(reasons) || reasons.length === 0) return 'General support needed'
    return (
      <ul className="list-disc list-inside space-y-1">
        {reasons.map((reason, index) => (
          <li key={index} className="text-sm">{reason}</li>
        ))}
      </ul>
    )
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to access class details.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading class details...</div>
      </div>
    )
  }

  if (error || !classDetails) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Class not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <School className="h-8 w-8" />
              {classDetails.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Class ID: {classDetails.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleViewAssignments}>
            <BookOpen className="mr-2 h-4 w-4" />
            View Assignments
          </Button>
          {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Class
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards with Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {classDetails._count.teachers}
            </div>
            <p className="text-xs text-muted-foreground">
              Active teachers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {classDetails._count.students}
            </div>
            <p className="text-xs text-muted-foreground">
              {classStats ? `${classStats.activeStudents} active` : 'Enrolled students'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {classDetails._count.assignments}
            </div>
            <p className="text-xs text-muted-foreground">
              {classStats ? `${classStats.totalQuestions} questions` : 'Available assignments'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {classStats ? `${classStats.averageCompletion.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Class Average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {classStats ? `${classStats.averageScore.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Class Average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Help</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {classStats ? classStats.studentsNeedingHelp : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {classStats && classStats.totalStudents > 0 
                ? `${((classStats.studentsNeedingHelp / classStats.totalStudents) * 100).toFixed(1)}% of class`
                : 'Students requiring support'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-600" />
            Teachers ({classDetails.teachers.length})
          </CardTitle>
          <CardDescription>
            Teachers assigned to this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classDetails.teachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teachers assigned to this class</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classDetails.teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar>
                    <AvatarFallback className="bg-amber-100 text-amber-800">
                      {getUserInitials(teacher.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{teacher.username}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                  </div>
                  <Badge className={getRoleColor(teacher.customRole)}>
                    {teacher.customRole}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Students ({classDetails.students.length})
            {classDetails.students.filter(s => s.needsHelp).length > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                {classDetails.students.filter(s => s.needsHelp).length} need help
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Students enrolled in this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classDetails.students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students enrolled in this class</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classDetails.students
                .filter(student => student.needsHelp)
                .map((student) => (
                  <StudentHelpCard 
                    key={student.id} 
                    student={student} 
                    onClick={() => router.push(`/dashboard/students/${student.id}`)}
                  />
                ))}
              {classDetails.students
                .filter(student => !student.needsHelp)
                .map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center gap-3 p-4 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => router.push(`/dashboard/students/${student.id}`)}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-800">
                        {getUserInitials(student.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{student.username}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    </div>
                    <Badge className={getRoleColor(student.customRole)}>
                      {student.customRole}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleViewAssignments}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Assignments
            </Button>
            {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
              <>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Class
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
} 