'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Video, Mic, Image as ImageIcon, FileText, Eye, Copy } from 'lucide-react'
import { CEFRLevel, GradeLevel, EvaluationType } from '@prisma/client'

interface TemplateCardProps {
  template: {
    id: string
    topic: string
    description?: string | null
    usageCount: number
    creator: {
      username: string
    }
    language?: {
      language: string
    } | null
    evaluationSettings?: {
      type: EvaluationType
    } | null
    levels: Array<{
      levelType: 'CEFR' | 'GRADE'
      cefrLevel?: CEFRLevel | null
      gradeLevel?: GradeLevel | null
    }>
    _count?: {
      questions: number
    }
  }
  onPreview: (templateId: string) => void
  onUse: (templateId: string) => void
}

const GRADE_LEVEL_LABELS: Record<string, string> = {
  PRE_K: 'Pre-K',
  KINDERGARTEN: 'K',
  GRADE_1: 'G1',
  GRADE_2: 'G2',
  GRADE_3: 'G3',
  GRADE_4: 'G4',
  GRADE_5: 'G5',
  GRADE_6: 'G6',
  GRADE_7: 'G7',
  GRADE_8: 'G8',
  GRADE_9: 'G9',
  GRADE_10: 'G10',
  GRADE_11: 'G11',
  GRADE_12: 'G12',
}

const EVALUATION_TYPE_CONFIG: Record<EvaluationType, { icon: any; label: string; color: string }> = {
  VIDEO: { icon: Video, label: 'Video', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  READING: { icon: BookOpen, label: 'Reading', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  PRONUNCIATION: { icon: Mic, label: 'Pronunciation', color: 'bg-green-100 text-green-700 border-green-200' },
  Q_AND_A: { icon: FileText, label: 'Q&A', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  IMAGE: { icon: ImageIcon, label: 'Image', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  CUSTOM: { icon: FileText, label: 'Custom', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const typeConfig = template.evaluationSettings
    ? EVALUATION_TYPE_CONFIG[template.evaluationSettings.type]
    : EVALUATION_TYPE_CONFIG.CUSTOM
  const TypeIcon = typeConfig.icon

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${typeConfig.color}`}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-xs">
              {typeConfig.label}
            </Badge>
          </div>
          {template.usageCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Copy className="h-3 w-3 mr-1" />
              {template.usageCount}
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-lg line-clamp-2">{template.topic}</CardTitle>
        
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {template.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Levels */}
          {template.levels.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Levels</p>
              <div className="flex flex-wrap gap-1">
                {template.levels.map((level, index) => (
                  <Badge
                    key={`${level.levelType}-${level.cefrLevel || level.gradeLevel}-${index}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    {level.levelType === 'CEFR'
                      ? level.cefrLevel
                      : GRADE_LEVEL_LABELS[level.gradeLevel as string] || level.gradeLevel}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{template._count?.questions || 0} questions</span>
            {template.language && (
              <span>{template.language.language}</span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            by {template.creator.username}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onPreview(template.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onUse(template.id)}
          >
            <Copy className="h-4 w-4 mr-1" />
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

