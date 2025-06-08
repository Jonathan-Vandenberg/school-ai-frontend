'use client'

import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { data: session, update } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync with user's stored preference on mount
  useEffect(() => {
    if (mounted && session?.user && !theme) {
      // Load user's theme preference from their profile
      // This would be done via an API call in a real app
      // For now, we'll use localStorage as fallback
      const storedTheme = localStorage.getItem('theme') || 'system'
      setTheme(storedTheme)
    }
  }, [mounted, session, theme, setTheme])

  // Update user preference when theme changes
  const updateThemePreference = async (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Update user's theme preference in the database
    if (session?.user) {
      try {
        await fetch('/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id,
            theme: newTheme,
          }),
        })
      } catch (error) {
        console.error('Failed to update theme preference:', error)
      }
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {theme === 'light' && <Sun className="h-4 w-4" />}
          {theme === 'dark' && <Moon className="h-4 w-4" />}
          {(theme === 'system' || !theme) && <Monitor className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => updateThemePreference('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateThemePreference('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateThemePreference('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 