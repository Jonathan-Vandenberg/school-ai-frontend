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
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MultiSelect, type Option } from '@/components/ui/multi-select'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { 
  School,
  AlertTriangle,
  Loader2,
  Users,
  X,
  Search,
  ChevronDown,
  Check
} from 'lucide-react'

// Form validation schema
const classSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters'),
  description: z.string().optional(),
  teacherIds: z.array(z.string()).min(1, 'At least one teacher is required'),
  studentIds: z.array(z.string()).optional(),
})

type ClassFormData = z.infer<typeof classSchema>

interface User {
  id: string
  username: string
  email: string
}

interface ClassCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClassCreated: () => void
}

export function ClassCreationDialog({ open, onOpenChange, onClassCreated }: ClassCreationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<User[]>([])
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([])
  const [selectedStudents, setSelectedStudents] = useState<User[]>([])
  const [selectedTeachers, setSelectedTeachers] = useState<User[]>([])
  const [teacherPopoverOpen, setTeacherPopoverOpen] = useState(false)

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
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

  // Load available users when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form completely when dialog opens
      form.reset({
        name: '',
        description: '',
        teacherIds: [],
        studentIds: [],
      })
      setSelectedStudents([])
      setSelectedTeachers([])
      loadAvailableUsers()
    }
  }, [open, form])

  // Update form values when selected users change
  useEffect(() => {
    const teacherIds = selectedTeachers.map(t => t.id)
    const studentIds = selectedStudents.map(s => s.id)
    
    form.setValue('teacherIds', teacherIds)
    form.setValue('studentIds', studentIds)
    
    // Only clear errors if we have teachers and the form has been submitted before
    if (teacherIds.length > 0 && form.formState.isSubmitted) {
      form.clearErrors('teacherIds')
    }
    
    // Only trigger validation if the form has been submitted before
    if (form.formState.isSubmitted) {
      form.trigger(['teacherIds', 'studentIds'])
    }
  }, [selectedTeachers, selectedStudents, form])

  const loadAvailableUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/classes?users=available')
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

  // Convert users to options for MultiSelect
  const studentOptions: Option[] = availableStudents.map(student => ({
    value: student.id,
    label: student.username,
    sublabel: student.email
  }))

  const teacherOptions: Option[] = availableTeachers.map(teacher => ({
    value: teacher.id,
    label: teacher.username,
    sublabel: teacher.email
  }))

  // Filter available users excluding already selected ones
  const availableTeachersFiltered = availableTeachers.filter(teacher => 
    !selectedTeachers.find(st => st.id === teacher.id)
  )

  const handleStudentSelect = (selectedIds: string[]) => {
    console.log('🔍 handleStudentSelect called with:', selectedIds)
    console.log('📋 Current selectedStudents:', selectedStudents.map(s => s.username))
    console.log('📋 Available students:', availableStudents.map(s => s.username))
    
    // Create a map of all students (both available and currently selected) for efficient lookup
    const studentMap = new Map<string, User>()
    
    // Add available students
    availableStudents.forEach(student => studentMap.set(student.id, student))
    
    // Add currently selected students (in case they're not in available list)
    selectedStudents.forEach(student => studentMap.set(student.id, student))
    
    // Map selected IDs to student objects
    const newSelectedStudents = selectedIds
      .map(id => studentMap.get(id))
      .filter((student): student is User => student !== undefined)
    
    console.log('✅ New selected students:', newSelectedStudents.map(s => s.username))
    setSelectedStudents(newSelectedStudents)
  }

  const handleTeacherSelect = (teacher: User) => {
    if (!selectedTeachers.find(t => t.id === teacher.id)) {
      const newTeachers = [...selectedTeachers, teacher]
      setSelectedTeachers(newTeachers)
      setTeacherPopoverOpen(false)
      
      // Immediately update form value
      form.setValue('teacherIds', newTeachers.map(t => t.id))
      
      // Only clear validation errors if form has been submitted before
      if (form.formState.isSubmitted) {
        form.clearErrors('teacherIds')
      }
    }
  }

  const removeTeacher = (teacherId: string) => {
    const newTeachers = selectedTeachers.filter(t => t.id !== teacherId)
    setSelectedTeachers(newTeachers)
    
    // Update form value
    form.setValue('teacherIds', newTeachers.map(t => t.id))
    
    // Only trigger validation if form has been submitted and no teachers remain
    if (form.formState.isSubmitted && newTeachers.length === 0) {
      form.trigger('teacherIds') // This will show the error if no teachers
    }
  }

  const handleSubmit = async (data: ClassFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onClassCreated()
        onOpenChange(false)
        form.reset()
        setSelectedStudents([])
        setSelectedTeachers([])
      } else {
        const error = await response.json()
        form.setError('root', { message: error.error || 'Failed to create class' })
      }
    } catch (error) {
      form.setError('root', { message: 'An unexpected error occurred' })
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
              Create Class
            </DialogTitle>
            <DialogDescription>
              Create a new class and assign teachers and students
            </DialogDescription>
          </DialogHeader>

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
                        <Input placeholder="e.g., Mathematics 101" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a descriptive name for your class
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the class content and objectives..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide additional details about the class
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
                      
                      {/* Teacher Search Dropdown */}
                      <FormControl>
                        <Popover open={teacherPopoverOpen} onOpenChange={setTeacherPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={teacherPopoverOpen}
                              className="w-full justify-between"
                              disabled={loadingUsers}
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
                                  {availableTeachersFiltered.map((teacher) => (
                                    <CommandItem
                                      key={teacher.id}
                                      value={`${teacher.username} ${teacher.email}`}
                                      onSelect={() => handleTeacherSelect(teacher)}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{teacher.username}</span>
                                        <span className="text-sm text-muted-foreground">{teacher.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
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
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Students Section with Multi-Select Checkboxes */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentIds"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Students (Optional)
                      </FormLabel>
                      
                      {/* Temporarily disabled while fixing X button issue */}
                      <FormControl>
                        <div className="p-4 border border-dashed border-muted rounded-lg text-center text-muted-foreground">
                          <p>Student selection temporarily disabled</p>
                          <p className="text-xs">Working on fixing the X button removal issue</p>
                        </div>
                      </FormControl>
                      
                      <FormDescription>
                        Student assignment will be available after fixing the removal functionality.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || loadingUsers}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Class'
                  )}
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