'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Clock, BookOpen, AlertCircle } from 'lucide-react'
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'
import Link from 'next/link'

interface Assignment {
  id: string
  topic: string | null
  type: string | null
  dueDate: string | null
  scheduledPublishAt: string | null
  isActive: boolean | null
  publishedAt: string | null
  progress: {
    completed: boolean
    completedQuestions: number
    totalQuestions: number
    score: number | null
    hasStarted: boolean
  }
  stats?: {
    totalAssignedStudents: number
    completedCount: number
    inProgressCount: number
    notStartedCount: number
    completionRate: number
    averageScore: number | null
  }
  _count: {
    progresses: number
    questions: number
  }
}

export default function CalendarTeacherPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchAssignments()
    }
  }, [session])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assignments/teacher/calendar')
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get assignments for selected date
  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(assignment => {
      const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
      if (!assignmentDate) return false
      const parsedDate = parseISO(assignmentDate)
      return format(parsedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  // Get dates that have assignments
  const getAssignmentDates = () => {
    const dates: Date[] = []
    assignments.forEach(assignment => {
      const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
      if (assignmentDate) {
        dates.push(parseISO(assignmentDate))
      }
    })
    return dates
  }

  const assignmentDates = getAssignmentDates()
  const selectedDateAssignments = selectedDate ? getAssignmentsForDate(selectedDate) : []

  const getAssignmentStatusColor = (assignment: Assignment) => {
    if (assignment.progress.completed) return 'bg-green-100 text-green-800 border-green-200'
    if (assignment.progress.hasStarted) return 'bg-blue-100 text-blue-800 border-blue-200'
    
    const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
    if (!assignmentDate) return 'bg-gray-100 text-gray-800 border-gray-200'
    
    const date = parseISO(assignmentDate)
    if (isPast(date) && !isToday(date)) return 'bg-red-100 text-red-800 border-red-200'
    if (isToday(date)) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (isFuture(date)) return 'bg-purple-100 text-purple-800 border-purple-200'
    
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getAssignmentStatusText = (assignment: Assignment) => {
    if (assignment.progress.completed) return 'Completed'
    if (assignment.progress.hasStarted) return 'In Progress'
    
    const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
    if (!assignmentDate) return 'No Due Date'
    
    const date = parseISO(assignmentDate)
    if (isPast(date) && !isToday(date)) return 'Overdue'
    if (isToday(date)) return 'Due Today'
    if (isFuture(date)) return 'Upcoming'
    
    return 'Available'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarIcon className="h-6 w-6" />
        <h1 className="text-2xl md:text-3xl font-bold">My Created Assignments Calendar</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
        {/* Calendar */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>
              Click on any date to view assignments you've created. Dates with assignments are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                hasAssignment: assignmentDates
              }}
              modifiersClassNames={{
                hasAssignment: 'bg-primary/20 text-primary font-semibold'
              }}
              className="rounded-md w-full mx-auto [&_button]:rounded-md [&_td]:rounded-md [&_.rdp-day]:rounded-md [&_table]:w-full"
            />
          </CardContent>
        </Card>

        {/* Selected Date Assignments */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a Date'}
            </CardTitle>
            <CardDescription>
              {selectedDateAssignments.length === 0 
                ? 'No assignments created for this date'
                : `${selectedDateAssignments.length} assignment${selectedDateAssignments.length === 1 ? '' : 's'} created`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDateAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No assignments created on this date</p>
              </div>
            ) : (
              selectedDateAssignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{assignment.topic || 'Untitled Assignment'}</h4>
                    <Badge className={getAssignmentStatusColor(assignment)} variant="outline">
                      {getAssignmentStatusText(assignment)}
                    </Badge>
                  </div>
                  
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="capitalize rounded-md px-2 py-1 bg-primary/10 text-primary text-xs">{assignment.type?.toLowerCase() || 'assignment'}</span>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        {assignment.scheduledPublishAt && (
                            <span>Start: {format(parseISO(assignment.scheduledPublishAt), 'h:mm a')}</span>
                        )}
                        {assignment.dueDate && (
                            <span>Due: {format(parseISO(assignment.dueDate), 'h:mm a')}</span>
                        )}
                      </div>
                    </div>
                    
                    {assignment.stats && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex gap-3">
                          <span>{assignment.stats.totalAssignedStudents} students</span>
                          <span>{assignment.stats.completedCount} completed</span>
                        </div>
                        {assignment.stats.averageScore !== null && (
                          <span className="font-medium">Avg: {assignment.stats.averageScore}%</span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/assignments/${assignment.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Your Upcoming Assignments
          </CardTitle>
          <CardDescription>
            Assignments you created that are due in the next 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments
              .filter(assignment => {
                const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
                if (!assignmentDate || assignment.progress.completed) return false
                
                const date = parseISO(assignmentDate)
                const now = new Date()
                const weekFromNow = new Date()
                weekFromNow.setDate(now.getDate() + 7)
                
                return date >= now && date <= weekFromNow
              })
              .sort((a, b) => {
                const dateA = parseISO(a.dueDate || a.scheduledPublishAt || '')
                const dateB = parseISO(b.dueDate || b.scheduledPublishAt || '')
                return dateA.getTime() - dateB.getTime()
              })
              .slice(0, 6)
              .map((assignment) => {
                const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
                const date = assignmentDate ? parseISO(assignmentDate) : null
                
                return (
                  <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{assignment.topic || 'Untitled Assignment'}</h4>
                      <Badge className={getAssignmentStatusColor(assignment)} variant="outline">
                        {getAssignmentStatusText(assignment)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      {assignment.scheduledPublishAt && (
                        <div>
                           <span className="font-bold">START:</span> {format(new Date(assignment.scheduledPublishAt), 'h:mm a, MMM d')}
                        </div>
                      )}
                      
                      {date && (
                        <div>
                          <span className="font-bold">DUE:</span> {format(date, 'h:mm a, MMM d')}
                        </div>
                      )}
                      
                      {assignment.stats && (
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span>{assignment.stats.totalAssignedStudents} students</span>
                          <span>{assignment.stats.completedCount} completed</span>
                          {assignment.stats.averageScore !== null && (
                            <span className="font-medium">Avg: {assignment.stats.averageScore}%</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/assignments/${assignment.id}`}>
                        View Assignment
                      </Link>
                    </Button>
                  </div>
                )
              })}
            
            {assignments.filter(assignment => {
              const assignmentDate = assignment.dueDate || assignment.scheduledPublishAt
              if (!assignmentDate || assignment.progress.completed) return false
              
              const date = parseISO(assignmentDate)
              const now = new Date()
              const weekFromNow = new Date()
              weekFromNow.setDate(now.getDate() + 7)
              
              return date >= now && date <= weekFromNow
            }).length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No assignments you created are due in the next 7 days</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 