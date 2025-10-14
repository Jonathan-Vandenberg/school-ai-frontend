'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WifiOff, CloudOff, Cloud, AlertCircle } from 'lucide-react'
import { useOfflineAssignments } from '../lib/offline-assignments'

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
        <div className="border border-orange-200 bg-orange-50 p-3 rounded-lg flex items-start gap-2">
          <CloudOff className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-orange-800 text-sm">
            <strong>Working Offline:</strong> You can continue practicing, but answers won't be submitted until you're back online.
          </div>
        </div>
      )}

      {/* Pending Sync Alert */}
      {isOnline && pendingCount > 0 && (
        <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 text-sm">You have unsaved work from offline mode.</span>
          </div>
          <Button 
            size="sm" 
            onClick={syncData}
          >
            Sync Now
          </Button>
        </div>
      )}

      {/* Assignment Content */}
      {children}
    </div>
  )
}
