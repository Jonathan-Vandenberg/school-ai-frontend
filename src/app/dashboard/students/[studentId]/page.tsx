'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  ArrowLeft,
  User,
  GraduationCap,
  BookOpen,
  Target,
  Award,
  Clock,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  School,
  Activity,
  BarChart3
} from 'lucide-react'

interface StudentStats {
  averageScore: number
  completionRate: number
  accuracyRate: number
  totalAssignments: number
  completedAssignments: number
  totalQuestions: number
  totalAnswers: number
  totalCorrectAnswers: number
  lastActivityDate: string | null
  lastUpdated: string | null
}

interface AssignmentProgress {
  id: string
  topic: string
  type: string
  teacher: { id: string; username: string }
  classes: Array<{ id: string; name: string }>
  createdAt: string
  totalQuestions: number
  completedQuestions: number
  correctAnswers: number
  completionRate: number
  accuracyRate: number
  isComplete: boolean
  status: 'Not Started' | 'In Progress' | 'Complete'
  lastActivity: number | null
}

interface StudentData {
  user: {
    id: string
    username: string
    email: string
    role: string
    joinedAt: string
  }
  statistics: StudentStats | null
  classes: Array<{ id: string; name: string; createdAt: string }>
  assignments: AssignmentProgress[]
  needsHelp: {
    reasons: string[]
    severity: string
    since: string
    daysNeedingHelp: number
    averageScore: number
    completionRate: number
    overdueAssignments: number
    teacherNotes?: string
    classes: Array<{ id: string; name: string }>
  } | null
}

export default function StudentDetailsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string
  
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && studentId) {
      loadStudentData()
    }
  }, [session, studentId])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${studentId}/stats`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStudentData(result.data)
        } else {
          setError(result.error || 'Failed to load student data')
        }
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to load student data')
      }
    } catch (err) {
      setError('Failed to load student data')
      console.error('Error loading student data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const getUserInitials = (username: string) => {
    return username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getStatusColor = (status: 'Not Started' | 'In Progress' | 'Complete') => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800'
      case 'Not Started': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to access student details.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading student details...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!studentData) {
    return (
      <div className="container mx-auto p-6">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert>
          <AlertDescription>No student data found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 text-blue-800 text-lg">
                {getUserInitials(studentData.user.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{studentData.user.username}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {studentData.user.email}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <GraduationCap className="mr-1 h-3 w-3" />
            {studentData.user.role}
          </Badge>
          {studentData.needsHelp && (
            <Badge className={getSeverityColor(studentData.needsHelp.severity)}>
              <AlertTriangle className="mr-1 h-3 w-3" />
              Needs Help ({studentData.needsHelp.severity})
            </Badge>
          )}
        </div>
      </div>

      {/* Help Status */}
      {studentData.needsHelp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Student Needs Help
            </CardTitle>
            <CardDescription>
              This student has been identified as needing assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reasons:</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {studentData.needsHelp.reasons.map((reason, index) => (
                    <Badge key={index} variant="outline" className="text-red-700 border-red-200">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Days Needing Help:</label>
                  <p className="text-2xl font-bold text-red-600">{studentData.needsHelp.daysNeedingHelp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Average Score:</label>
                  <p className="text-2xl font-bold">{Math.round(studentData.needsHelp.averageScore)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Overdue Assignments:</label>
                  <p className="text-2xl font-bold text-red-600">{studentData.needsHelp.overdueAssignments}</p>
                </div>
              </div>
              {studentData.needsHelp.teacherNotes && (
                <div>
                  <label className="text-sm font-medium">Teacher Notes:</label>
                  <p className="text-sm text-muted-foreground mt-1">{studentData.needsHelp.teacherNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Overview */}
      {studentData.statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentData.statistics.averageScore}%</div>
              <Progress value={studentData.statistics.averageScore} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentData.statistics.completionRate}%</div>
              <Progress value={studentData.statistics.completionRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studentData.statistics.completedAssignments}/{studentData.statistics.totalAssignments}
              </div>
              <p className="text-xs text-muted-foreground">Completed/Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assignment Progress ({studentData.assignments.length})
          </CardTitle>
          <CardDescription>
            Detailed breakdown of assignment completion and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentData.assignments.length === 0 ? (
            <p className="text-muted-foreground">No assignments found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentData.assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                                             <TableCell>
                         <div className="flex items-center gap-2">
                           <div className="font-medium">{assignment.topic}</div>
                           <Badge variant="outline" className="text-xs">
                             {assignment.type === 'CLASS' ? 'Class Assignment' : 'Individual Assignment'}
                           </Badge>
                         </div>
                       </TableCell>
                      <TableCell>{assignment.teacher.username}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assignment.classes.map((cls) => (
                            <Badge key={cls.id} variant="outline" className="text-xs">
                              {cls.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{assignment.completedQuestions}/{assignment.totalQuestions}</span>
                            <span>{assignment.completionRate}%</span>
                          </div>
                          <Progress value={assignment.completionRate} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{assignment.accuracyRate}%</div>
                          <div className="text-xs text-muted-foreground">
                            {assignment.correctAnswers}/{assignment.completedQuestions}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {new Date(assignment.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 