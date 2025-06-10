import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Percentage calculation utility
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

// Score calculation utility
export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Generate random color for assignments
export function generateRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#48CAE4', '#FFB3BA', '#BFFCC6', '#FFFFBA', '#FFD3A5'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate unique username
export function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z]/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${base}${random}`
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Deep clone utility
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const cloned = {} as { [key: string]: any }
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as { [key: string]: any })[key])
    })
    return cloned as T
  }
  return obj
}

// Array utilities
export function groupBy<T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const group = key(item)
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

// Check if assignment is overdue
export function isOverdue(dueDate: Date | string): boolean {
  return new Date(dueDate) < new Date()
}

// Get assignment status
export function getAssignmentStatus(
  isComplete: boolean,
  dueDate?: Date | string
): 'completed' | 'overdue' | 'pending' {
  if (isComplete) return 'completed'
  if (dueDate && isOverdue(dueDate)) return 'overdue'
  return 'pending'
} 

/**
 * Get Tailwind classes for user role badges
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'TEACHER':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'STUDENT':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'PARENT':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator'
    case 'TEACHER':
      return 'Teacher'
    case 'STUDENT':
      return 'Student'
    case 'PARENT':
      return 'Parent'
    default:
      return role
  }
}

/**
 * Get Tailwind classes for status badges
 */
export function getStatusColor(confirmed: boolean, blocked: boolean): string {
  if (blocked) return 'bg-red-100 text-red-800 border-red-200'
  if (!confirmed) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

/**
 * Get human-readable status text
 */
export function getStatusText(confirmed: boolean, blocked: boolean): string {
  if (blocked) return 'Blocked'
  if (!confirmed) return 'Pending'
  return 'Active'
} 