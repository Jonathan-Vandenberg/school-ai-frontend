"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StudentHelpCard } from "@/components/students/student-help-card"
import { ArrowLeft, Users, Clock, AlertTriangle, BookOpen, BarChart3 } from "lucide-react"
import Link from "next/link"

interface StudentNeedingHelp {
  id: string
  studentId: string
  reasons: string[]
  needsHelpSince: string
  daysNeedingHelp: number
  overdueAssignments: number
  averageScore: number
  completionRate: number
  isResolved: boolean
  severity: 'CRITICAL' | 'WARNING' | 'RECENT'
  teacherNotes?: string
  actionsTaken?: string[]
  student: {
    id: string
    username: string
    email?: string
  }
  classes: Array<{
    class: {
      id: string
      name: string
    }
  }>
  teachers: Array<{
    teacher: {
      id: string
      username: string
    }
  }>
}

interface ClassGroup {
  classId: string
  className: string
  students: StudentNeedingHelp[]
  teacherIds: string[]
  teacherNames: string[]
}



export default function StudentsNeedingHelpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<StudentNeedingHelp[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get filtered students based on selected class
  const filteredStudents = selectedClassId === "all" 
    ? students 
    : students.filter(student => 
        student.classes.some(({ class: cls }) => cls.id === selectedClassId)
      )

  // Get selected class info
  const selectedClass = selectedClassId === "all" 
    ? null 
    : classGroups.find(group => group.classId === selectedClassId)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (session.user?.role !== "ADMIN" && session.user?.role !== "TEACHER") {
      router.push("/dashboard")
      return
    }

    fetchStudentsNeedingHelp()
  }, [session, status, router])

  const fetchStudentsNeedingHelp = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/students-needing-help')
      if (!response.ok) {
        throw new Error('Failed to fetch students needing help')
      }

      const data = await response.json()
      setStudents(data.students || [])
      
      // Group students by class
      const groups = groupStudentsByClass(data.students || [])
      setClassGroups(groups)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching students needing help:', err)
    } finally {
      setLoading(false)
    }
  }

  const groupStudentsByClass = (students: StudentNeedingHelp[]): ClassGroup[] => {
    const classMap = new Map<string, ClassGroup>()

    students.forEach(student => {
      student.classes.forEach(({ class: cls }) => {
        if (!classMap.has(cls.id)) {
          classMap.set(cls.id, {
            classId: cls.id,
            className: cls.name,
            students: [],
            teacherIds: [],
            teacherNames: []
          })
        }

        const group = classMap.get(cls.id)!
        if (!group.students.find(s => s.id === student.id)) {
          group.students.push(student)
        }

        // Add teachers
        student.teachers.forEach(({ teacher }) => {
          if (!group.teacherIds.includes(teacher.id)) {
            group.teacherIds.push(teacher.id)
            group.teacherNames.push(teacher.username)
          }
        })
      })
    })

    // Sort classes by number of critical students (descending)
    return Array.from(classMap.values()).sort((a, b) => {
      const aCritical = a.students.filter(s => s.severity === 'CRITICAL').length
      const bCritical = b.students.filter(s => s.severity === 'CRITICAL').length
      return bCritical - aCritical
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-80 mb-2" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-64" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Students Needing Help</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalStudents = students.length
  const criticalStudents = students.filter(s => s.severity === 'CRITICAL').length
  const warningStudents = students.filter(s => s.severity === 'WARNING').length
  const recentStudents = students.filter(s => s.severity === 'RECENT').length

  const handleStudentClick = (studentId: string) => {
    router.push(`/dashboard/students/${studentId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Students Needing Help</h1>
          <p className="text-muted-foreground">
            Students who need attention based on performance metrics
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalStudents}</div>
            <div className="text-xs text-muted-foreground">
              Needing help for 14+ days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{warningStudents}</div>
            <div className="text-xs text-muted-foreground">
              Needing help for 7-14 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{recentStudents}</div>
            <div className="text-xs text-muted-foreground">
              Needing help for ≤7 days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Filter Dropdown */}
      {totalStudents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Filter by Class
            </CardTitle>
            <CardDescription>
              Select a class to view students needing help, or view all classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes ({students.length} students)</SelectItem>
                {classGroups.map((classGroup) => (
                  <SelectItem key={classGroup.classId} value={classGroup.classId}>
                    {classGroup.className} ({classGroup.students.length} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Selected Class Info */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedClass.className}
            </CardTitle>
            <CardDescription>
              Teachers: {selectedClass.teacherNames.join(", ")} • {filteredStudents.length} students needing help
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Students Grid */}
      {totalStudents === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Students Need Help</CardTitle>
            <CardDescription>
              Great! All students are performing well on their assignments.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Students in Selected Class</CardTitle>
            <CardDescription>
              No students in this class currently need help.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedClassId === "all" ? "All Students" : selectedClass?.className} 
              ({filteredStudents.length} students)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStudents
                .sort((a, b) => {
                  // Sort by severity (Critical > Warning > Recent)
                  const severityOrder = { CRITICAL: 0, WARNING: 1, RECENT: 2 }
                  return severityOrder[a.severity] - severityOrder[b.severity]
                })
                .map((student) => (
                  <StudentHelpCard 
                    key={student.id} 
                    student={student} 
                    onClick={() => handleStudentClick(student.studentId)}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 