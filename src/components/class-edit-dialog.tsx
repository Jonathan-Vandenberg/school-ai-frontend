'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { Loader2, Save, X, School, Users, ChevronDown, Check } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { MultiSelect } from '@/components/ui/multi-select'

interface Class {
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

interface User {
  id: string
  username: string
  email: string
}

const editClassSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters'),
  teacherIds: z.array(z.string()).min(1, 'At least one teacher is required'),
  studentIds: z.array(z.string()).optional(),
})

type EditClassFormData = z.infer<typeof editClassSchema>

interface ClassEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classItem: Class | null
  onClassUpdated: () => void
}

export function ClassEditDialog({ 
  open, 
  onOpenChange, 
  classItem, 
  onClassUpdated 
}: ClassEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  
  // User management states
  const [availableStudents, setAvailableStudents] = useState<User[]>([])
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([])
  const [selectedStudents, setSelectedStudents] = useState<User[]>([])
  const [selectedTeachers, setSelectedTeachers] = useState<User[]>([])
  const [teacherPopoverOpen, setTeacherPopoverOpen] = useState(false)

  const form = useForm<EditClassFormData>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: '',
      teacherIds: [],
      studentIds: [],
    },
  })

  // Use unsaved changes hook
  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    handleDialogClose,
    handleContinueEditing,
    handleSaveAndClose: hookHandleSaveAndClose,
    handleDiscardChanges,
  } = useUnsavedChanges({
    form,
    onClose: onOpenChange,
    onSave: async () => {
      const formData = form.getValues()
      await handleSubmit(formData)
    },
    isLoading: loading,
  })

  // Load class data and users when dialog opens
  useEffect(() => {
    if (open && classItem) {
      setInitialLoadComplete(false)
      loadClassData()
      loadAvailableUsers()
    }
  }, [open, classItem])

  // Update form values when selected users change
  useEffect(() => {
    const teacherIds = selectedTeachers.map(t => t.id)
    const studentIds = selectedStudents.map(s => s.id)
    
    // Only mark as dirty if initial load is complete (user made actual changes)
    const shouldMarkDirty = initialLoadComplete
    
    form.setValue('teacherIds', teacherIds, { shouldDirty: shouldMarkDirty })
    form.setValue('studentIds', studentIds, { shouldDirty: shouldMarkDirty })
    
    if (teacherIds.length > 0 && form.formState.isSubmitted) {
      form.clearErrors('teacherIds')
    }
  }, [selectedTeachers, selectedStudents, form, initialLoadComplete])

  const loadClassData = async () => {
    if (!classItem) return
    
    try {
      const response = await fetch(`/api/classes/${classItem.id}`)
      if (response.ok) {
        const data = await response.json()
        const classData = data.data
        
        // Set form values
      form.reset({
          name: classData.name,
          teacherIds: classData.teachers?.map((t: User) => t.id) || [],
          studentIds: classData.students?.map((s: User) => s.id) || [],
      })
        
        // Set selected users
        setSelectedTeachers(classData.teachers || [])
        setSelectedStudents(classData.students || [])
        
        // Mark initial load as complete
        setInitialLoadComplete(true)
    }
    } catch (err) {
      setError('Failed to load class data')
      console.error('Error loading class data:', err)
    }
  }

  const loadAvailableUsers = async () => {
    if (!classItem) return
    
    setLoadingUsers(true)
    try {
      const response = await fetch(`/api/classes/${classItem.id}/available-users`)
      if (response.ok) {
        const data = await response.json()
        setAvailableStudents(data.data.students || [])
        setAvailableTeachers(data.data.teachers || [])
      } else {
        console.error('Failed to load available users')
      }
    } catch (error) {
      console.error('Error loading available users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Clear messages when dialog opens/closes
  useEffect(() => {
    setError(null)
    setSuccessMessage(null)
  }, [open])

  const handleTeacherSelect = (teacher: User) => {
    const isSelected = selectedTeachers.find(t => t.id === teacher.id)
    if (isSelected) {
      // Remove teacher if already selected
      const newTeachers = selectedTeachers.filter(t => t.id !== teacher.id)
      setSelectedTeachers(newTeachers)
      form.setValue('teacherIds', newTeachers.map(t => t.id), { shouldDirty: true })
      if (form.formState.isSubmitted && newTeachers.length === 0) {
        form.trigger('teacherIds')
      }
    } else {
      // Add teacher if not selected
      const newTeachers = [...selectedTeachers, teacher]
      setSelectedTeachers(newTeachers)
      form.setValue('teacherIds', newTeachers.map(t => t.id), { shouldDirty: true })
      if (form.formState.isSubmitted) {
        form.clearErrors('teacherIds')
      }
    }
    setTeacherPopoverOpen(false)
  }

  const removeTeacher = (teacherId: string) => {
    const newTeachers = selectedTeachers.filter(t => t.id !== teacherId)
    setSelectedTeachers(newTeachers)
    
    form.setValue('teacherIds', newTeachers.map(t => t.id), { shouldDirty: true })
    if (form.formState.isSubmitted && newTeachers.length === 0) {
      form.trigger('teacherIds')
    }
  }

  const handleSubmit = async (data: EditClassFormData) => {
    if (!classItem) return
    
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/classes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classItem.id,
          ...data,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage(result.message || 'Class updated successfully')
        onClassUpdated()
        
        // Close dialog after a short delay to show success message
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update class')
      }
    } catch (err) {
      setError('Failed to update class')
      console.error('Error updating class:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Edit Class
          </DialogTitle>
          <DialogDescription>
            Update class information and settings
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter class name" {...field} disabled={loading} />
                  </FormControl>
                  <FormDescription>
                    The display name for this class
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
              </div>

              {/* Teachers Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="teacherIds"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Teachers (Required)
                      </FormLabel>
                      
                      <FormControl>
                        <Popover open={teacherPopoverOpen} onOpenChange={setTeacherPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={teacherPopoverOpen}
                              className="w-full justify-between"
                              disabled={loadingUsers || loading}
                            >
                              {loadingUsers ? "Loading teachers..." : "Search and select teachers..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search teachers by name or email..." />
                              <CommandList>
                                <CommandEmpty>No teachers found.</CommandEmpty>
                                <CommandGroup>
                                  {availableTeachers.map((teacher) => {
                                    const isSelected = selectedTeachers.find(t => t.id === teacher.id)
                                    return (
                                      <CommandItem
                                        key={teacher.id}
                                        value={`${teacher.username} ${teacher.email}`}
                                        onSelect={() => handleTeacherSelect(teacher)}
                                        className="flex items-center gap-2"
                                      >
                                        <div className="flex items-center gap-2 flex-1">
                                          <div className="flex flex-col flex-1">
                                            <span className="font-medium">{teacher.username}</span>
                                            <span className="text-sm text-muted-foreground">{teacher.email}</span>
                                          </div>
                                          {isSelected && (
                                            <Check className="h-4 w-4 text-green-600" />
                                          )}
                                        </div>
                                      </CommandItem>
                                    )
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      
                      <FormDescription>
                        At least one teacher is required for a class
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selected Teachers */}
                {selectedTeachers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Selected Teachers:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeachers.map((teacher) => (
                        <Badge key={teacher.id} variant="secondary" className="flex items-center gap-2">
                          {teacher.username}
                          <button
                            type="button"
                            onClick={() => removeTeacher(teacher.id)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                            disabled={loading}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Students Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentIds"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Students
                      </FormLabel>
                      
                      {/* Selected Students Display - OUTSIDE the dropdown */}
                      {selectedStudents.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Selected Students ({selectedStudents.length}):</div>
                          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                            {selectedStudents.map((student) => (
                              <Badge key={student.id} variant="secondary" className="flex items-center gap-2">
                                {student.username}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    console.log('🗑️ Removing student:', student.username)
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const newSelectedStudents = selectedStudents.filter(s => s.id !== student.id)
                                    setSelectedStudents(newSelectedStudents)
                                  }}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                  disabled={loading}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* MultiSelect for adding students - with empty selected array to hide badges inside */}
                      <FormControl>
                        <MultiSelect
                          options={availableStudents.map(student => ({
                            value: student.id,
                            label: student.username,
                            sublabel: student.email
                          }))}
                          selected={selectedStudents.map(s => s.id)} // Pass actual IDs for checkmarks
                          onChange={(selectedIds) => {
                            console.log('📝 MultiSelect onChange:', selectedIds)
                            console.log('📋 Current selectedStudents:', selectedStudents.map(s => s.username))
                            
                            // Build new selected students array based on the selectedIds
                            const newSelectedStudents = selectedIds
                              .map(id => {
                                // First try to find in currently selected students
                                let student = selectedStudents.find(s => s.id === id)
                                // If not found, try available students
                                if (!student) {
                                  student = availableStudents.find(s => s.id === id)
                                }
                                return student
                              })
                              .filter((student): student is User => student !== undefined)
                            
                            console.log('✅ New selectedStudents:', newSelectedStudents.map(s => s.username))
                            setSelectedStudents(newSelectedStudents)
                          }}
                          placeholder="Select Students"
                          emptyText="No available students found."
                          disabled={loadingUsers || loading}
                          showSelectAll={false} // Disable select all since we're handling selection manually
                          hideBadgesInTrigger={true} // Hide badges in trigger, only show checkmarks in dropdown
                        />
                      </FormControl>
                      
                      <FormDescription>
                        Search and select students to add to the class. Use the X buttons above to remove students.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Class Statistics */}
            {classItem && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Class Statistics</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Students: {selectedStudents.length}</div>
                  <div>Assignments: {classItem._count?.assignments || 0}</div>
                  <div className="col-span-2">
                    Created: {new Date(classItem.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                  onClick={() => handleDialogClose(false)}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
                <Button type="submit" disabled={loading || loadingUsers}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Updating...' : 'Update Class'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onContinueEditing={handleContinueEditing}
        onSaveAndClose={hookHandleSaveAndClose}
        onDiscardChanges={handleDiscardChanges}
      />
    </>
  )
} 