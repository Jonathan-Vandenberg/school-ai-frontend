import cron from 'node-cron'
import { prisma, withTransaction } from '../db'
import { StudentsNeedingHelpService } from '../services/students-needing-help.service'

/**
 * Students Needing Help update scheduled task
 * Analyzes student performance and updates the StudentsNeedingHelp table
 * Runs every hour to keep data fresh
 */
export function createStudentsNeedingHelpTask() {
  console.log('Registering students needing help update task...')
  
  // Schedule the task to run every hour
  const task = cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running students needing help analysis task...')
      
      await withTransaction(async (tx) => {
        const currentDate = new Date()
        
        // Get all students
        const students = await tx.user.findMany({
          where: {
            customRole: 'STUDENT'
          },
          select: {
            id: true,
            username: true,
            email: true
          }
        })

        console.log(`Analyzing ${students.length} students...`)
        let studentsNeedingHelp = 0
        let studentsResolved = 0

        for (const student of students) {
          try {
            const analysis = await analyzeStudentPerformance(student, currentDate, tx)
            
            if (analysis.needsHelp) {
              await createOrUpdateHelpRecord(student, analysis, currentDate, tx)
              studentsNeedingHelp++
            } else {
              await markStudentAsResolved(student.id, tx)
              studentsResolved++
            }
          } catch (error) {
            console.error(`Error analyzing student ${student.username}:`, error)
          }
        }

        console.log(`Students needing help analysis completed:`)
        console.log(`- Students flagged for help: ${studentsNeedingHelp}`)
        console.log(`- Students resolved: ${studentsResolved}`)
      })
    } catch (error) {
      console.error('Error in students needing help task:', error)
    }
  })

  return task
}

/**
 * Analyze a student's performance to determine if they need help
 */
async function analyzeStudentPerformance(
  student: { id: string, username: string, email: string | null }, 
  currentDate: Date,
  tx: any
) {
  // Get all assignments for this student (both class and individual)
  const allAssignments = await tx.assignment.findMany({
    where: {
      isActive: true,
      OR: [
        {
          students: {
            some: {
              userId: student.id
            }
          }
        },
        {
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
  const progresses = await tx.studentAssignmentProgress.findMany({
    where: {
      studentId: student.id,
      assignmentId: {
        in: allAssignments.map((a: any) => a.id)
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
  const studentClasses = await tx.userClass.findMany({
    where: {
      userId: student.id
    },
    select: {
      classId: true
    }
  })

  const classIds = studentClasses.map((uc: any) => uc.classId)
  
  // Get teachers from assignments
  const teacherIds = Array.from(new Set(
    allAssignments
      .filter((a: any) => a.teacherId)
      .map((a: any) => a.teacherId!)
  ))

  // Calculate metrics
  const totalAssignments = allAssignments.length
  const overdueAssignments = allAssignments.filter((a: any) => 
    a.dueDate && new Date(a.dueDate) < currentDate
  ).length

  // Calculate which assignments are truly completed (all questions answered)
  const completedAssignmentIds = new Set<string>()
  
  for (const assignment of allAssignments) {
    const assignmentProgresses = progresses.filter((p: any) => 
      p.assignmentId === assignment.id && p.isComplete
    )
    
    // Count unique questions answered for this assignment
    const answeredQuestions = new Set(assignmentProgresses.map((p: any) => p.questionId))
    const totalQuestions = assignment.questions.length
    
    // Assignment is complete if all questions have been answered
    if (totalQuestions > 0 && answeredQuestions.size >= totalQuestions) {
      completedAssignmentIds.add(assignment.id)
    }
  }
  
  const completedAssignments = completedAssignmentIds.size

  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

  const completedProgresses = progresses.filter((p: any) => p.isComplete)
  const totalQuestions = completedProgresses.length
  const correctAnswers = completedProgresses.filter((p: any) => p.isCorrect).length
  const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

  // Determine if student needs help
  const reasons: string[] = []
  let needsHelpSince = currentDate
  
  // Check overdue assignments with low completion
  if (overdueAssignments > 0) {
    const overdueAssignmentIds = allAssignments
      .filter((a: any) => a.dueDate && new Date(a.dueDate) < currentDate)
      .map((a: any) => a.id)
    
    const completedOverdueCount = overdueAssignmentIds.filter((id: any) => 
      completedAssignmentIds.has(id)
    ).length
    
    const overdueCompletionRate = (completedOverdueCount / overdueAssignments) * 100
    
    if (overdueCompletionRate < 50) {
      reasons.push('Low completion rate on overdue assignments')
      
      // Find earliest overdue assignment
      const earliestOverdue = allAssignments
        .filter((a: any) => a.dueDate && new Date(a.dueDate) < currentDate)
        .sort((a: any, b: any) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]
      
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
      .filter((p: any) => p.isComplete && !p.isCorrect)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
    
    if (lowScoringProgress) {
      const progressDate = new Date(lowScoringProgress.createdAt)
      if (progressDate < needsHelpSince) {
        needsHelpSince = progressDate
      }
    }
  }

  // Check overall completion rate
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
    needsHelp,
    reasons,
    needsHelpSince,
    daysNeedingHelp,
    overdueAssignments,
    averageScore,
    completionRate,
    severity,
    classIds,
    teacherIds
  }
}

/**
 * Create or update help record for a student
 */
async function createOrUpdateHelpRecord(
  student: { id: string, username: string, email: string | null },
  analysis: any,
  currentDate: Date,
  tx: any
): Promise<void> {
  const existingRecord = await tx.studentsNeedingHelp.findFirst({
    where: { 
      studentId: student.id,
      isResolved: false 
    }
  })

  if (existingRecord) {
    // Update existing record
    await tx.studentsNeedingHelp.update({
      where: { id: existingRecord.id },
      data: {
        reasons: analysis.reasons,
        daysNeedingHelp: analysis.daysNeedingHelp,
        overdueAssignments: analysis.overdueAssignments,
        averageScore: analysis.averageScore,
        completionRate: analysis.completionRate,
        severity: analysis.severity,
        isResolved: false,
        updatedAt: currentDate
      }
    })
  } else {
    // Create new record
    const record = await tx.studentsNeedingHelp.create({
      data: {
        studentId: student.id,
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
      await tx.studentsNeedingHelpClass.create({
        data: {
          studentNeedingHelpId: record.id,
          classId: classId
        }
      })
    }

    // Link to teachers
    for (const teacherId of analysis.teacherIds) {
      await tx.studentsNeedingHelpTeacher.create({
        data: {
          studentNeedingHelpId: record.id,
          teacherId: teacherId
        }
      })
    }
  }
}

/**
 * Mark student as resolved if they no longer need help
 */
async function markStudentAsResolved(studentId: string, tx: any): Promise<void> {
  await tx.studentsNeedingHelp.updateMany({
    where: {
      studentId,
      isResolved: false
    },
    data: {
      isResolved: true,
      resolvedAt: new Date()
    }
  })
}

/**
 * Manually run the students needing help analysis
 */
export async function runStudentsNeedingHelpAnalysis() {
  console.log('Running manual students needing help analysis...')
  
  return await withTransaction(async (tx) => {
    const currentDate = new Date()
    
    const students = await tx.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true, email: true }
    })

    let studentsNeedingHelp = 0
    let studentsResolved = 0

    for (const student of students) {
      const analysis = await analyzeStudentPerformance(student, currentDate, tx)
      
      if (analysis.needsHelp) {
        await createOrUpdateHelpRecord(student, analysis, currentDate, tx)
        studentsNeedingHelp++
      } else {
        await markStudentAsResolved(student.id, tx)
        studentsResolved++
      }
    }

    return {
      studentsNeedingHelp,
      studentsResolved,
      totalStudents: students.length
    }
  })
} 