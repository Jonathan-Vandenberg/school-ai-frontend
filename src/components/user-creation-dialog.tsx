'use client'

import React, { useState } from 'react'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { 
  Users, 
  User, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check
} from 'lucide-react'
import { useTenant } from '@/components/providers/tenant-provider'

// Form validation schemas
const singleUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  customRole: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
  phone: z.string().optional(),
  address: z.string().optional(),
})

const bulkStudentsSchema = z.object({
  namesList: z.string().min(1, 'Please provide student names'),
  passwordOption: z.enum(['generate', 'custom']),
  customPassword: z.string().optional(),
}).refine((data) => {
  if (data.passwordOption === 'custom') {
    return data.customPassword && data.customPassword.length >= 6
  }
  return true
}, {
  message: 'Custom password must be at least 6 characters',
  path: ['customPassword']
})

type SingleUserFormData = z.infer<typeof singleUserSchema>
type BulkStudentsFormData = z.infer<typeof bulkStudentsSchema>

interface UserCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export function UserCreationDialog({ open, onOpenChange, onUserCreated }: UserCreationDialogProps) {
  const { tenant } = useTenant()
  const [activeTab, setActiveTab] = useState('single')
  const [loading, setLoading] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [bulkResults, setBulkResults] = useState<{
    created: number
    failed: number
    errors: string[]
    createdUsers?: Array<{
      id: string
      name: string
      username: string
      email: string
      role: string
      password: string
    }>
    failedUsers?: Array<{
      name: string
      username: string
      email: string
      error: string
    }>
  } | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | 'all' | null>(null)

  // Single user form
  const singleForm = useForm<SingleUserFormData>({
    resolver: zodResolver(singleUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      customRole: 'STUDENT',
      phone: '',
      address: '',
    },
  })

  // Bulk students form
  const bulkForm = useForm<BulkStudentsFormData>({
    resolver: zodResolver(bulkStudentsSchema),
    defaultValues: {
      namesList: '',
      passwordOption: 'generate',
      customPassword: '',
    },
  })

  const handleSingleUserSubmit = async (data: SingleUserFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onUserCreated()
        onOpenChange(false)
        singleForm.reset()
      } else {
        const error = await response.json()
        singleForm.setError('root', { message: error.message || 'Failed to create user' })
      }
    } catch (error) {
      singleForm.setError('root', { message: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkStudentsSubmit = async (data: BulkStudentsFormData) => {
    setLoading(true)
    setBulkResults(null)
    
    try {
      // Parse names list
      const names = data.namesList.trim().split('\n').filter(name => name.trim())
      
      if (names.length === 0) {
        throw new Error('Please provide at least one student name')
      }

      const students = names.map((name, index) => {
        const cleanName = name.trim()
        if (!cleanName) {
          throw new Error(`Line ${index + 1}: Empty name found`)
        }
        
        // Use the exact name as username, generate safe email separately
        const username = cleanName
        const safeEmailPrefix = cleanName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || `student${index + 1}`
        const email = `${safeEmailPrefix}@school.com`
        const password = data.passwordOption === 'custom' && data.customPassword 
          ? data.customPassword 
          : generatePassword()
        
        return {
          name: cleanName,
          username,
          email,
          customRole: 'STUDENT' as const,
          password,
          phone: '',
          address: cleanName,
        }
      })

      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: students }),
      })

      if (response.ok) {
        const result = await response.json()
        // Match created users with their passwords
        // We need to match by original username/email since the API may have modified usernames
        const createdUsersWithPasswords = result.data.createdUsers?.map((createdUser: any) => {
          // Try to find the original student by matching email (before @) or username
          // The API might have changed the username, but the email pattern should be similar
          const emailPrefix = createdUser.email.split('@')[0]
          const originalStudent = students.find((student, idx) => {
            // Match by original email prefix or username
            const studentEmailPrefix = student.email.split('@')[0]
            // Check if the created user's email prefix starts with the original prefix
            // (accounting for numbers added for conflicts)
            return emailPrefix.startsWith(studentEmailPrefix) || 
                   createdUser.username.startsWith(student.username)
          })
          return {
            ...createdUser,
            password: originalStudent?.password || ''
          }
        }) || []
        
        setBulkResults({
          ...result.data,
          createdUsers: createdUsersWithPasswords
        })
        onUserCreated()
        
        // Don't auto-reset form on success to allow reviewing results
      } else {
        const error = await response.json()
        bulkForm.setError('root', { message: error.message || 'Failed to create users' })
      }
    } catch (error) {
      bulkForm.setError('root', { 
        message: error instanceof Error ? error.message : 'Failed to process student names' 
      })
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const downloadTemplate = () => {
    const textContent = 'John Doe\nJane Smith\nAlex Johnson\nMaria Garcia\nDavid Wilson'
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk_students_names.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const resetBulkForm = () => {
    setBulkResults(null)
    setCopiedIndex(null)
    bulkForm.reset()
  }

  const getTenantSubdomain = () => {
    return tenant?.subdomain || 'demo'
  }

  const formatUserCredentials = (user: { username: string; password: string }) => {
    const subdomain = getTenantSubdomain()
    return `Username: ${user.username}\nPassword: ${user.password}\nWebsite: https://www.${subdomain}.speechanalyser.com`
  }

  const formatAllCredentials = () => {
    if (!bulkResults?.createdUsers) return ''
    const subdomain = getTenantSubdomain()
    return bulkResults.createdUsers.map(user => 
      formatUserCredentials(user)
    ).join('\n\n')
  }

  const handleCopy = async (text: string, index: number | 'all') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Custom unsaved changes logic for dual forms
  const hasUnsavedChanges = () => {
    if (activeTab === 'single') {
      return singleForm.formState.isDirty
    } else {
      return bulkForm.formState.isDirty
    }
  }

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges() && !loading) {
      // Show confirmation dialog if there are unsaved changes
      setShowUnsavedChangesDialog(true)
    } else {
      // Close normally if no changes or dialog is opening
      onOpenChange(newOpen)
    }
  }

  const handleContinueEditing = () => {
    setShowUnsavedChangesDialog(false)
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false)
    // Reset both forms
    singleForm.reset()
    bulkForm.reset()
    setBulkResults(null)
    onOpenChange(false)
  }

  const handleSaveAndClose = async () => {
    setShowUnsavedChangesDialog(false)
    
    try {
      if (activeTab === 'single') {
        // Trigger validation for single form
        const isValid = await singleForm.trigger()
        if (isValid) {
          const formData = singleForm.getValues()
          await handleSingleUserSubmit(formData)
        }
      } else {
        // Trigger validation for bulk form
        const isValid = await bulkForm.trigger()
        if (isValid) {
          const formData = bulkForm.getValues()
          await handleBulkStudentsSubmit(formData)
        }
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Users
          </DialogTitle>
          <DialogDescription>
            Add individual users or bulk create students
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Single User
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Students
            </TabsTrigger>
          </TabsList>

          {/* Single User Creation */}
          <TabsContent value="single" className="space-y-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(handleSingleUserSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={singleForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="john_doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={singleForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@school.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={singleForm.control}
                    name="customRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="TEACHER">Teacher</SelectItem>
                            <SelectItem value="STUDENT">Student</SelectItem>
                            <SelectItem value="PARENT">Parent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={singleForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="min 6 characters" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={singleForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1-555-0123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={singleForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="123 School St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {singleForm.formState.errors.root && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {singleForm.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Bulk Students Creation */}
          <TabsContent value="bulk" className="space-y-4">
            <Form {...bulkForm}>
              <form onSubmit={bulkForm.handleSubmit(handleBulkStudentsSubmit)} className="space-y-4">
                <FormField
                  control={bulkForm.control}
                  name="namesList"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Names</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={`John Doe\nJane Smith\nAlex Johnson\nMaria Garcia\nDavid Wilson`}
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter one student name per line. <br /> Emails will be auto-generated and can be updated later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bulkForm.control}
                  name="passwordOption"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Password Option</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="generate"
                              value="generate"
                              checked={field.value === 'generate'}
                              onChange={() => field.onChange('generate')}
                              className="w-4 h-4"
                            />
                            <label htmlFor="generate" className="text-sm font-medium">
                              Generate random passwords for each student
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="custom"
                              value="custom"
                              checked={field.value === 'custom'}
                              onChange={() => field.onChange('custom')}
                              className="w-4 h-4"
                            />
                            <label htmlFor="custom" className="text-sm font-medium">
                              Use the same password for all students
                            </label>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {bulkForm.watch('passwordOption') === 'custom' && (
                  <FormField
                    control={bulkForm.control}
                    name="customPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter password for all students"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This password will be used for all students in this batch
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {bulkForm.formState.errors.root && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {bulkForm.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}

                {bulkResults && (
                  <Alert variant={bulkResults.failed === 0 ? "default" : "destructive"}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>Bulk creation completed:</p>
                        <div className="flex gap-4">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            ✅ Created: {bulkResults.created}
                          </Badge>
                          {bulkResults.failed > 0 && (
                            <Badge variant="destructive">
                              ❌ Failed: {bulkResults.failed}
                            </Badge>
                          )}
                        </div>
                        {bulkResults.failedUsers && bulkResults.failedUsers.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium mb-2">Failed to create users ({bulkResults.failedUsers.length}):</p>
                            <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 bg-muted/50 space-y-2">
                              {bulkResults.failedUsers.map((user, index) => (
                                <div key={index} className="p-2 bg-background rounded border border-red-200">
                                  <div className="font-medium text-red-700">{user.name || user.username}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {user.username} • {user.email}
                                  </div>
                                  <div className="text-xs text-red-600 mt-1 font-medium">
                                    Error: {user.error}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {bulkResults.createdUsers && bulkResults.createdUsers.length > 0 && (
                          <div className="text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">Successfully created users ({bulkResults.createdUsers.length}):</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(formatAllCredentials(), 'all')}
                                className="h-7"
                              >
                                {copiedIndex === 'all' ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy All
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto border rounded-md p-3 bg-muted/50 space-y-3">
                              {bulkResults.createdUsers.map((user, index) => {
                                const credentials = formatUserCredentials(user)
                                return (
                                  <div key={user.id || index} className="p-3 bg-background rounded border space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 font-mono text-xs whitespace-pre-wrap break-words">
                                        {credentials}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopy(credentials, index)}
                                        className="h-7 w-7 p-0 flex-shrink-0"
                                      >
                                        {copiedIndex === index ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  {bulkResults ? (
                    <Button type="button" onClick={resetBulkForm}>
                      Create More Students
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Students...
                        </>
                      ) : (
                        'Create Students'
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onContinueEditing={handleContinueEditing}
        onSaveAndClose={handleSaveAndClose}
        onDiscardChanges={handleDiscardChanges}
        title="Unsaved Changes"
        description={`You have unsaved changes in the ${activeTab === 'single' ? 'single user' : 'bulk students'} form. Your changes will be lost if you close without saving.`}
        saveButtonText={activeTab === 'single' ? 'Create User & Close' : 'Create Students & Close'}
      />
    </>
  )
} 