'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TemplateCard } from '@/components/templates/template-card'
import { Search, Filter, Loader2 } from 'lucide-react'
import { CEFRLevel, GradeLevel, EvaluationType } from '@prisma/client'

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const GRADE_LEVELS: GradeLevel[] = [
  'PRE_K',
  'KINDERGARTEN',
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'GRADE_12',
]

const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
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

const EVALUATION_TYPES: EvaluationType[] = ['VIDEO', 'READING', 'PRONUNCIATION', 'Q_AND_A', 'IMAGE', 'CUSTOM']

export default function TemplatesBrowsePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [cefrLevel, setCefrLevel] = useState<string>('')
  const [gradeLevel, setGradeLevel] = useState<string>('')
  const [evaluationType, setEvaluationType] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (session?.user) {
      loadTemplates()
    }
  }, [session, searchTerm, cefrLevel, gradeLevel, evaluationType, page])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '12')
      if (searchTerm) params.set('search', searchTerm)
      if (cefrLevel) params.set('cefrLevel', cefrLevel)
      if (gradeLevel) params.set('gradeLevel', gradeLevel)
      if (evaluationType) params.set('evaluationType', evaluationType)

      const response = await fetch(`/api/templates?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (templateId: string) => {
    router.push(`/templates/${templateId}`)
  }

  const handleUse = (templateId: string) => {
    router.push(`/assignments/create/from-template?templateId=${templateId}`)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCefrLevel('')
    setGradeLevel('')
    setEvaluationType('')
    setPage(1)
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto p-6">
        <p>Please sign in to browse templates.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Assignment Templates</h1>
        <p className="text-muted-foreground">
          Browse and use pre-made assignment templates created by teachers
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* CEFR Level */}
            <Select value={cefrLevel} onValueChange={(value) => {
              setCefrLevel(value)
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="CEFR Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All CEFR Levels</SelectItem>
                {CEFR_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Grade Level */}
            <Select value={gradeLevel} onValueChange={(value) => {
              setGradeLevel(value)
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Grade Levels</SelectItem>
                {GRADE_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>
                    {GRADE_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={evaluationType} onValueChange={(value) => {
              setEvaluationType(value)
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {EVALUATION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || cefrLevel || gradeLevel || evaluationType) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No templates found. Try adjusting your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onUse={handleUse}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

