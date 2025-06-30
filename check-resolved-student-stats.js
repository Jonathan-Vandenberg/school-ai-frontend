const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkResolvedStudentStats() {
  try {
    console.log('✅ Checking stats of students who no longer need help...\n')

    // Get resolved help records
    const resolvedRecords = await prisma.studentsNeedingHelp.findMany({
      where: {
        isResolved: true
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        resolvedAt: 'desc'
      }
    })

    console.log(`📊 Found ${resolvedRecords.length} resolved help records`)

    if (resolvedRecords.length === 0) {
      console.log('No resolved students found. Let\'s check students who are NOT in the help system at all...\n')
      
      // Get students who are not in the help system
      const allStudents = await prisma.user.findMany({
        where: { customRole: 'STUDENT' },
        select: { id: true, username: true, email: true }
      })

      const studentsInHelpSystem = await prisma.studentsNeedingHelp.findMany({
        where: { isResolved: false },
        select: { studentId: true }
      })

      const helpStudentIds = new Set(studentsInHelpSystem.map(s => s.studentId))
      const studentsNotNeedingHelp = allStudents.filter(student => !helpStudentIds.has(student.id))

      console.log(`👥 Students NOT in help system: ${studentsNotNeedingHelp.length}`)
      
      // Analyze a few of these students
      for (let i = 0; i < Math.min(3, studentsNotNeedingHelp.length); i++) {
        const student = studentsNotNeedingHelp[i]
        console.log(`\n🔍 Analyzing ${student.username}:`)
        await analyzeStudentPerformance(student)
      }
    } else {
      // Show resolved students
      console.log('\n📋 Recently resolved students:')
      console.log('─'.repeat(80))
      
      for (const record of resolvedRecords.slice(0, 5)) {
        console.log(`\n👤 ${record.student.username} (Resolved at: ${record.resolvedAt?.toISOString()})`)
        console.log(`   Last help reason: ${record.reasons.join(', ')}`)
        console.log(`   Was needing help for: ${record.daysNeedingHelp} days`)
        console.log(`   Last stats - Score: ${record.averageScore}%, Completion: ${record.completionRate}%`)
        
        // Get current performance
        console.log('   Current performance:')
        await analyzeStudentPerformance(record.student)
      }
    }

  } catch (error) {
    console.error('❌ Error checking resolved student stats:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function analyzeStudentPerformance(student) {
  try {
    const currentDate = new Date()

    // Get all assignments for this student
    const allAssignments = await prisma.assignment.findMany({
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
        questions: {
          select: {
            id: true
          }
        }
      }
    })

    // Get student's progress
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
        isCorrect: true
      }
    })

    // Calculate overdue assignments (excluding completed ones)
    const overdueAssignments = await prisma.assignment.count({
      where: {
        dueDate: { lt: currentDate },
        isActive: true,
        OR: [
          {
            classes: {
              some: {
                class: {
                  users: {
                    some: { userId: student.id }
                  }
                }
              }
            }
          },
          {
            students: {
              some: { userId: student.id }
            }
          }
        ],
        NOT: {
          questions: {
            every: {
              progresses: {
                some: {
                  studentId: student.id,
                  isComplete: true
                }
              }
            }
          }
        }
      }
    })

    // Calculate completion rate
    const completedAssignmentIds = new Set()
    
    for (const assignment of allAssignments) {
      const assignmentProgresses = progresses.filter(p => 
        p.assignmentId === assignment.id && p.isComplete
      )
      
      const answeredQuestions = new Set(assignmentProgresses.map(p => p.questionId))
      const totalQuestions = assignment.questions.length
      
      if (totalQuestions > 0 && answeredQuestions.size >= totalQuestions) {
        completedAssignmentIds.add(assignment.id)
      }
    }
    
    const completedAssignments = completedAssignmentIds.size
    const totalAssignments = allAssignments.length
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

    // Calculate average score
    const completedProgresses = progresses.filter(p => p.isComplete)
    const totalQuestions = completedProgresses.length
    const correctAnswers = completedProgresses.filter(p => p.isCorrect).length
    const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    // Determine if student should need help
    const reasons = []
    let shouldNeedHelp = false

    if (completionRate < 50) {
      reasons.push('Low overall completion rate')
      shouldNeedHelp = true
    }
    
    if (averageScore < 50) {
      reasons.push('Low average score')
      shouldNeedHelp = true
    }

    if (overdueAssignments > 0) {
      reasons.push(`${overdueAssignments} overdue assignment${overdueAssignments === 1 ? '' : 's'}`)
      shouldNeedHelp = true
    }

    console.log(`     📊 Total assignments: ${totalAssignments}`)
    console.log(`     ✅ Completed: ${completedAssignments} (${completionRate.toFixed(1)}%)`)
    console.log(`     📈 Average score: ${averageScore.toFixed(1)}%`)
    console.log(`     ⏰ Overdue assignments: ${overdueAssignments}`)
    console.log(`     🎯 Should need help: ${shouldNeedHelp ? 'YES' : 'NO'}`)
    
    if (reasons.length > 0) {
      console.log(`     ⚠️  Issues: ${reasons.join(', ')}`)
    }

    return {
      totalAssignments,
      completedAssignments,
      completionRate,
      averageScore,
      overdueAssignments,
      shouldNeedHelp,
      reasons
    }

  } catch (error) {
    console.error(`❌ Error analyzing ${student.username}:`, error)
    return null
  }
}

checkResolvedStudentStats() 