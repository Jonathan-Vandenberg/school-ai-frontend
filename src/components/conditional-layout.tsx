'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Routes that should NOT show the sidebar
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup', 
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/error'
  ]

  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/')
  const isAuthenticated = status === 'authenticated' && session
  
  // Show sidebar only for authenticated users on non-public routes
  const showSidebar = isAuthenticated && !isPublicRoute

  if (showSidebar) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // For public routes or unauthenticated users, render without sidebar
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
} 