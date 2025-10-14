'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff, CloudOff, Cloud, AlertCircle } from 'lucide-react'
import { useOfflineAssignments } from '@/lib/offline-assignments'

interface OfflineAssignmentWrapperProps {
  assignmentId: string
  children: React.ReactNode
}

export function OfflineAssignmentWrapper({ assignmentId, children }: OfflineAssignmentWrapperProps) {
  const { isOnline, pendingCount, syncData } = useOfflineAssignments(assignmentId)

  return (
    <div className="space-y-4">
      {/* Online/Offline Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Cloud className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">Offline Mode</span>
            </>
          )}
        </div>
        
        {pendingCount > 0 && (
          <Badge variant="outline" className="border-blue-200 text-blue-700">
            {pendingCount} pending sync
          </Badge>
        )}
      </div>

      {/* Offline Alert */}
      {!isOnline && (
        <Alert className="border-orange-200 bg-orange-50">
          <CloudOff className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Working Offline:</strong> You can continue practicing, but answers won't be submitted until you're back online.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Sync Alert */}
      {isOnline && pendingCount > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-blue-800 flex items-center justify-between">
            <span>You have unsaved work from offline mode.</span>
            <Button 
              size="sm" 
              onClick={syncData}
              className="ml-2"
            >
              Sync Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Assignment Content */}
      {children}
    </div>
  )
}
