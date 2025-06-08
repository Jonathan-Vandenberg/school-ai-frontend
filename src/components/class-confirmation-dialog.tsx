'use client'

import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, School, Users, BookOpen } from 'lucide-react'

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

interface ClassConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classItem: Class | null
  onConfirm: (classItem: Class) => Promise<void>
}

export function ClassConfirmationDialog({
  open,
  onOpenChange,
  classItem,
  onConfirm
}: ClassConfirmationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!classItem) return

    setLoading(true)
    setError(null)

    try {
      await onConfirm(classItem)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Clear error when dialog opens/closes
  React.useEffect(() => {
    setError(null)
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Class
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the class and remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {classItem && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <School className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-lg">{classItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(classItem.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Class Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">{classItem._count?.users || 0}</span> students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <span className="font-medium">{classItem._count?.assignments || 0}</span> assignments
                  </span>
                </div>
              </div>
              
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800 text-sm">
                  <strong>Warning:</strong> This will permanently delete:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The class and all its settings</li>
                    <li>All student enrollments in this class</li>
                    <li>All assignments associated with this class</li>
                    <li>All student progress data for this class</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Deleting...' : 'Delete Class'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 