'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft } from 'lucide-react'
import { ReadingAssignmentForm } from '@/components/assignments/reading-assignment/reading-assignment-form'
import { VideoAssignmentForm } from '@/components/assignments/video-assignment/video-assignment-form'

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

interface Question {
  id?: string
  textQuestion: string
  textAnswer: string
}

export default function EditAssignmentPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string
  
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<any[]>([])

  useEffect(() => {
    if (session?.user && assignmentId) {
      loadAssignment()
      loadClasses()
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

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.data || [])
      }
    } catch (err) {
      console.error('Error loading classes:', err)
    }
  }

  const handleGoBack = () => {
    router.push(`/assignments/${assignmentId}`)
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to edit this assignment.</AlertDescription>
      </Alert>
    )
  }

  if (loading || classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Assignment not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Check if user can edit this assignment
  const canEdit = session.user.role === 'ADMIN' || 
    (session.user.role === 'TEACHER' && assignment.teacher?.id === session.user.id)

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to edit this assignment.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const assignmentType = assignment.evaluationSettings?.type

  // Render the appropriate form component based on assignment type
  if (assignmentType === 'READING') {
  return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
        <ReadingAssignmentForm 
          data={{ classes }} 
          assignmentId={assignmentId}
          initialAssignment={assignment}
                />
              </div>
    )
  }

  if (assignmentType === 'VIDEO') {
    return (
      <div className="space-y-4">
                    <Button
                      variant="ghost"
          onClick={handleGoBack}
          className="mb-4"
                    >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Assignment
                    </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <VideoAssignmentForm 
          data={{ classes }} 
          assignmentId={assignmentId}
          initialAssignment={assignment}
        />
      </div>
    )
  }

  // Fallback for other assignment types - show error
  return (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        onClick={handleGoBack}
        className="mb-4"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Assignment
      </Button>
      <Alert variant="destructive">
        <AlertDescription>
          Editing for {assignmentType || 'this'} assignment type is not yet supported. Please use the API directly.
        </AlertDescription>
      </Alert>
    </div>
  )
} 