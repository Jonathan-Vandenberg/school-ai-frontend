'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, Trash2 } from 'lucide-react'
import { ReadingAssignmentForm } from '@/components/assignments/reading-assignment/reading-assignment-form'
import { VideoAssignmentForm } from '@/components/assignments/video-assignment/video-assignment-form'
import { PronunciationAssignmentForm } from '@/components/assignments/pronunciation-assignment/pronunciation-assignment-form'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete assignment')
      }
      
      // Redirect to assignments list after successful deletion
      router.push('/assignments')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment')
      console.error('Error deleting assignment:', err)
      setIsDeleting(false)
    }
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
        <div className="flex justify-end pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the assignment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
              </div>
    )
  }

  if (assignmentType === 'PRONUNCIATION') {
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
        <PronunciationAssignmentForm 
          data={{ classes }} 
          assignmentId={assignmentId}
          initialAssignment={assignment}
        />
        <div className="flex justify-end pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the assignment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
        <div className="flex justify-end pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Assignment'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the assignment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
