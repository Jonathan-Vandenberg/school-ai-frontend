'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  User,
  BookOpen,
  Target,
} from 'lucide-react'
import { ReadingAssignment } from '@/components/assignments/reading-assignment/reading-assignment-component'
import { PronunciationAssignment } from '@/components/assignments/pronunciation-assignment/pronunciation-assignment-component'

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
}

interface StudentProgress {
  questionId: string
  isComplete: boolean
  isCorrect: boolean
  submittedAt: string | null
  languageConfidenceResponse: any
  actualScore?: number
}

interface StudentData {
  id: string
  username: string
  email: string
  customRole: string
}

export default function StudentAssignmentViewPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string
  const studentId = params.studentId as string
  
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && assignmentId && studentId) {
      loadData()
    }
  }, [session, assignmentId, studentId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load assignment data
      const assignmentResponse = await fetch(`/api/assignments/${assignmentId}`)
      if (!assignmentResponse.ok) {
        throw new Error('Failed to load assignment')
      }
      const assignmentData = await assignmentResponse.json()
      setAssignment(assignmentData.data)

      // Load student data
      const studentResponse = await fetch(`/api/users/${studentId}`)
      if (!studentResponse.ok) {
        throw new Error('Failed to load student data')
      }
      const studentData = await studentResponse.json()
      setStudentData(studentData.data)

      // Load student's progress for this assignment
      const progressResponse = await fetch(`/api/assignments/${assignmentId}/student/${studentId}/progress`)
      if (!progressResponse.ok) {
        throw new Error('Failed to load student progress')
      }
      const progressData = await progressResponse.json()
      setStudentProgress(progressData.data || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleProgressUpdate = async (questionId: string, isCorrect: boolean, result: any, type: 'READING' | 'VIDEO' | 'PRONUNCIATION' | 'Q_AND_A' | 'IELTS') => {
    // This is a read-only view, so we don't actually update progress
    // But we keep the interface consistent with the ReadingAssignment component
    console.log('Progress update in read-only view:', { questionId, isCorrect, result, type })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading student assignment view...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!assignment || !studentData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Assignment or student data not found.</AlertDescription>
      </Alert>
    )
  }

  // Calculate student's overall progress
  const completedQuestions = studentProgress.filter(p => p.isComplete).length
  const totalQuestions = assignment.questions.length
  const overallProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0
  
  // Calculate accuracy from actual scores
  const completedWithScores = studentProgress.filter(p => p.isComplete && p.actualScore !== null && p.actualScore !== undefined)
  const accuracy = completedWithScores.length > 0 
    ? completedWithScores.reduce((sum, p) => sum + (p.actualScore || 0), 0) / completedWithScores.length 
    : 0
  
  // Count correct answers (80%+ threshold)
  const correctAnswers = studentProgress.filter(p => p.isComplete && (p.actualScore || 0) >= 80).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{assignment.topic || 'Untitled Assignment'}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              {studentData.username} - {studentData.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <BookOpen className="mr-1 h-3 w-3" />
            {assignment.evaluationSettings?.type || 'Unknown'}
          </Badge>
          <Badge variant="outline">
            {assignment.language?.language || 'Unknown Language'}
          </Badge>
        </div>
      </div>

      {/* Student Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Student Progress Summary
          </CardTitle>
          <CardDescription>
            {studentData.username}'s performance on this assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedQuestions}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(accuracy)}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(overallProgress)}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Component - Read-only view */}
      {assignment.evaluationSettings?.type === 'READING' && (
        <ReadingAssignment
          assignment={assignment}
          studentProgress={studentProgress}
          onProgressUpdate={handleProgressUpdate}
          isViewingOnly={true}
        />
      )}

      {assignment.evaluationSettings?.type === 'PRONUNCIATION' && (
        <PronunciationAssignment
          assignment={assignment}
          studentProgress={studentProgress}
          onProgressUpdate={handleProgressUpdate}
          isViewingOnly={true}
        />
      )}

      {/* For other assignment types, show a placeholder */}
      {assignment.evaluationSettings?.type !== 'READING' && assignment.evaluationSettings?.type !== 'PRONUNCIATION' && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment View</CardTitle>
            <CardDescription>
              Student-specific view for {assignment.evaluationSettings?.type || 'Unknown'} assignments is not yet implemented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Assignment Type: {assignment.evaluationSettings?.type || 'Unknown'}</h3>
              <p className="text-muted-foreground">
                This assignment type doesn't have a student-specific view yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
