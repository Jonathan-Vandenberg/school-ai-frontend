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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, UserCheck, UserX } from 'lucide-react'

// Import global utility functions
import { getRoleColor, getStatusColor, getStatusText, getRoleDisplayName } from '@/lib/utils'

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

type ActionType = 'delete' | 'block' | 'unblock'

interface UserConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  action: ActionType
  onConfirm: (user: User, action: ActionType) => Promise<void>
}

export function UserConfirmationDialog({
  open,
  onOpenChange,
  user,
  action,
  onConfirm
}: UserConfirmationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      await onConfirm(user, action)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getActionDetails = () => {
    switch (action) {
      case 'delete':
        return {
          title: 'Delete User',
          description: 'This action cannot be undone. This will permanently delete the user account and remove all associated data.',
          buttonText: 'Delete User',
          buttonVariant: 'destructive' as const,
          icon: <Trash2 className="h-4 w-4" />,
          warningText: 'Warning: This will delete all user data including assignments, progress, and activity logs.'
        }
      case 'block':
        return {
          title: 'Block User',
          description: 'This will prevent the user from accessing the platform. They will not be able to sign in or use any features.',
          buttonText: 'Block User',
          buttonVariant: 'destructive' as const,
          icon: <UserX className="h-4 w-4" />,
          warningText: 'The user will be immediately signed out and cannot access the platform until unblocked.'
        }
      case 'unblock':
        return {
          title: 'Unblock User',
          description: 'This will restore the user\'s access to the platform. They will be able to sign in and use all features.',
          buttonText: 'Unblock User',
          buttonVariant: 'default' as const,
          icon: <UserCheck className="h-4 w-4" />,
          warningText: 'The user will regain full access to their account and all platform features.'
        }
    }
  }

  const actionDetails = getActionDetails()

  // Clear error when dialog opens/closes
  React.useEffect(() => {
    setError(null)
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {actionDetails.icon}
            {actionDetails.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {actionDetails.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {user && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getRoleColor(user.customRole)}>
                    {getRoleDisplayName(user.customRole)}
                  </Badge>
                  <Badge className={getStatusColor(user.confirmed, user.blocked)}>
                    {getStatusText(user.confirmed, user.blocked)}
                  </Badge>
                </div>
              </div>
              
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800 text-sm">
                  {actionDetails.warningText}
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
              variant={actionDetails.buttonVariant}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                actionDetails.icon
              )}
              {loading ? 'Processing...' : actionDetails.buttonText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 