'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, MoreVertical, Eye, Copy, Trash, Edit } from 'lucide-react'

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

export default function ManageTemplatesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      loadTemplates()
    }
  }, [session])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      // Load only templates created by current user
      const response = await fetch(`/api/templates?creatorId=${session?.user?.id}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (templateId: string) => {
    router.push(`/templates/${templateId}`)
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(templateId)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    } finally {
      setDeleting(null)
    }
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto p-6">
        <p>Please sign in to manage templates.</p>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage the assignment templates you've created
          </p>
        </div>
        <Button onClick={() => router.push('/templates/browse')}>
          Browse All Templates
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You haven't created any templates yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Templates are created when you save an assignment with the "Save as Template" option enabled.
            </p>
            <Button onClick={() => router.push('/create-assignment')}>
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Templates ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.topic}
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.evaluationSettings?.type || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.levels.slice(0, 3).map((level: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {level.levelType === 'CEFR'
                              ? level.cefrLevel
                              : GRADE_LEVEL_LABELS[level.gradeLevel] || level.gradeLevel}
                          </Badge>
                        ))}
                        {template.levels.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.levels.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{template._count?.questions || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Copy className="h-3 w-3 mr-1" />
                        {template.usageCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(template.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/assignments/create/from-template?templateId=${template.id}`)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Use Template
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600"
                            disabled={deleting === template.id}
                          >
                            {deleting === template.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

