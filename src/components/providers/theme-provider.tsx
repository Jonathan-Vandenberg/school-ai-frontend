'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Force light mode by setting the class on the html element
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }, [])

  return <>{children}</>
}