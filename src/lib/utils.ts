import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Get role-specific icon color classes
 */
export function getRoleIconColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'text-red-600'
    case 'TEACHER':
      return 'text-blue-600'
    case 'STUDENT':
      return 'text-green-600'
    case 'PARENT':
      return 'text-purple-600'
    default:
      return 'text-gray-600'
  }
}
