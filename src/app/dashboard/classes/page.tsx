'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
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
  School,
  Search, 
  Plus, 
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Filter,
  BookOpen,
  Calendar,
  Mail
} from 'lucide-react'

// Import dialog components
import { ClassCreationDialog } from '@/components/class-creation-dialog'
import { ClassEditDialog } from '@/components/class-edit-dialog'
import { ClassConfirmationDialog } from '@/components/class-confirmation-dialog'

interface ClassListItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  _count?: {
    users: number
    teachers: number
    students: number
    assignments: number
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ClassesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassListItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Weekly reports state
  const [weeklyReportsLoading, setWeeklyReportsLoading] = useState<string | null>(null)
  const [weeklyReportsResult, setWeeklyReportsResult] = useState<any>(null)

  const loadClasses = async (page = currentPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/classes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.data || [])
        setPagination(data.pagination || {
          page: 1,
          limit: pageSize,
          total: 0,
          totalPages: 0
        })
      } else {
        setError('Failed to load classes')
      }
    } catch (err) {
      setError('Failed to load classes')
      console.error('Error loading classes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      loadClasses(1)
      setCurrentPage(1)
    }
  }, [session, searchTerm, pageSize])

  useEffect(() => {
    if (session?.user) {
      loadClasses(currentPage)
    }
  }, [currentPage])

  const handleClassCreated = () => {
    loadClasses(currentPage)
  }

  const handleClassUpdated = () => {
    loadClasses(currentPage)
  }

  const handleClassAction = async (action: string, classId: string) => {
    const classItem = classes.find(c => c.id === classId)
    if (!classItem) return

    switch (action) {
      case 'edit':
        setSelectedClass(classItem)
        setEditDialogOpen(true)
        break
      case 'delete':
        setSelectedClass(classItem)
        setConfirmationDialogOpen(true)
        break
      case 'view-assignments':
        router.push(`/dashboard/classes/${classId}/assignments`)
        break
      case 'send-weekly-reports':
        await handleSendWeeklyReports(classId, classItem.name)
        break
    }
  }

  const handleRowClick = (classId: string) => {
    router.push(`/dashboard/classes/${classId}`)
  }

  const handleSendWeeklyReports = async (classId: string, className: string) => {
    try {
      setWeeklyReportsLoading(classId)
      setWeeklyReportsResult(null)

      // Get students in this class
      const studentsResponse = await fetch(`/api/classes/${classId}/available-users`)
      const studentsData = await studentsResponse.json()
      
      if (!studentsData.success) {
        throw new Error('Failed to fetch students')
      }

      const students = studentsData.data.students
      
      if (students.length === 0) {
        setWeeklyReportsResult({
          success: false,
          message: 'No students found in this class',
          processed: 0,
          sent: 0,
          failed: 0,
          errors: []
        })
        return
      }

      // Send weekly reports for each student
      let processed = 0
      let sent = 0
      let failed = 0
      const errors: string[] = []

      console.log(`📧 Starting to send weekly reports for ${students.length} students in class ${className}`)

      for (const student of students) {
        try {
          console.log(`📧 Sending report for student: ${student.username} (${student.id})`)
          
          const response = await fetch('/api/classes/send-weekly-reports', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId: student.id,
              language: 'both'
            }),
          })

          console.log(`📧 Response status for ${student.username}:`, response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ HTTP error for ${student.username}:`, response.status, errorText)
            failed++
            errors.push(`HTTP ${response.status}: Failed to send reports for ${student.username}`)
            continue
          }

          const result = await response.json()
          console.log(`📧 Result for ${student.username}:`, result)
          
          if (result.success) {
            processed += result.data.processed
            sent += result.data.sent
            failed += result.data.failed
            if (result.data.errors) {
              errors.push(...result.data.errors)
            }
          } else {
            failed++
            errors.push(`Failed to send reports for ${student.username}: ${result.error}`)
            console.error(`❌ Failed to send reports for: ${student.username}`, result.error)
          }
        } catch (error) {
          failed++
          const errorMsg = `Error sending reports for ${student.username}: ${error}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      setWeeklyReportsResult({
        success: true,
        message: `Weekly reports processed for ${className}`,
        processed,
        sent,
        failed,
        errors: errors.slice(0, 10) // Limit to first 10 errors
      })

    } catch (error) {
      setWeeklyReportsResult({
        success: false,
        message: `Failed to send weekly reports for ${className}`,
        processed: 0,
        sent: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setWeeklyReportsLoading(null)
    }
  }

  const handleConfirmDelete = async (classItem: ClassListItem) => {
    try {
      const response = await fetch('/api/classes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId: classItem.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete class')
      }

      handleClassUpdated()
    } catch (err) {
      throw err
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1)
  }

  const generatePaginationItems = () => {
    const items = []
    const totalPages = pagination.totalPages
    const current = pagination.page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      items.push(1)
      
      if (current > 4) {
        items.push('ellipsis-start')
      }
      
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPages - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        items.push(i)
      }
      
      if (current < totalPages - 3) {
        items.push('ellipsis-end')
      }
      
      if (totalPages > 1) {
        items.push(totalPages)
      }
    }
    
    return items
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Please sign in to access classes.</AlertDescription>
      </Alert>
    )
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading classes...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground mt-2">
            Manage classes, assign students and teachers
          </p>
        </div>
        {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Search for classes by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by class name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-32">
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Classes
              </CardTitle>
              <CardDescription>
                {pagination.total > 0 && (
                  <>
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} classes
                  </>
                )}
              </CardDescription>
            </div>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No classes found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria' 
                  : 'Start by creating your first class'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow 
                        key={classItem.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(classItem.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{classItem.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {classItem.id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-600" />
                            <span>{classItem._count?.teachers || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>{classItem._count?.students || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>{classItem._count?.assignments || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(classItem.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleClassAction('view-assignments', classItem.id)
                              }}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                View Assignments
                              </DropdownMenuItem>
                              {(session.user.role === 'ADMIN' || session.user.role === 'TEACHER') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleClassAction('send-weekly-reports', classItem.id)
                                    }}
                                    disabled={weeklyReportsLoading === classItem.id}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {weeklyReportsLoading === classItem.id ? 'Sending Reports...' : 'Send Weekly Reports'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation()
                                    handleClassAction('edit', classItem.id)
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Class
                                  </DropdownMenuItem>
                                </>
                              )}
                              {session.user.role === 'ADMIN' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleClassAction('delete', classItem.id)
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Class
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

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                          className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {generatePaginationItems().map((item, index) => (
                        <PaginationItem key={index}>
                          {typeof item === 'number' ? (
                            <PaginationLink 
                              onClick={() => handlePageChange(item)}
                              isActive={pagination.page === item}
                              className="cursor-pointer"
                            >
                              {item}
                            </PaginationLink>
                          ) : (
                            <PaginationEllipsis />
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                          className={pagination.page === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              Active classes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {classes.reduce((sum, c) => sum + (c._count?.students || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {classes.reduce((sum, c) => sum + (c._count?.assignments || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Class assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Class Size</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {classes.length > 0 
                ? Math.round(classes.reduce((sum, c) => sum + (c._count?.students || 0), 0) / classes.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Students per class
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Reports Results */}
      {weeklyReportsResult && (
        <div className="mb-6">
          <Alert className={weeklyReportsResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{weeklyReportsResult.message}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Processed:</span> {weeklyReportsResult.processed}
                  </div>
                  <div>
                    <span className="font-medium">Sent:</span> {weeklyReportsResult.sent}
                  </div>
                  <div>
                    <span className="font-medium">Failed:</span> {weeklyReportsResult.failed}
                  </div>
                </div>
                {weeklyReportsResult.errors.length > 0 && (
                  <div>
                    <p className="font-medium text-sm">Errors:</p>
                    <ul className="text-sm list-disc list-inside ml-4">
                      {weeklyReportsResult.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Classes management dialogs */}
      <ClassCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onClassCreated={handleClassCreated}
      />

      <ClassEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        classItem={selectedClass}
        onClassUpdated={handleClassUpdated}
      />

      <ClassConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        classItem={selectedClass}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
} 