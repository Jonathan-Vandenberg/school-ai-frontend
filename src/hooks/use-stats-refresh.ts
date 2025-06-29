import { useCallback } from 'react'

// Global callback to refresh stats - will be set by the sidebar
let globalStatsRefresh: (() => void) | null = null

export function useStatsRefresh() {
  const triggerRefresh = useCallback(() => {
    if (globalStatsRefresh) {
      globalStatsRefresh()
    }
  }, [])

  const setRefreshCallback = useCallback((callback: () => void) => {
    globalStatsRefresh = callback
  }, [])

  return {
    triggerRefresh,
    setRefreshCallback
  }
} 