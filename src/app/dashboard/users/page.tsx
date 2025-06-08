'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
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
  Users, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Download,
  Loader2
} from 'lucide-react'

// Import global utility functions
import { getRoleColor, getStatusColor, getStatusText } from '@/lib/utils'

// Import dialog components
import { UserCreationDialog } from '@/components/user-creation-dialog'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { UserConfirmationDialog } from '@/components/user-confirmation-dialog'

interface User {
  id: string
  username: string
  email: string
  customRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT'
  confirmed: boolean
  blocked: boolean
  phone: string | null
  address: string | null
  isPlayGame: boolean | null
  createdAt: string
  updatedAt: string
}

interface RoleCounts {
  admin: number
  teacher: number
  student: number
  parent: number
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmationAction, setConfirmationAction] = useState<'delete' | 'block' | 'unblock'>('delete')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0
  })

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounce search input to prevent focus loss
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Maintain focus after search updates
  useEffect(() => {
    if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
      // Only refocus if we were searching and lost focus unexpectedly
      if (searchInput && !searchLoading) {
        searchInputRef.current.focus()
      }
    }
  }, [users, searchInput, searchLoading])

  const loadUsers = async (page = currentPage, isSearch = false) => {
    try {
      // Use different loading states
      if (isSearch) {
        setSearchLoading(true)
      } else {
        setLoading(true)
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }

      const response = await fetch(`/api/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
        setPagination(data.pagination || {
          page: 1,
          limit: pageSize,
          total: 0,
          totalPages: 0
        })
        setRoleCounts(data.roleCounts || {
          admin: 0,
          teacher: 0,
          student: 0,
          parent: 0
        })
        setError(null)
      } else {
        setError('Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      if (isSearch) {
        setSearchLoading(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      // Determine if this is a search operation
      const isSearch = searchTerm.length > 0
      loadUsers(1, isSearch)
      setCurrentPage(1)
    }
  }, [session, searchTerm, roleFilter, pageSize])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      // Load users for any page change (including going back to page 1)
      loadUsers(currentPage, false)
    }
  }, [currentPage])

  const handleUserCreated = () => {
    loadUsers(currentPage, false) // Refresh without search loading
  }

  const handleUserUpdated = () => {
    loadUsers(currentPage, false) // Refresh without search loading
  }

  const handleUserAction = async (action: string, userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    switch (action) {
      case 'edit':
        setSelectedUser(user)
        setEditDialogOpen(true)
        break
      case 'delete':
        setSelectedUser(user)
        setConfirmationAction('delete')
        setConfirmationDialogOpen(true)
        break
      case 'toggle-status':
        if (user.blocked) {
          setSelectedUser(user)
          setConfirmationAction('unblock')
          setConfirmationDialogOpen(true)
        } else {
          setSelectedUser(user)
          setConfirmationAction('block')
          setConfirmationDialogOpen(true)
        }
        break
    }
  }

  const handleConfirmAction = async (user: User, action: 'delete' | 'block' | 'unblock') => {
    try {
      if (action === 'delete') {
        const response = await fetch('/api/users', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete user')
        }
      } else {
        // Block or unblock user
        const blocked = action === 'block'
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: user.id, 
            blocked 
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to ${action} user`)
        }
      }

      // Refresh the user list
      handleUserUpdated()
    } catch (err) {
      throw err // Re-throw to be handled by the confirmation dialog
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && page !== currentPage) {
      setCurrentPage(page)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Generate pagination numbers with ellipsis
  const generatePaginationItems = () => {
    const items = []
    const totalPages = pagination.totalPages
    const current = currentPage

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(i)
      }
    } else {
      // Show first page
      items.push(1)
      
      if (current > 4) {
        items.push('ellipsis-start')
      }
      
      // Show pages around current
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPages - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        items.push(i)
      }
      
      if (current < totalPages - 3) {
        items.push('ellipsis-end')
      }
      
      // Show last page
      if (totalPages > 1) {
        items.push(totalPages)
      }
    }
    
    return items
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <Alert variant="destructive">
        <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
      </Alert>
    )
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading users...</div>
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
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>
            Search and filter users by role, status, or name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input 
                placeholder="Search by username or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9"
                ref={searchInputRef}
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="w-full sm:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
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
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>
                {pagination.total > 0 && (
                  <>
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </>
                )}
              </CardDescription>
            </div>
            {(loading || searchLoading) && (
              <div className="text-sm text-muted-foreground">
                {searchLoading ? 'Searching...' : 'Loading...'}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search criteria' 
                  : 'Start by adding your first user'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.customRole)}>
                            {user.customRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.confirmed, user.blocked)}>
                            {getStatusText(user.confirmed, user.blocked)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
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
                              <DropdownMenuItem onClick={() => handleUserAction('edit', user.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction('toggle-status', user.id)}>
                                {user.blocked ? (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Unblock User
                                  </>
                                ) : (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Block User
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleUserAction('delete', user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
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
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) {
                              handlePageChange(currentPage - 1)
                            }
                          }}
                          className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          aria-disabled={currentPage === 1}
                        />
                      </PaginationItem>
                      
                      {generatePaginationItems().map((item, index) => (
                        <PaginationItem key={index}>
                          {typeof item === 'number' ? (
                            <PaginationLink 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (item !== currentPage) {
                                  handlePageChange(item)
                                }
                              }}
                              isActive={currentPage === item}
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
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < pagination.totalPages) {
                              handlePageChange(currentPage + 1)
                            }
                          }}
                          className={currentPage === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          aria-disabled={currentPage === pagination.totalPages}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {roleCounts.teacher}
            </div>
            <p className="text-xs text-muted-foreground">
              Active teachers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {roleCounts.student}
            </div>
            <p className="text-xs text-muted-foreground">
              Enrolled students
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parents</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {roleCounts.parent}
            </div>
            <p className="text-xs text-muted-foreground">
              Parent accounts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {roleCounts.admin}
            </div>
            <p className="text-xs text-muted-foreground">
              System admins
            </p>
          </CardContent>
        </Card>
      </div>

      <UserCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
      />

      <UserConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        user={selectedUser}
        action={confirmationAction}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
} 