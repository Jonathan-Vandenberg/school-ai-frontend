'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  ArrowLeft,
  School,
  BookOpen,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Assignment {
  id: string
  topic: string | null
  description: string | null
  type: string
  isActive: boolean | null
  scheduledPublishAt: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    submissions: number
  }
}

interface ClassDetails {
  id: string
  name: string
}

export default function ClassAssignmentsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const classId = params.classId as string
  
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (session?.user && classId) {
      loadClassDetails()
      loadAssignments()
    }
  }, [session, classId, searchTerm, statusFilter])

  const loadClassDetails = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        setClassDetails({
          id: data.data.id,
          name: data.data.name
        })
      }
    } catch (err) {
      console.error('Error loading class details:', err)
    }
  }

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        classId: classId,
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/assignments?${params}`)
      if (response.ok) {
        const result = await response.json()
        // Handle the new response format with success and data properties
        if (result.success && result.data) {
          setAssignments(result.data)
        } else if (Array.isArray(result)) {
          // Handle legacy response format
          setAssignments(result)
        } else {
          setAssignments(result.data || [])
        }
      } else {
        setError('Failed to load assignments')
      }
    } catch (err) {
      setError('Failed to load assignments')
      console.error('Error loading assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push(`/dashboard/classes/${classId}`)
  }

  const handleGoToClasses = () => {
    router.push('/dashboard/classes')
  }

  const handleCreateAssignment = () => {
    router.push(`/create-assignment`)
  }

  const handleAssignmentAction = (action: string, assignmentId: string) => {
    switch (action) {
      case 'view':
        router.push(`/assignments/${assignmentId}`)
        break
      case 'edit':
        router.push(`/assignments/${assignmentId}/edit`)
        break
      case 'delete':
        // Handle delete - would need confirmation dialog
        console.log('Delete assignment:', assignmentId)
        break
    }
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

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Play className="h-4 w-4 text-blue-600" />
      case 'reading': return <BookOpen className="h-4 w-4 text-green-600" />
      case 'pronunciation': return <Users className="h-4 w-4 text-purple-600" />
      default: return <BookOpen className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to access assignments.</AlertDescription>
      </Alert>
    )
  }

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading assignments...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Class
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Assignments
            </h1>
            <p className="text-muted-foreground mt-2">
              {classDetails ? (
                <>
                  Class: <span className="font-medium">{classDetails.name}</span>
                </>
              ) : (
                'Loading class details...'
              )}
            </p>
          </div>
        </div>
        {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
          <Button onClick={handleCreateAssignment}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button 
          variant="link" 
          onClick={handleGoToClasses}
          className="p-0 h-auto font-normal"
        >
          Classes
        </Button>
        <span>/</span>
        <Button 
          variant="link" 
          onClick={handleGoBack}
          className="p-0 h-auto font-normal"
        >
          {classDetails?.name || 'Class'}
        </Button>
        <span>/</span>
        <span>Assignments</span>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Search for assignments by title or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by assignment title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Assignments ({assignments.length})
              </CardTitle>
              <CardDescription>
                Assignments for this class
              </CardDescription>
            </div>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No assignments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria' 
                  : 'Start by creating your first assignment for this class'
                }
              </p>
              {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
                <Button onClick={handleCreateAssignment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.topic}</div>
                          {assignment.description && (
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {assignment.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(assignment.type)}
                          <span className="capitalize">{assignment.type.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(getStatus(assignment))}>
                          {getStatus(assignment)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.scheduledPublishAt ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(assignment.scheduledPublishAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{assignment._count?.submissions || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {new Date(assignment.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAssignmentAction('view', assignment.id)}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              View Assignment
                            </DropdownMenuItem>
                            {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAssignmentAction('edit', assignment.id)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Assignment
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAssignmentAction('delete', assignment.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Assignment
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">
              In this class
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {assignments.filter(a => getStatus(a) === 'PUBLISHED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {assignments.filter(a => getStatus(a) === 'DRAFT').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Work in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assignments.reduce((sum, a) => sum + (a._count?.submissions || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Student submissions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 