'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useStatsRefresh } from '@/hooks/use-stats-refresh'
import { VideoAssignmentPlayer } from '@/components/assignments/video-assignment/video-assignment-player'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  BookOpen,
  Play,
  Users,
  Calendar,
  Clock,
  User,
  School,
  Target,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  CheckCheck,
  ChevronLeft,
  Edit
} from 'lucide-react'
import { ReadingAssignment } from '@/components/assignments/reading-assignment/reading-assignment-component'
import { PronunciationAssignment } from '@/components/assignments/pronunciation-assignment/pronunciation-assignment-component'
import { IELTSAssignment } from '@/components/assignments/ielts-assignment/ielts-assignment-component'

interface Assignment {
  id: string
  topic: string | null
  type: string
  color: string | null
  isActive: boolean | null
  scheduledPublishAt: string | null
  dueDate: string | null
  videoUrl: string | null
  videoTranscript: string | null
  languageAssessmentType: string | null
  isIELTS: boolean | null
  context: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  teacher: {
    id: string
    username: string
  } | null
  language: {
    id: string
    language: string
    code: string
  } | null
  evaluationSettings: {
    id: string
    type: string
    customPrompt: string | null
    rules: any
    acceptableResponses: any
    feedbackSettings: any
  } | null
  questions: Array<{
    id: string
    textQuestion: string | null
    textAnswer: string | null
    image: string | null
    videoUrl: string | null
  }>
  classes: Array<{
    class: {
      id: string
      name: string
    }
  }>
  students: Array<{
    user: {
      id: string
      username: string
    }
  }>
  _count?: {
    progresses: number
    questions: number
  }
}

interface StudentProgress {
  student: {
    id: string
    username: string
    email: string
    source: 'class' | 'individual'
    className?: string
  }
  stats: {
    totalQuestions: number
    completedQuestions: number
    correctAnswers: number
    completionRate: number
    accuracyRate: number
    isComplete: boolean
  }
  questionProgress: Array<{
    questionId: string
    questionText: string | null
    isComplete: boolean
    isCorrect: boolean
    submittedAt: string | null
  }>
}

interface ProgressData {
  assignment: {
    id: string
    topic: string | null
    type: string
    totalQuestions: number
    teacher: {
      id: string
      username: string
    } | null
  }
  overallStats: {
    totalStudents: number
    studentsStarted: number
    studentsCompleted: number
    completionRate: number
    averageAccuracy: number
  }
  studentProgress: StudentProgress[]
  questions: Array<{
    id: string
    textQuestion: string | null
    textAnswer: string | null
  }>
}

export default function AssignmentDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string
  const { triggerRefresh } = useStatsRefresh()
  
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [studentProgress, setStudentProgress] = useState<Array<{questionId: string, isComplete: boolean, isCorrect: boolean, submittedAt: string | null, languageConfidenceResponse: any}>>([])
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && assignmentId) {
      loadAssignment()
      if (session.user.role === 'TEACHER' || session.user.role === 'ADMIN') {
        loadProgressData()
      } else if (session.user.role === 'STUDENT') {
        loadStudentProgress()
      }
    }
  }, [session, assignmentId])

  const loadAssignment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}`)
      if (response.ok) {
        const data = await response.json()
        setAssignment(data.data)
      } else {
        setError('Failed to load assignment')
      }
    } catch (err) {
      setError('Failed to load assignment')
      console.error('Error loading assignment:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProgressData = async () => {
    try {
      setProgressLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}/progress`)
      if (response.ok) {
        const data = await response.json()
        setProgressData(data.data)
      } else {
        console.error('Failed to load progress data')
      }
    } catch (err) {
      console.error('Error loading progress data:', err)
    } finally {
      setProgressLoading(false)
    }
  }

  const loadStudentProgress = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/progress`)
      if (response.ok) {
        const data = await response.json()
        // For students, the API now returns only their own progress
        if (data.data && data.data.studentProgress && data.data.studentProgress.length > 0) {
          const myProgress = data.data.studentProgress[0] // First (and only) student is themselves
          setStudentProgress(myProgress.questionProgress || [])
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to load student progress:', errorData.error)
      }
    } catch (err) {
      console.error('Error loading student progress:', err)
    }
  }

  const handleProgressUpdate = async (questionId: string, isCorrect: boolean, result: any, type: 'VIDEO' | 'READING' | 'PRONUNCIATION' | 'Q_AND_A' | 'IELTS') => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, isCorrect, result, type })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await loadStudentProgress()
          triggerRefresh()
        }
      } else {
        console.error('Failed to submit progress')
      }
    } catch (err) {
      console.error('Error submitting progress:', err)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleStudentClick = (studentId: string) => {
    router.push(`/assignments/${assignmentId}/student/${studentId}`)
  }

  const getStatus = (assignment: Assignment) => {
    if (assignment.isActive) {
      return 'PUBLISHED'
    } else if (assignment.scheduledPublishAt) {
      return 'SCHEDULED'
    } else {
      return 'DRAFT'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200'
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <CheckCircle className="h-4 w-4" />
      case 'SCHEDULED': return <Clock className="h-4 w-4" />
      case 'DRAFT': return <AlertCircle className="h-4 w-4" />
      case 'ARCHIVED': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Play className="h-5 w-5 text-blue-600" />
      case 'reading': return <BookOpen className="h-5 w-5 text-green-600" />
      case 'pronunciation': return <Users className="h-5 w-5 text-purple-600" />
      default: return <BookOpen className="h-5 w-5 text-muted-foreground" />
    }
  }

  const convertTimeToSeconds = (timeStr: string): number => {
    // Handle formats like "2s", "1m30s", "1h2m30s"
    let totalSeconds = 0
    
    // Extract hours, minutes, seconds
    const hours = timeStr.match(/(\d+)h/)
    const minutes = timeStr.match(/(\d+)m/)
    const seconds = timeStr.match(/(\d+)s/)
    
    if (hours) totalSeconds += parseInt(hours[1]) * 3600
    if (minutes) totalSeconds += parseInt(minutes[1]) * 60
    if (seconds) totalSeconds += parseInt(seconds[1])
    
    // If no letter format, assume it's just seconds
    if (!hours && !minutes && !seconds && timeStr.match(/^\d+$/)) {
      totalSeconds = parseInt(timeStr)
    }
    
    return totalSeconds
  }

  const getYouTubeEmbedUrl = (url: string) => {
    // Handle different YouTube URL formats
    let videoId = ''
    let startTime = ''
    
    if (url.includes('youtube.com/watch?v=')) {
      const urlParams = new URLSearchParams(url.split('?')[1])
      videoId = urlParams.get('v') || ''
      const t = urlParams.get('t')
      if (t) {
        const seconds = convertTimeToSeconds(t)
        startTime = seconds > 0 ? `?start=${seconds}` : ''
      }
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/')[1].split('?')
      videoId = parts[0]
      if (parts[1]) {
        const urlParams = new URLSearchParams(parts[1])
        const t = urlParams.get('t')
        if (t) {
          const seconds = convertTimeToSeconds(t)
          startTime = seconds > 0 ? `?start=${seconds}` : ''
        }
      }
    }
    
    return `https://www.youtube.com/embed/${videoId}${startTime}`
  }

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to access this assignment.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading assignment...</div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Assignment not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const status = getStatus(assignment)
  const isTeacherOrAdmin = session.user.role === 'TEACHER' || session.user.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div onClick={handleGoBack} className="cursor-pointer m-4 p-2 rounded-full border border-gray-300">
            <ChevronLeft className="h-8 w-8 text-gray-500" />
          </div>
          <div>
            <h1 className="md:text-3xl text-2xl font-bold flex items-center gap-3">
              {/* {getTypeIcon(assignment.type)} */}
              {assignment.topic}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {/* <Badge className={getStatusColor(status)}>
                {getStatusIcon(status)}
                <span className="ml-1">{status}</span>
              </Badge>
              <span className="text-muted-foreground">
                {new Date(assignment.createdAt).toLocaleDateString()}
              </span> */}
            </div>
          </div>
        </div>
        
        {/* Edit button for teachers and admins */}
        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => router.push(`/assignments/${assignmentId}/edit`)}
              variant="outline"
              size="sm"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Assignment
            </Button>
          </div>
        )}
      </div>

      {/* Tab Navigation for Teachers/Admins */}
      {isTeacherOrAdmin ? (
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Assignment Details</TabsTrigger>
            <TabsTrigger value="progress">Student Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            {/* Assignment Details Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Assignment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeIcon(assignment.type)}
                          <span className="capitalize">{assignment.type.toLowerCase()}</span>
                        </div>
                      </div>
                      {assignment.scheduledPublishAt && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Scheduled For</label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(assignment.scheduledPublishAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Teacher</label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{assignment.teacher?.username || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    {assignment.context && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Context</label>
                        <p className="mt-1 text-sm">{assignment.context}</p>
                      </div>
                    )}

                    {assignment.videoUrl && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Assignment Video</label>
                        <div className="mt-2 aspect-video">
                          <iframe
                            width="100%"
                            height="100%"
                            src={getYouTubeEmbedUrl(assignment.videoUrl)}
                            title="Assignment Video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Questions */}
                {assignment.questions && assignment.questions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Questions ({assignment.questions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {assignment.questions.map((question, index) => (
                          <div key={question.id} className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium">{index + 1}</span>
                              </div>
                              <div className="flex-1 space-y-2">
                                {/* For READING assignments, show text answer (the reading passage) prominently without title */}
                                {assignment.evaluationSettings?.type === 'READING' ? (
                                  <>
                                    {question.textAnswer && (
                                      <p className="text-lg leading-relaxed">{question.textAnswer}</p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* For other assignment types, show question and answer separately */}
                                    {question.textQuestion && (
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Question</label>
                                        <p className="text-sm">{question.textQuestion}</p>
                                      </div>
                                    )}
                                    {question.textAnswer && (
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Expected Answer</label>
                                        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800">{question.textAnswer}</p>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Assignment Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Questions</span>
                      <span className="font-medium">{assignment._count?.questions || 0}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Updated</span>
                      <span className="text-sm">{new Date(assignment.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {assignment.dueDate && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Due Date</span>
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {new Date(assignment.dueDate).toLocaleDateString()} at {new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned To */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned To</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.classes && assignment.classes.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {assignment.classes.length === 1 ? 'Class' : 'Classes'}
                        </label>
                        <div className="mt-2 space-y-2">
                          {assignment.classes.map((classAssignment) => (
                            <div key={classAssignment.class.id} className="flex items-center gap-2">
                              <School className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{classAssignment.class.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {assignment.students && assignment.students.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Individual {assignment.students.length === 1 ? 'Student' : 'Students'}
                        </label>
                        <div className="mt-2 space-y-2">
                          {assignment.students.map((studentAssignment) => (
                            <div key={studentAssignment.user.id} className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{studentAssignment.user.username}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!assignment.classes || assignment.classes.length === 0) && 
                     (!assignment.students || assignment.students.length === 0) && (
                      <p className="text-sm text-muted-foreground">Not assigned to anyone yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-6">
            {/* Student Progress Content */}
            {progressLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-lg">Loading progress data...</div>
              </div>
            ) : progressData ? (
              <div className="space-y-6">
                {/* Overall Statistics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{progressData.overallStats.totalStudents}</div>
                      <p className="text-xs text-muted-foreground">
                        Assigned to this task
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Students Started</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{progressData.overallStats.studentsStarted}</div>
                      <p className="text-xs text-muted-foreground">
                        {progressData.overallStats.studentsStarted === 0 
                          ? "No-one has begun the assignment"
                          : progressData.overallStats.studentsStarted === 1
                          ? "Has begun the assignment"
                          : "Have begun the assignment"
                        }
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getProgressColor(progressData.overallStats.completionRate)}`}>
                        {progressData.overallStats.completionRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {progressData.overallStats.studentsCompleted} of {progressData.overallStats.totalStudents} completed
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
                      <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getProgressColor(progressData.overallStats.averageAccuracy)}`}>
                        {progressData.overallStats.averageAccuracy}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across all submissions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Student Progress Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Student Progress Details</CardTitle>
                    <CardDescription>
                      Individual progress for each student assigned to this assignment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Completion</TableHead>
                          <TableHead>Accuracy</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {progressData.studentProgress.map((studentProgress) => (
                          <TableRow 
                            key={studentProgress.student.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleStudentClick(studentProgress.student.id)}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{studentProgress.student.username}</div>
                                <div className="text-sm text-muted-foreground">{studentProgress.student.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {studentProgress.student.source === 'class' ? (
                                  <>
                                    <School className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{studentProgress.student.className}</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Individual</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="w-24">
                                <Progress 
                                  value={studentProgress.stats.completionRate} 
                                  className="h-2"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getProgressColor(studentProgress.stats.completionRate)}`}>
                                {studentProgress.stats.completedQuestions}/{studentProgress.stats.totalQuestions}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getProgressColor(studentProgress.stats.accuracyRate)}`}>
                                {studentProgress.stats.accuracyRate}%
                              </span>
                            </TableCell>
                            <TableCell>
                              {studentProgress.stats.isComplete ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : studentProgress.stats.completedQuestions > 0 ? (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Not Started
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No progress data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Student view */
        assignment.evaluationSettings?.type === 'VIDEO' ? (
          /* Video Assignment Player */
          <VideoAssignmentPlayer
            assignment={{
              id: assignment.id,
              topic: assignment.topic,
              videoUrl: assignment.videoUrl,
              videoTranscript: assignment.videoTranscript,
              language: assignment.language,
              evaluationSettings: assignment.evaluationSettings,
              questions: assignment.questions
            }}
            studentProgress={studentProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : assignment.evaluationSettings?.type === 'READING' ? (
          /* Reading Assignment Player */
          <ReadingAssignment
            assignment={{
              id: assignment.id,
              topic: assignment.topic,
              evaluationSettings: assignment.evaluationSettings,
              questions: assignment.questions
            }}
            studentProgress={studentProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        ): assignment.evaluationSettings?.type === 'PRONUNCIATION' ? (
          /* Pronunciation Assignment Player */
          <PronunciationAssignment
            assignment={{
              id: assignment.id,
              topic: assignment.topic,
              evaluationSettings: assignment.evaluationSettings,
              questions: assignment.questions
            }}
            studentProgress={studentProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : assignment.evaluationSettings?.type === 'Q_AND_A' ? (
          /* IELTS Assignment Player */
          <IELTSAssignment
            assignment={{
              id: assignment.id,
              topic: assignment.topic,
              evaluationSettings: assignment.evaluationSettings,
              questions: assignment.questions
            }}
            studentProgress={studentProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : (
          /* Regular assignment view */
          <div className="grid gap-6 lg:grid-cols-3">
          {/* Assignment details for students */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeIcon(assignment.type)}
                      <span className="capitalize">{assignment.type.toLowerCase()}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Language</label>
                    <p className="mt-1">{assignment.language?.language || 'Not specified'}</p>
                  </div>
                </div>

                {assignment.context && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Context</label>
                    <p className="mt-1 text-sm">{assignment.context}</p>
                  </div>
                )}

                {assignment.videoUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assignment Video</label>
                    <div className="mt-2 aspect-video">
                      <iframe
                        width="100%"
                        height="100%"
                        src={getYouTubeEmbedUrl(assignment.videoUrl)}
                        title="Assignment Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions for students */}
            {assignment.questions && assignment.questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Questions ({assignment.questions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignment.questions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div className="flex-1 space-y-2">
                            {question.textQuestion && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Question</label>
                                <p className="text-sm">{question.textQuestion}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar for students */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions</span>
                  <span className="font-medium">{assignment._count?.questions || 0}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )
      )}
    </div>
  )
} 