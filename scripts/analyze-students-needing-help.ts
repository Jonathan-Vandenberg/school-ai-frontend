#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface StudentAnalysis {
  studentId: string
  student: {
    id: string
    username: string
    email: string | null
  }
  totalAssignments: number
  overdueAssignments: number
  completedAssignments: number
  completionRate: number
  totalQuestions: number
  correctAnswers: number
  averageScore: number
  classIds: string[]
  teacherIds: string[]
  reasons: string[]
  needsHelp: boolean
  severity: 'CRITICAL' | 'WARNING' | 'RECENT'
  needsHelpSince: Date
  daysNeedingHelp: number
}

async function analyzeStudentsNeedingHelp() {
  console.log('🔍 Starting analysis of students needing help...')
  
  const currentDate = new Date()
  const analyses: StudentAnalysis[] = []

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: {
        customRole: 'STUDENT'
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })

    console.log(`📊 Found ${students.length} students to analyze`)

    for (const student of students) {
      console.log(`\n🔍 Analyzing student: ${student.username} (${student.id})`)
      
      try {
        const analysis = await analyzeStudent(student, currentDate)
        analyses.push(analysis)
        
        if (analysis.needsHelp) {
          console.log(`  ⚠️  ${student.username} needs help: ${analysis.reasons.join(', ')}`)
          console.log(`      Completion Rate: ${analysis.completionRate.toFixed(1)}%`)
          console.log(`      Average Score: ${analysis.averageScore.toFixed(1)}%`)
          console.log(`      Overdue Assignments: ${analysis.overdueAssignments}`)
          console.log(`      Severity: ${analysis.severity}`)
        } else {
          console.log(`  ✅ ${student.username} is performing well`)
        }
      } catch (error) {
        console.error(`  ❌ Error analyzing ${student.username}:`, error)
      }
    }

    // Clear existing records
    console.log('\n🧹 Clearing existing StudentsNeedingHelp records...')
    await prisma.studentsNeedingHelpTeacher.deleteMany({})
    await prisma.studentsNeedingHelpClass.deleteMany({})
    await prisma.studentsNeedingHelp.deleteMany({})

    // Insert new records
    const studentsNeedingHelp = analyses.filter(a => a.needsHelp)
    console.log(`\n💾 Inserting ${studentsNeedingHelp.length} students needing help...`)

    for (const analysis of studentsNeedingHelp) {
      await insertStudentNeedingHelp(analysis)
    }

    // Print summary
    console.log('\n📈 ANALYSIS SUMMARY')
    console.log('==================')
    console.log(`Total Students Analyzed: ${analyses.length}`)
    console.log(`Students Needing Help: ${studentsNeedingHelp.length}`)
    console.log(`Critical (>14 days): ${studentsNeedingHelp.filter(s => s.severity === 'CRITICAL').length}`)
    console.log(`Warning (7-14 days): ${studentsNeedingHelp.filter(s => s.severity === 'WARNING').length}`)
    console.log(`Recent (≤7 days): ${studentsNeedingHelp.filter(s => s.severity === 'RECENT').length}`)

    console.log('\n📋 DETAILED BREAKDOWN')
    console.log('====================')
    
    const severityGroups = {
      CRITICAL: studentsNeedingHelp.filter(s => s.severity === 'CRITICAL'),
      WARNING: studentsNeedingHelp.filter(s => s.severity === 'WARNING'),
      RECENT: studentsNeedingHelp.filter(s => s.severity === 'RECENT')
    }

    for (const [severity, students] of Object.entries(severityGroups)) {
      if (students.length > 0) {
        console.log(`\n${severity} (${students.length} students):`)
        students.forEach(s => {
          console.log(`  - ${s.student.username}: ${s.reasons.join(', ')} (${s.daysNeedingHelp} days)`)
        })
      }
    }

    console.log('\n✅ Analysis complete!')

  } catch (error) {
    console.error('❌ Error during analysis:', error)
    throw error
  }
}

async function analyzeStudent(
  student: { id: string, username: string, email: string | null }, 
  currentDate: Date
): Promise<StudentAnalysis> {
  
  // Get all assignments for this student (both class and individual)
  const allAssignments = await prisma.assignment.findMany({
    where: {
      isActive: true,
      OR: [
        {
          // Individual assignments
          students: {
            some: {
              userId: student.id
            }
          }
        },
        {
          // Class assignments
          classes: {
            some: {
              class: {
                users: {
                  some: {
                    userId: student.id
                  }
                }
              }
            }
          }
        }
      ]
    },
    select: {
      id: true,
      dueDate: true,
      topic: true,
      teacherId: true,
      questions: {
        select: {
          id: true
        }
      }
    }
  })

  // Get student's progress on all their assignments
  const progresses = await prisma.studentAssignmentProgress.findMany({
    where: {
      studentId: student.id,
      assignmentId: {
        in: allAssignments.map(a => a.id)
      }
    },
    select: {
      id: true,
      assignmentId: true,
      questionId: true,
      isComplete: true,
      isCorrect: true,
      createdAt: true
    }
  })

  // Get student's classes
  const studentClasses = await prisma.userClass.findMany({
    where: {
      userId: student.id
    },
    select: {
      classId: true
    }
  })

  const classIds = studentClasses.map(uc => uc.classId)
  
  // Get teachers from assignments
  const teacherIds = Array.from(new Set(
    allAssignments
      .filter(a => a.teacherId)
      .map(a => a.teacherId!)
  ))

  // Calculate metrics
  const totalAssignments = allAssignments.length
  const overdueAssignments = allAssignments.filter(a => 
    a.dueDate && new Date(a.dueDate) < currentDate
  ).length

  // Calculate which assignments are truly completed (all questions answered)
  const completedAssignmentIds = new Set<string>()
  
  for (const assignment of allAssignments) {
    const assignmentProgresses = progresses.filter(p => 
      p.assignmentId === assignment.id && p.isComplete
    )
    
    // Count unique questions answered for this assignment
    const answeredQuestions = new Set(assignmentProgresses.map(p => p.questionId))
    const totalQuestions = assignment.questions.length
    
    // Assignment is complete if all questions have been answered
    if (totalQuestions > 0 && answeredQuestions.size >= totalQuestions) {
      completedAssignmentIds.add(assignment.id)
    }
  }
  
  const completedAssignments = completedAssignmentIds.size

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

  const completedProgresses = progresses.filter(p => p.isComplete)
  const totalQuestions = completedProgresses.length
  const correctAnswers = completedProgresses.filter(p => p.isCorrect).length
  const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

  // Determine if student needs help
  const reasons: string[] = []
  let needsHelpSince = currentDate
  
  // Check overdue assignments with low completion
  if (overdueAssignments > 0) {
    const overdueAssignmentIds = allAssignments
      .filter(a => a.dueDate && new Date(a.dueDate) < currentDate)
      .map(a => a.id)
    
    const completedOverdueCount = overdueAssignmentIds.filter(id => 
      completedAssignmentIds.has(id)
    ).length
    
    const overdueCompletionRate = (completedOverdueCount / overdueAssignments) * 100
    
    if (overdueCompletionRate < 50) {
      reasons.push('Low completion rate on overdue assignments')
      
      // Find earliest overdue assignment
      const earliestOverdue = allAssignments
        .filter(a => a.dueDate && new Date(a.dueDate) < currentDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]
      
      if (earliestOverdue?.dueDate) {
        needsHelpSince = new Date(earliestOverdue.dueDate)
      }
    }
  }

  // Check low scores
  if (averageScore < 50 && totalQuestions >= 3) {
    reasons.push('Low average score on completed assignments')
    
    // Find earliest low-scoring answer
    const lowScoringProgress = progresses
      .filter(p => p.isComplete && !p.isCorrect)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    
    if (lowScoringProgress) {
      const progressDate = new Date(lowScoringProgress.createdAt)
      if (progressDate < needsHelpSince) {
        needsHelpSince = progressDate
      }
    }
  }

  // Check overall completion rate (only flag if really low AND they have several assignments)
  if (completionRate < 50 && totalAssignments >= 3) {
    reasons.push('Low overall completion rate')
  }

  const needsHelp = reasons.length > 0
  const daysNeedingHelp = needsHelp ? 
    Math.max(1, Math.ceil((currentDate.getTime() - needsHelpSince.getTime()) / (1000 * 60 * 60 * 24))) : 0

  let severity: 'CRITICAL' | 'WARNING' | 'RECENT' = 'RECENT'
  if (daysNeedingHelp > 14) {
    severity = 'CRITICAL'
  } else if (daysNeedingHelp > 7) {
    severity = 'WARNING'
  }

  return {
    studentId: student.id,
    student,
    totalAssignments,
    overdueAssignments,
    completedAssignments,
    completionRate,
    totalQuestions,
    correctAnswers,
    averageScore,
    classIds,
    teacherIds,
    reasons,
    needsHelp,
    severity,
    needsHelpSince,
    daysNeedingHelp
  }
}

async function insertStudentNeedingHelp(analysis: StudentAnalysis) {
  try {
    const record = await prisma.studentsNeedingHelp.create({
      data: {
        studentId: analysis.studentId,
        reasons: analysis.reasons,
        needsHelpSince: analysis.needsHelpSince,
        daysNeedingHelp: analysis.daysNeedingHelp,
        overdueAssignments: analysis.overdueAssignments,
        averageScore: analysis.averageScore,
        completionRate: analysis.completionRate,
        severity: analysis.severity,
        isResolved: false
      }
    })

    // Link to classes
    for (const classId of analysis.classIds) {
      await prisma.studentsNeedingHelpClass.create({
        data: {
          studentNeedingHelpId: record.id,
          classId: classId
        }
      })
    }

    // Link to teachers
    for (const teacherId of analysis.teacherIds) {
      await prisma.studentsNeedingHelpTeacher.create({
        data: {
          studentNeedingHelpId: record.id,
          teacherId: teacherId
        }
      })
    }

    console.log(`  💾 Inserted record for ${analysis.student.username}`)
  } catch (error) {
    console.error(`  ❌ Error inserting record for ${analysis.student.username}:`, error)
  }
}

// Run the analysis
async function main() {
  try {
    await analyzeStudentsNeedingHelp()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
} 