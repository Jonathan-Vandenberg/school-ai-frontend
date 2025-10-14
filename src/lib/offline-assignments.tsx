// Offline assignment utilities for PWA functionality
import { useState, useEffect, useCallback } from 'react'

export interface OfflineAssignmentData {
  assignmentId: string
  questionId: string
  answer: any
  timestamp: number
  type: 'text' | 'audio' | 'choice'
  synced: boolean
}

export class OfflineAssignmentManager {
  private readonly STORAGE_KEY = 'schoolai_offline_assignments'
  private readonly PENDING_KEY = 'schoolai_pending_sync'

  // Save assignment progress offline
  saveOfflineProgress(data: Omit<OfflineAssignmentData, 'timestamp' | 'synced'>) {
    try {
      const existingData = this.getOfflineData()
      const newEntry: OfflineAssignmentData = {
        ...data,
        timestamp: Date.now(),
        synced: false
      }
      
      // Remove existing entry for same question if exists
      const filteredData = existingData.filter(
        item => !(item.assignmentId === data.assignmentId && item.questionId === data.questionId)
      )
      
      const updatedData = [...filteredData, newEntry]
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData))
      
      // Update pending count
      this.updatePendingCount()
      
      return true
    } catch (error) {
      console.error('Failed to save offline progress:', error)
      return false
    }
  }

  // Get all offline data
  getOfflineData(): OfflineAssignmentData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to get offline data:', error)
      return []
    }
  }

  // Get offline data for specific assignment
  getAssignmentOfflineData(assignmentId: string): OfflineAssignmentData[] {
    return this.getOfflineData().filter(item => item.assignmentId === assignmentId)
  }

  // Get unsynced data
  getUnsyncedData(): OfflineAssignmentData[] {
    return this.getOfflineData().filter(item => !item.synced)
  }

  // Mark items as synced
  markAsSynced(assignmentId: string, questionId: string) {
    try {
      const data = this.getOfflineData()
      const updatedData = data.map(item => {
        if (item.assignmentId === assignmentId && item.questionId === questionId) {
          return { ...item, synced: true }
        }
        return item
      })
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData))
      this.updatePendingCount()
      return true
    } catch (error) {
      console.error('Failed to mark as synced:', error)
      return false
    }
  }

  // Clear all synced data (cleanup)
  clearSyncedData() {
    try {
      const unsyncedData = this.getUnsyncedData()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(unsyncedData))
      this.updatePendingCount()
    } catch (error) {
      console.error('Failed to clear synced data:', error)
    }
  }

  // Update pending count for UI
  private updatePendingCount() {
    const pendingCount = this.getUnsyncedData().length
    localStorage.setItem(this.PENDING_KEY, pendingCount.toString())
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('offline-data-updated', { 
      detail: { pendingCount } 
    }))
  }

  // Get pending count
  getPendingCount(): number {
    try {
      const count = localStorage.getItem(this.PENDING_KEY)
      return count ? parseInt(count, 10) : 0
    } catch {
      return 0
    }
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine
  }

  // Sync all pending data when online
  async syncPendingData(): Promise<boolean> {
    if (!this.isOnline()) {
      return false
    }

    const pendingData = this.getUnsyncedData()
    if (pendingData.length === 0) {
      return true
    }

    try {
      // Group by assignment
      const groupedData = pendingData.reduce((acc, item) => {
        if (!acc[item.assignmentId]) {
          acc[item.assignmentId] = []
        }
        acc[item.assignmentId].push(item)
        return acc
      }, {} as Record<string, OfflineAssignmentData[]>)

      // Sync each assignment
      for (const [assignmentId, items] of Object.entries(groupedData)) {
        try {
          const response = await fetch(`/api/assignments/${assignmentId}/sync-offline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items })
          })

          if (response.ok) {
            // Mark all items for this assignment as synced
            items.forEach(item => {
              this.markAsSynced(item.assignmentId, item.questionId)
            })
          }
        } catch (error) {
          console.error(`Failed to sync assignment ${assignmentId}:`, error)
        }
      }

      return true
    } catch (error) {
      console.error('Failed to sync pending data:', error)
      return false
    }
  }
}

// Singleton instance
export const offlineManager = new OfflineAssignmentManager()

// React hook for using offline functionality
export function useOfflineAssignments(assignmentId?: string) {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    // Initial count
    setPendingCount(offlineManager.getPendingCount())

    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleDataUpdate = (e: CustomEvent) => {
      setPendingCount(e.detail.pendingCount)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-data-updated', handleDataUpdate as EventListener)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-data-updated', handleDataUpdate as EventListener)
    }
  }, [])

  const saveProgress = useCallback((questionId: string, answer: any, type: 'text' | 'audio' | 'choice') => {
    if (!assignmentId) return false
    
    return offlineManager.saveOfflineProgress({
      assignmentId,
      questionId,
      answer,
      type
    })
  }, [assignmentId])

  const getAssignmentData = useCallback(() => {
    if (!assignmentId) return []
    return offlineManager.getAssignmentOfflineData(assignmentId)
  }, [assignmentId])

  return {
    isOnline,
    pendingCount,
    saveProgress,
    getAssignmentData,
    syncData: offlineManager.syncPendingData.bind(offlineManager)
  }
}
