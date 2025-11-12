'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Copy, User, Globe, Target, FileText, Loader2, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { VideoAssignmentPreview } from '@/components/assignments/video-assignment/video-assignment-preview'

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
          {/* Try Assignment Button - Only for VIDEO type */}
          {template.evaluationSettings?.type === 'VIDEO' && template.videoUrl && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Try Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] p-0">
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
                          {/* For READING assignments, show text question prominently without answer */}
                          {template.evaluationSettings?.type === 'READING' ? (
                            <>
                              {/* {question.textAnswer && (
                                <p className="text-sm text-muted-foreground mb-1">{question.textAnswer}</p>
                              )} */}
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
    </div>
  )
}

