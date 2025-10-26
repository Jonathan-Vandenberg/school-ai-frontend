'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft,
  BookOpen,
  Play,
  Users,
  Save,
  Loader2,
  Plus,
  Trash2,
  Target,
  ChevronLeft
} from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [topic, setTopic] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [context, setContext] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [scheduledPublishAt, setScheduledPublishAt] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [assignmentType, setAssignmentType] = useState<'CLASS' | 'INDIVIDUAL'>('CLASS')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  
  // Available classes and users
  const [availableClasses, setAvailableClasses] = useState<any[]>([])
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  useEffect(() => {
    if (session?.user && assignmentId) {
      loadAssignment()
      loadAvailableData()
    }
  }, [session, assignmentId])

  const loadAssignment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}`)
      if (response.ok) {
        const data = await response.json()
        const assignmentData = data.data
        setAssignment(assignmentData)
        
        // Populate form fields
        setTopic(assignmentData.topic || '')
        setVideoUrl(assignmentData.videoUrl || '')
        setContext(assignmentData.context || '')
        setIsActive(assignmentData.isActive || false)
        setScheduledPublishAt(assignmentData.scheduledPublishAt ? 
          new Date(assignmentData.scheduledPublishAt).toISOString().slice(0, 16) : '')
        setDueDate(assignmentData.dueDate ? 
          new Date(assignmentData.dueDate).toISOString().slice(0, 16) : '')
        setQuestions(assignmentData.questions.map((q: any) => ({
          id: q.id,
          textQuestion: q.textQuestion || '',
          textAnswer: q.textAnswer || ''
        })))
        
        // Populate assignment type and selections
        setAssignmentType(assignmentData.type || 'CLASS')
        setSelectedClassIds(assignmentData.classes?.map((c: any) => c.class.id) || [])
        setSelectedStudentIds(assignmentData.students?.map((s: any) => s.user.id) || [])
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

  const loadAvailableData = async () => {
    try {
      setLoadingClasses(true)
      
      // Load available classes
      const classesResponse = await fetch('/api/classes')
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        setAvailableClasses(classesData.data || [])
      }
      
      // Load available students (get students from classes API)
      const usersResponse = await fetch('/api/classes?users=available')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setAvailableStudents(usersData.data?.students || [])
      }
    } catch (err) {
      console.error('Error loading available data:', err)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleGoBack = () => {
    router.push(`/assignments/${assignmentId}`)
  }

  const addQuestion = () => {
    setQuestions([...questions, { textQuestion: '', textAnswer: '' }])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: 'textQuestion' | 'textAnswer', value: string) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const handleSave = async () => {
    if (!topic.trim()) {
      setError('Assignment topic is required')
      return
    }

    if (questions.length === 0) {
      setError('At least one question is required')
      return
    }

    const invalidQuestions = questions.some(q => !q.textQuestion.trim() || !q.textAnswer.trim())
    if (invalidQuestions) {
      setError('All questions must have both question text and answer text')
      return
    }

    // Validate assignment assignments
    if (assignmentType === 'CLASS' && selectedClassIds.length === 0) {
      setError('Please select at least one class for class assignments')
      return
    }

    if (assignmentType === 'INDIVIDUAL' && selectedStudentIds.length === 0) {
      setError('Please select at least one student for individual assignments')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const updateData = {
        topic: topic.trim(),
        videoUrl: videoUrl.trim() || null,
        context: context.trim() || null,
        isActive,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        type: assignmentType,
        classIds: assignmentType === 'CLASS' ? selectedClassIds : [],
        studentIds: assignmentType === 'INDIVIDUAL' ? selectedStudentIds : [],
        questions: questions.map(q => ({
          id: q.id,
          textQuestion: q.textQuestion.trim(),
          textAnswer: q.textAnswer.trim()
        }))
      }

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        router.push(`/assignments/${assignmentId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update assignment')
      }
    } catch (err) {
      setError('Failed to update assignment')
      console.error('Error updating assignment:', err)
    } finally {
      setSaving(false)
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

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to edit this assignment.</AlertDescription>
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

  if (!assignment) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
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
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment
        </Button>
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to edit this assignment.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
        <div onClick={handleGoBack} className="cursor-pointer m-4 p-2 rounded-full border border-gray-300">
            <ChevronLeft className="h-8 w-8 text-gray-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {getTypeIcon(assignment.type)}
              Edit Assignment
            </h1>
            <p className="text-muted-foreground mt-2">
              Modify assignment details and questions
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>
                Update the basic information about this assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">Assignment Topic *</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter assignment topic..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="context">Context/Description</Label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Additional context or instructions for this assignment..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Publishing Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
              <CardDescription>
                Control when and how this assignment is published
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="isActive">Published</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this assignment visible to students
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <div>
                <Label htmlFor="scheduledPublishAt">Scheduled Publish Date</Label>
                <Input
                  id="scheduledPublishAt"
                  type="datetime-local"
                  value={scheduledPublishAt}
                  onChange={(e) => setScheduledPublishAt(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty to publish immediately when active
                </p>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optional: Set when students should complete this assignment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Settings</CardTitle>
              <CardDescription>
                Change assignment type and reassign to classes or students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assignmentType">Assignment Type</Label>
                <Select value={assignmentType} onValueChange={(value: 'CLASS' | 'INDIVIDUAL') => setAssignmentType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">Class Assignment</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual Assignment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose whether this assignment is for entire classes or individual students
                </p>
              </div>

              {assignmentType === 'CLASS' && (
                <div>
                  <Label htmlFor="classes">Assign to Classes</Label>
                  <div className="mt-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                    {loadingClasses ? (
                      <p className="text-sm text-muted-foreground">Loading classes...</p>
                    ) : availableClasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No classes available</p>
                    ) : (
                      <div className="space-y-2">
                        {availableClasses.map(cls => (
                          <div key={cls.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`class-${cls.id}`}
                              checked={selectedClassIds.includes(cls.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedClassIds([...selectedClassIds, cls.id])
                                } else {
                                  setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id))
                                }
                              }}
                            />
                            <Label htmlFor={`class-${cls.id}`} className="text-sm font-normal">
                              {cls.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Students in selected classes will receive this assignment
                  </p>
                </div>
              )}

              {assignmentType === 'INDIVIDUAL' && (
                <div>
                  <Label htmlFor="students">Assign to Students</Label>
                  <div className="mt-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                    {loadingClasses ? (
                      <p className="text-sm text-muted-foreground">Loading students...</p>
                    ) : availableStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students available</p>
                    ) : (
                      <div className="space-y-2">
                        {availableStudents.map(student => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudentIds.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStudentIds([...selectedStudentIds, student.id])
                                } else {
                                  setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id))
                                }
                              }}
                            />
                            <Label htmlFor={`student-${student.id}`} className="text-sm font-normal">
                              {student.username}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only selected students will receive this assignment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Questions ({questions.length})
              </CardTitle>
              <CardDescription>
                Add or modify questions for this assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`question-${index}`}>Question *</Label>
                        <Textarea
                          id={`question-${index}`}
                          value={question.textQuestion}
                          onChange={(e) => updateQuestion(index, 'textQuestion', e.target.value)}
                          placeholder="Enter the question..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`answer-${index}`}>Expected Answer *</Label>
                        <Textarea
                          id={`answer-${index}`}
                          value={question.textAnswer}
                          onChange={(e) => updateQuestion(index, 'textAnswer', e.target.value)}
                          placeholder="Enter the expected answer..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addQuestion}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline">{assignmentType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Language</span>
                <span className="text-sm">{assignment.language?.language || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teacher</span>
                <span className="text-sm">{assignment.teacher?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submissions</span>
                <span className="text-sm">{assignment._count?.progresses || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned To */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Currently Assigned To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignmentType === 'CLASS' && selectedClassIds.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Classes ({selectedClassIds.length})</Label>
                  <div className="mt-2 space-y-1">
                    {selectedClassIds.map((classId) => {
                      const classData = availableClasses.find(c => c.id === classId)
                      return classData ? (
                        <Badge key={classId} variant="secondary">
                          {classData.name}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              
              {assignmentType === 'INDIVIDUAL' && selectedStudentIds.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Students ({selectedStudentIds.length})</Label>
                  <div className="mt-2 space-y-1">
                    {selectedStudentIds.map((studentId) => {
                      const studentData = availableStudents.find(s => s.id === studentId)
                      return studentData ? (
                        <Badge key={studentId} variant="secondary">
                          {studentData.username}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {((assignmentType === 'CLASS' && selectedClassIds.length === 0) || 
                (assignmentType === 'INDIVIDUAL' && selectedStudentIds.length === 0)) && (
                <p className="text-sm text-muted-foreground">No assignments selected</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 