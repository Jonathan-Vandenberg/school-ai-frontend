'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  School,
  BarChart3,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  FileText,
  Calendar,
  MessageSquare,
  Award,
  TrendingUp,
  User,
  LogOut,
  ChevronUp,
  Plus
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: string
  items?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    roles: ['ADMIN']
  },
  {
    title: 'My Profile',
    href: '/profile',
    icon: User,
    roles: ['TEACHER', 'STUDENT', 'PARENT']
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['ADMIN']
  },
  {
    title: 'Teachers',
    href: '/dashboard/teachers',
    icon: GraduationCap,
    roles: ['ADMIN']
  },
  {
    title: 'Students',
    href: '/dashboard/students',
    icon: User,
    roles: ['ADMIN', 'TEACHER']
  },
  {
    title: 'Assignments',
    href: '/dashboard/assignments',
    icon: BookOpen,
    roles: ['ADMIN', 'TEACHER', 'STUDENT']
  },
  {
    title: 'My Assignments',
    href: '/dashboard/my-assignments',
    icon: FileText,
    roles: ['STUDENT']
  },
  {
    title: 'Classes',
    href: '/dashboard/classes',
    icon: School,
    roles: ['ADMIN', 'TEACHER', 'STUDENT']
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: TrendingUp,
    roles: ['ADMIN', 'TEACHER']
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
    roles: ['ADMIN', 'TEACHER', 'PARENT']
  },
  {
    title: 'Calendar',
    href: '/dashboard/calendar',
    icon: Calendar,
    roles: ['ADMIN', 'TEACHER', 'STUDENT']
  },
  {
    title: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
    roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']
  },
  {
    title: 'Achievements',
    href: '/dashboard/achievements',
    icon: Award,
    roles: ['STUDENT', 'PARENT']
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']
  }
]

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const userRole = session?.user?.role || ''

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole)
  )

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'TEACHER': return 'bg-blue-100 text-blue-800'
      case 'STUDENT': return 'bg-green-100 text-green-800'
      case 'PARENT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <School className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">JIS AI Portal</span>
                  <span className="truncate text-xs">Japanese International School</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions for Admin/Teacher */}
        {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Plus />
                    <span>New Assignment</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {userRole === 'ADMIN' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Users />
                      <span>Add User</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Stats for Students */}
        {userRole === 'STUDENT' && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-1 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assignments</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-medium">--</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-blue-100 text-blue-600">
                      {session?.user?.username?.charAt(0).toUpperCase() || 
                       session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {session?.user?.username || 'User'}
                    </span>
                    <span className="truncate text-xs">
                      {session?.user?.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-blue-100 text-blue-600">
                        {session?.user?.username?.charAt(0).toUpperCase() || 
                         session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.username || 'User'}
                      </span>
                      <span className="truncate text-xs">
                        {session?.user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Role Badge and Theme Toggle */}
        {session?.user && (
          <div className="flex items-center justify-between px-2 py-1">
            <Badge className={getRoleColor(session.user.role || '')} variant="outline">
              {session.user.role}
            </Badge>
            <ThemeToggle />
          </div>
        )}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
} 