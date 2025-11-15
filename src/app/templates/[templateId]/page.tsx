'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Copy, User, Globe, Target, FileText, Loader2, Eye, Edit, Trash2, PlusCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { VideoAssignmentPreview } from '@/components/assignments/video-assignment/video-assignment-preview'
import { ReadingAssignmentPreview } from '@/components/assignments/reading-assignment/reading-assignment-preview'
import { LevelSelector } from '@/components/templates/level-selector'

const GRADE_LEVEL_LABELS: Record<string, string> = {
  PRE_K: 'Pre-K',
  KINDERGARTEN: 'Kindergarten',
  GRADE_1: 'Grade 1',
  GRADE_2: 'Grade 2',
  GRADE_3: 'Grade 3',
  GRADE_4: 'Grade 4',
  GRADE_5: 'Grade 5',
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
  GRADE_12: 'Grade 12',
}

export default function TemplateDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const templateId = params.templateId as string
  
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    topic: '',
    description: '',
    levels: [] as any[],
    questions: [] as Array<{
      id?: string
      textQuestion?: string
      textAnswer?: string
      image?: string
      videoUrl?: string
      order?: number
    }>,
  })

  useEffect(() => {
    if (session?.user && templateId) {
      loadTemplate()
    }
  }, [session, templateId])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}`)
      
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.data)
        // Initialize edit form with current template data
        setEditForm({
          topic: data.data.topic || '',
          description: data.data.description || '',
          levels: data.data.levels || [],
          questions: data.data.questions?.map((q: any) => ({
            id: q.id,
            textQuestion: q.textQuestion || '',
            textAnswer: q.textAnswer || '',
            image: q.image || '',
            videoUrl: q.videoUrl || '',
            order: q.order || 0,
          })) || [],
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load template')
      }
    } catch (err) {
      console.error('Error loading template:', err)
      setError('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleUseTemplate = () => {
    router.push(`/assignments/create/from-template?templateId=${templateId}`)
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: editForm.topic,
          description: editForm.description,
          levels: editForm.levels.map(level => ({
            levelType: level.levelType,
            cefrLevel: level.cefrLevel || null,
            gradeLevel: level.gradeLevel || null,
          })),
          questions: editForm.questions.map((q, index) => ({
            id: q.id,
            textQuestion: q.textQuestion || undefined,
            textAnswer: q.textAnswer || undefined,
            image: q.image || undefined,
            videoUrl: q.videoUrl || undefined,
            order: index,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplate(data.data)
        setIsEditDialogOpen(false)
        // Reload template to get fresh data
        await loadTemplate()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update template')
      }
    } catch (err) {
      console.error('Error updating template:', err)
      alert('Failed to update template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Redirect to templates manage page after successful deletion
        router.push('/templates/manage')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete template')
        setIsDeleteDialogOpen(false)
      }
    } catch (err) {
      console.error('Error deleting template:', err)
      alert('Failed to delete template')
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if current user can edit/delete this template
  const canEdit = session?.user && (
    template?.creator?.id === session.user.id || 
    (session.user as any).customRole === 'ADMIN'
  )

  const convertTimeToSeconds = (timeString: string) => {
    // Handle formats like "1m30s", "90s", "1h30m", etc.
    let totalSeconds = 0
    
    const hours = timeString.match(/(\d+)h/)
    const minutes = timeString.match(/(\d+)m/)
    const seconds = timeString.match(/(\d+)s/)
    
    if (hours) {
      totalSeconds += parseInt(hours[1]) * 3600
    }
    if (minutes) {
      totalSeconds += parseInt(minutes[1]) * 60
    }
    if (seconds) {
      totalSeconds += parseInt(seconds[1])
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
      <div className="container mx-auto p-6">
        <p>Please sign in to view templates.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleGoBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Template not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold">{template.topic}</h1>
            {template.description && (
              <p className="text-muted-foreground mt-1">{template.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Edit and Delete buttons - Only for creator or admin */}
          {canEdit && (
            <>
              <Button variant="outline" size="lg" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="lg" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}

          {/* Try Assignment Button - For VIDEO and READING types */}
          {template.evaluationSettings?.type === 'VIDEO' && template.videoUrl && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Try Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[90vh] p-0 sm:!max-w-[95vw]">
                <div className="flex flex-col h-full max-h-[90vh]">
                  <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                    <div>
                      <DialogTitle className="text-lg font-semibold">
                        Try Assignment
                      </DialogTitle>
                      <DialogDescription>
                        Experience the assignment as your students will
                      </DialogDescription>
                    </div>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Preview Mode
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                      <VideoAssignmentPreview
                        topic={template.topic}
                        videoUrl={template.videoUrl}
                        questions={template.questions.map((q: any) => ({
                          text: q.textQuestion,
                          answer: q.textAnswer,
                        }))}
                        transcriptContent={template.videoTranscript}
                        levels={template.levels || []}
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {template.evaluationSettings?.type === 'READING' && template.questions && template.questions.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Try Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-[75vw] w-[75vw] max-h-[90vh] p-0 sm:!max-w-[75vw]">
                <div className="flex flex-col h-full max-h-[90vh]">
                  <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
                    <div>
                      <DialogTitle className="text-lg font-semibold">
                        Try Assignment
                      </DialogTitle>
                      <DialogDescription>
                        Experience the assignment as your students will
                      </DialogDescription>
                    </div>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      Preview Mode
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-7xl mx-auto w-full">
                      <ReadingAssignmentPreview
                        topic={template.topic}
                        questions={template.questions.map((q: any) => ({
                          text: q.textQuestion || '',
                          title: q.textAnswer || undefined,
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button onClick={handleUseTemplate} size="lg">
            <Copy className="h-4 w-4 mr-2" />
            Use This Template
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player for VIDEO assignments */}
          {template.evaluationSettings?.type === 'VIDEO' && template.videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Video</CardTitle>
                <CardDescription>
                  Students will watch this video and answer the questions below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={getYouTubeEmbedUrl(template.videoUrl)}
                    title="Assignment Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions */}
          {template.questions && template.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Questions ({template.questions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.questions.map((question: any, index: number) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          {/* For READING assignments, show text answer (the reading passage) prominently without title */}
                          {template.evaluationSettings?.type === 'READING' ? (
                            <>
                              {question.textQuestion && (
                                <p className="text-lg leading-relaxed">{question.textQuestion}</p>
                              )}
                            </>
                          ) : (
                            <>
                              {/* For other assignment types, show question and answer separately */}
                              {question.textQuestion && (
                                <p className="text-lg leading-relaxed">{question.textQuestion}</p>
                              )}
                              {/* {question.textAnswer && (
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Expected Answer</label>
                                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                                    {question.textAnswer}
                                  </p>
                                </div>
                              )} */}
                            </>
                          )}
                          {question.image && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Image</label>
                              <img src={question.image} alt="Question" className="mt-2 max-w-sm rounded" />
                            </div>
                          )}
                          {question.videoUrl && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Video</label>
                              <p className="text-sm text-blue-600">{question.videoUrl}</p>
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

          {/* Evaluation Settings */}
          {/* {template.evaluationSettings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Evaluation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="mt-1">{template.evaluationSettings.type}</p>
                </div>
                
                {template.evaluationSettings.customPrompt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Custom Prompt</label>
                    <p className="mt-1 text-sm">{template.evaluationSettings.customPrompt}</p>
                  </div>
                )}
                
                {template.evaluationSettings.rules && Array.isArray(template.evaluationSettings.rules) && template.evaluationSettings.rules.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rules</label>
                    <ul className="mt-1 text-sm space-y-1 list-disc list-inside">
                      {template.evaluationSettings.rules.map((rule: string, index: number) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )} */}

          {/* Context */}
          {template.context && (
            <Card>
              <CardHeader>
                <CardTitle>Context</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{template.context}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Template Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Creator</p>
                  <p className="text-sm text-muted-foreground">{template.creator.username}</p>
                </div>
              </div>

              {template.language && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Language</p>
                      <p className="text-sm text-muted-foreground">{template.language.language}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Usage Count</p>
                <Badge variant="secondary">
                  <Copy className="h-3 w-3 mr-1" />
                  {template.usageCount} times
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Levels */}
          {template.levels && template.levels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {template.levels.map((level: any, index: number) => (
                    <Badge key={index} variant="default">
                      {level.levelType === 'CEFR'
                        ? level.cefrLevel
                        : GRADE_LEVEL_LABELS[level.gradeLevel] || level.gradeLevel}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template details. Changes will be saved immediately.
          </DialogDescription>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={editForm.topic}
                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                placeholder="Enter template topic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Educational Levels *</Label>
              <LevelSelector
                value={editForm.levels}
                onChange={(levels) => setEditForm({ ...editForm, levels })}
              />
              <p className="text-xs text-muted-foreground">
                Select at least one educational level for this template.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Questions</Label>
              <div className="space-y-3">
                {editForm.questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Question {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newQuestions = editForm.questions.filter((_, i) => i !== index)
                          setEditForm({ ...editForm, questions: newQuestions })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {template?.evaluationSettings?.type === 'READING' ? (
                        <>
                          <div>
                            <Label htmlFor={`passage-${index}`} className="text-xs">
                              Passage Text *
                            </Label>
                            <Textarea
                              id={`passage-${index}`}
                              value={question.textAnswer || question.textQuestion || ''}
                              onChange={(e) => {
                                const newQuestions = [...editForm.questions]
                                newQuestions[index] = { 
                                  ...newQuestions[index], 
                                  textAnswer: e.target.value,
                                  textQuestion: e.target.value 
                                }
                                setEditForm({ ...editForm, questions: newQuestions })
                              }}
                              placeholder="Enter reading passage text..."
                              rows={4}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`title-${index}`} className="text-xs">
                              Passage Title (Optional)
                            </Label>
                            <Input
                              id={`title-${index}`}
                              value={question.textQuestion || ''}
                              onChange={(e) => {
                                const newQuestions = [...editForm.questions]
                                newQuestions[index] = { ...newQuestions[index], textQuestion: e.target.value }
                                setEditForm({ ...editForm, questions: newQuestions })
                              }}
                              placeholder="Enter passage title..."
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor={`question-${index}`} className="text-xs">
                              Question *
                            </Label>
                            <Textarea
                              id={`question-${index}`}
                              value={question.textQuestion || ''}
                              onChange={(e) => {
                                const newQuestions = [...editForm.questions]
                                newQuestions[index] = { ...newQuestions[index], textQuestion: e.target.value }
                                setEditForm({ ...editForm, questions: newQuestions })
                              }}
                              placeholder="Enter question text..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`answer-${index}`} className="text-xs">
                              Expected Answer
                            </Label>
                            <Input
                              id={`answer-${index}`}
                              value={question.textAnswer || ''}
                              onChange={(e) => {
                                const newQuestions = [...editForm.questions]
                                newQuestions[index] = { ...newQuestions[index], textAnswer: e.target.value }
                                setEditForm({ ...editForm, questions: newQuestions })
                              }}
                              placeholder="Enter expected answer..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditForm({
                      ...editForm,
                      questions: [
                        ...editForm.questions,
                        {
                          textQuestion: '',
                          textAnswer: '',
                          order: editForm.questions.length,
                        },
                      ],
                    })
                  }}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || !editForm.topic.trim() || editForm.levels.length === 0}
              title={editForm.levels.length === 0 ? 'At least one level is required' : ''}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              &quot;{template?.topic}&quot; and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Template'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

