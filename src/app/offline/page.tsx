'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WifiOff, RefreshCw, BookOpen, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [pendingData, setPendingData] = useState<any[]>([])

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check for pending offline data
    const pending = localStorage.getItem('pendingOfflineData')
    if (pending) {
      setPendingData(JSON.parse(pending))
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const syncPendingData = async () => {
    if (!isOnline || pendingData.length === 0) return
    
    // In a real implementation, you'd sync pending assignments here
    console.log('Syncing pending data:', pendingData)
    localStorage.removeItem('pendingOfflineData')
    setPendingData([])
  }

  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-green-50">
        <Card className="max-w-md w-full border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-800">You're Back Online!</CardTitle>
            <CardDescription>
              Great! Your internet connection has been restored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingData.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  You have {pendingData.length} assignment(s) to sync
                </p>
                <Button onClick={syncPendingData} size="sm" className="w-full">
                  Sync Now
                </Button>
              </div>
            )}
            
            <Button onClick={handleRefresh} className="w-full">
              Continue to School AI
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-gray-500" />
          </div>
          <CardTitle className="text-xl">You're Offline</CardTitle>
          <CardDescription>
            No internet connection, but you can still use School AI in limited mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* What works offline */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">✅ Available Offline:</h4>
            <div className="text-sm text-gray-600 space-y-2 pl-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>View previously opened assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Practice questions (answers saved locally)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Review completed work and scores</span>
              </div>
            </div>
          </div>

          {/* What doesn't work */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">⏳ Requires Internet:</h4>
            <div className="text-sm text-gray-600 space-y-2 pl-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Submit assignment answers</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Audio pronunciation analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Load new assignments</span>
              </div>
            </div>
          </div>

          {pendingData.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {pendingData.length} assignment(s) ready to sync
                </span>
              </div>
              <p className="text-xs text-blue-600">
                Your work will automatically sync when you reconnect.
              </p>
            </div>
          )}
          
          <Button onClick={handleRefresh} className="w-full" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Connection
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            Continue working - your progress will sync when you're back online.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}