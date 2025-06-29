"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Clock, AlertTriangle, BookOpen, BarChart3, User } from "lucide-react"
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

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants = {
    CRITICAL: "destructive",
    WARNING: "secondary", 
    RECENT: "default"
  } as const

  const colors = {
    CRITICAL: "text-red-700 bg-red-50 border-red-200",
    WARNING: "text-orange-700 bg-orange-50 border-orange-200",
    RECENT: "text-blue-700 bg-blue-50 border-blue-200"
  }

  return (
    <Badge 
      variant={variants[severity as keyof typeof variants] || "default"}
      className={colors[severity as keyof typeof colors]}
    >
      {severity.toLowerCase()}
    </Badge>
  )
}

const StudentCard = ({ student }: { student: StudentNeedingHelp }) => {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            {student.student.username}
          </CardTitle>
          <SeverityBadge severity={student.severity} />
        </div>
        <CardDescription className="text-sm">
          Needing help for {student.daysNeedingHelp} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-muted-foreground">Completion Rate</div>
            <div className="text-lg font-semibold text-red-600">
              {student.completionRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground">Average Score</div>
            <div className="text-lg font-semibold text-orange-600">
              {student.averageScore.toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div>
          <div className="font-medium text-muted-foreground text-sm mb-1">Issues</div>
          <div className="flex flex-wrap gap-1">
            {student.reasons.map((reason, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="font-medium text-muted-foreground text-sm mb-1">Overdue Assignments</div>
          <div className="flex items-center gap-1 text-red-600">
            <BookOpen className="h-4 w-4" />
            <span className="font-semibold">{student.overdueAssignments}</span>
          </div>
        </div>

        {student.teacherNotes && (
          <div>
            <div className="font-medium text-muted-foreground text-sm mb-1">Teacher Notes</div>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {student.teacherNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const ClassSection = ({ classGroup }: { classGroup: ClassGroup }) => {
  const criticalCount = classGroup.students.filter(s => s.severity === 'CRITICAL').length
  const warningCount = classGroup.students.filter(s => s.severity === 'WARNING').length
  const recentCount = classGroup.students.filter(s => s.severity === 'RECENT').length

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5" />
          {classGroup.className}
        </CardTitle>
        <CardDescription className="flex items-center gap-4">
          <span>
            Teachers: {classGroup.teacherNames.join(", ")}
          </span>
          <span>•</span>
          <span className="flex items-center gap-2">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
            {warningCount > 0 && <Badge variant="secondary">{warningCount} Warning</Badge>}
            {recentCount > 0 && <Badge variant="default">{recentCount} Recent</Badge>}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classGroup.students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function StudentsNeedingHelpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<StudentNeedingHelp[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      {/* Class Groups */}
      {totalStudents === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Students Need Help</CardTitle>
            <CardDescription>
              Great! All students are performing well on their assignments.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {classGroups.map((classGroup) => (
            <ClassSection key={classGroup.classId} classGroup={classGroup} />
          ))}
        </div>
      )}
    </div>
  )
} 