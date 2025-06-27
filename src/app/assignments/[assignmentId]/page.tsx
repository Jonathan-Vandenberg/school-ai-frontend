'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
  AlertCircle
} from 'lucide-react'

interface Assignment {
  id: string
  topic: string | null
  type: string
  color: string | null
  isActive: boolean | null
  scheduledPublishAt: string | null
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

export default function AssignmentDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string
  
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && assignmentId) {
      loadAssignment()
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

  const handleGoBack = () => {
    router.back()
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {getTypeIcon(assignment.type)}
              {assignment.topic}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={getStatusColor(status)}>
                {getStatusIcon(status)}
                <span className="ml-1">{status}</span>
              </Badge>
              <span className="text-muted-foreground">
                Created {new Date(assignment.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Language</label>
                  <p className="mt-1">{assignment.language?.language || 'Not specified'}</p>
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
                          {question.textQuestion && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Question</label>
                              <p className="text-sm">{question.textQuestion}</p>
                            </div>
                          )}
                            {question.textAnswer && (
                             <div>
                               <label className="text-sm font-medium text-muted-foreground">Expected Answer</label>
                               <p className="text-sm text-green-700 bg-green-50 p-2 rounded">{question.textAnswer}</p>
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submissions</span>
                <span className="font-medium">{assignment._count?.progresses || 0}</span>
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
                  <label className="text-sm font-medium text-muted-foreground">Classes</label>
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
                  <label className="text-sm font-medium text-muted-foreground">Individual Students</label>
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
    </div>
  )
} 