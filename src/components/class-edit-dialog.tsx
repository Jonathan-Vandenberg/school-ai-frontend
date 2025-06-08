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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, X, School } from 'lucide-react'

interface Class {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  _count?: {
    users: number
    assignments: number
  }
}

const editClassSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters'),
  description: z.string().optional(),
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
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const form = useForm<EditClassFormData>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: '',
    },
  })

  // Reset form when class changes
  useEffect(() => {
    if (classItem) {
      form.reset({
        name: classItem.name,
      })
    }
  }, [classItem, form])

  // Clear messages when dialog opens/closes
  useEffect(() => {
    setError(null)
    setSuccessMessage(null)
  }, [open])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            {/* Class Info */}
            {classItem && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Class Statistics</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Students: {classItem._count?.users || 0}</div>
                  <div>Assignments: {classItem._count?.assignments || 0}</div>
                  <div className="col-span-2">
                    Created: {new Date(classItem.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
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
                {loading ? 'Updating...' : 'Update Class'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 