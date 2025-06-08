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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, X } from 'lucide-react'

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

const editUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  customRole: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']),
  phone: z.string().optional(),
  address: z.string().optional(),
  isPlayGame: z.boolean().optional(),
  confirmed: z.boolean(),
  blocked: z.boolean(),
})

type EditUserFormData = z.infer<typeof editUserSchema>

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onUserUpdated: () => void
}

export function EditUserDialog({ 
  open, 
  onOpenChange, 
  user, 
  onUserUpdated 
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      email: '',
      customRole: 'STUDENT',
      phone: '',
      address: '',
      isPlayGame: false,
      confirmed: true,
      blocked: false,
    },
  })

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        customRole: user.customRole,
        phone: user.phone || '',
        address: user.address || '',
        isPlayGame: user.isPlayGame || false,
        confirmed: user.confirmed,
        blocked: user.blocked,
      })
    }
  }, [user, form])

  // Clear messages when dialog opens/closes
  useEffect(() => {
    setError(null)
    setSuccessMessage(null)
  }, [open])

  const handleSubmit = async (data: EditUserFormData) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...data,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage(result.message || 'User updated successfully')
        onUserUpdated()
        
        // Close dialog after a short delay to show success message
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update user')
      }
    } catch (err) {
      setError('Failed to update user')
      console.error('Error updating user:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-200'
      case 'TEACHER': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'STUDENT': return 'bg-green-100 text-green-800 border-green-200'
      case 'PARENT': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (confirmed: boolean, blocked: boolean) => {
    if (blocked) return 'bg-red-100 text-red-800 border-red-200'
    if (!confirmed) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusText = (confirmed: boolean, blocked: boolean) => {
    if (blocked) return 'Blocked'
    if (!confirmed) return 'Pending'
    return 'Active'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Edit User
            {user && (
              <div className="flex gap-2">
                <Badge className={getRoleColor(user.customRole)}>
                  {user.customRole}
                </Badge>
                <Badge className={getStatusColor(user.confirmed, user.blocked)}>
                  {getStatusText(user.confirmed, user.blocked)}
                </Badge>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            Update user information and permissions. Only administrators can modify role and status settings.
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
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      User's role determines their permissions and access level.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number (optional)" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter address (optional)" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status & Permissions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status & Permissions</h3>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Account Confirmed</FormLabel>
                        <FormDescription>
                          Whether the user's account is confirmed and active.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blocked"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Block User</FormLabel>
                        <FormDescription>
                          Block this user from accessing the platform.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPlayGame"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Games</FormLabel>
                        <FormDescription>
                          Allow this user to access gamification features.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 