import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, User } from "lucide-react"

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
  classes?: Array<{
    class: {
      id: string
      name: string
    }
  }>
  teachers?: Array<{
    teacher: {
      id: string
      username: string
    }
  }>
}

// For class detail page compatibility
interface UserWithHelp {
  id: string
  username: string
  email: string
  customRole: string
  needsHelp?: boolean
  helpInfo?: {
    reasons: string[]
    needsHelpSince: string
    daysNeedingHelp: number
    severity: string
    overdueAssignments: number
    averageScore: number
    completionRate: number
    teacherNotes?: string
  }
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

export const StudentHelpCard = ({ student }: { student: StudentNeedingHelp | UserWithHelp }) => {
  // Normalize data from different interfaces
  const studentData = 'student' in student ? {
    username: student.student.username,
    reasons: student.reasons,
    daysNeedingHelp: student.daysNeedingHelp,
    severity: student.severity,
    averageScore: student.averageScore,
    completionRate: student.completionRate,
    overdueAssignments: student.overdueAssignments,
    teacherNotes: student.teacherNotes
  } : {
    username: student.username,
    reasons: student.helpInfo?.reasons || [],
    daysNeedingHelp: student.helpInfo?.daysNeedingHelp || 0,
    severity: student.helpInfo?.severity || 'RECENT',
    averageScore: student.helpInfo?.averageScore || 0,
    completionRate: student.helpInfo?.completionRate || 0,
    overdueAssignments: student.helpInfo?.overdueAssignments || 0,
    teacherNotes: student.helpInfo?.teacherNotes
  }

  // Determine the primary issue and show only relevant percentage
  const hasLowCompletion = studentData.reasons.some(reason => 
    reason.toLowerCase().includes('completion') || reason.toLowerCase().includes('not completing')
  )
  const hasLowScore = studentData.reasons.some(reason => 
    reason.toLowerCase().includes('accuracy') || reason.toLowerCase().includes('low') || reason.toLowerCase().includes('score')
  )

  // Show both metrics if student has problems in both areas
  const showBothMetrics = hasLowCompletion && hasLowScore

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            {studentData.username}
          </CardTitle>
          <SeverityBadge severity={studentData.severity} />
        </div>
        <CardDescription className="text-sm">
          Needing help for {studentData.daysNeedingHelp} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showBothMetrics ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-muted-foreground text-xs">Completion Rate</div>
              <div className="text-2xl font-bold text-red-600">
                {studentData.completionRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-muted-foreground text-xs">Average Score</div>
              <div className="text-2xl font-bold text-orange-600">
                {studentData.averageScore.toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="font-medium text-muted-foreground text-sm">
              {hasLowCompletion ? 'Completion Rate' : 'Average Score'}
            </div>
            <div className={`text-3xl font-bold ${hasLowCompletion ? 'text-red-600' : 'text-orange-600'}`}>
              {hasLowCompletion ? studentData.completionRate.toFixed(1) : studentData.averageScore.toFixed(1)}%
            </div>
          </div>
        )}
        
        <div>
          <div className="font-medium text-muted-foreground text-sm mb-1">Issues</div>
          <div className="flex flex-wrap gap-1">
            {studentData.reasons.map((reason, index) => (
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
            <span className="font-semibold">{studentData.overdueAssignments}</span>
          </div>
        </div>

        {studentData.teacherNotes && (
          <div>
            <div className="font-medium text-muted-foreground text-sm mb-1">Teacher Notes</div>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {studentData.teacherNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 