const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkGoodStudents() {
  try {
    console.log('🌟 Checking students who are performing well (not in help system)...\n')

    // Get students who are NOT in the help system
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
    
    const studentPerformances = []

    // Analyze all students not needing help
    for (const student of studentsNotNeedingHelp) {
      const performance = await analyzeStudentPerformance(student)
      if (performance) {
        studentPerformances.push({
          username: student.username,
          ...performance
        })
      }
    }

    // Sort by completion rate and average score
    studentPerformances.sort((a, b) => {
      if (a.totalAssignments === 0 && b.totalAssignments === 0) return 0
      if (a.totalAssignments === 0) return 1
      if (b.totalAssignments === 0) return -1
      return (b.completionRate + b.averageScore) - (a.completionRate + a.averageScore)
    })

    console.log('\n📊 Performance Summary:')
    console.log('─'.repeat(100))
    console.log('Username        | Assignments | Completed | Completion% | Avg Score% | Overdue | Should Need Help')
    console.log('─'.repeat(100))

    studentPerformances.forEach(perf => {
      const username = perf.username.padEnd(15, ' ')
      const assignments = perf.totalAssignments.toString().padStart(11, ' ')
      const completed = perf.completedAssignments.toString().padStart(9, ' ')
      const completion = perf.completionRate.toFixed(1).padStart(11, ' ')
      const score = perf.averageScore.toFixed(1).padStart(10, ' ')
      const overdue = perf.overdueAssignments.toString().padStart(7, ' ')
      const shouldHelp = (perf.shouldNeedHelp ? 'YES' : 'NO').padStart(16, ' ')
      
      console.log(`${username} |${assignments} |${completed} |${completion}% |${score}% |${overdue} |${shouldHelp}`)
    })

    // Count categories
    const hasAssignments = studentPerformances.filter(s => s.totalAssignments > 0)
    const noAssignments = studentPerformances.filter(s => s.totalAssignments === 0)
    const goodPerformers = hasAssignments.filter(s => !s.shouldNeedHelp)
    const shouldNeedHelp = studentPerformances.filter(s => s.shouldNeedHelp)

    console.log('\n📈 Categories:')
    console.log('─'.repeat(50))
    console.log(`🎯 Students with assignments: ${hasAssignments.length}`)
    console.log(`🌟 Good performers (no help needed): ${goodPerformers.length}`)
    console.log(`⚠️  Should need help but not flagged: ${shouldNeedHelp.length}`)
    console.log(`📭 No assignments assigned: ${noAssignments.length}`)

    if (goodPerformers.length > 0) {
      console.log('\n🌟 Top performing students:')
      goodPerformers.slice(0, 5).forEach(perf => {
        console.log(`  ${perf.username}: ${perf.completionRate.toFixed(1)}% completion, ${perf.averageScore.toFixed(1)}% average score`)
      })
    }

    if (shouldNeedHelp.length > 0) {
      console.log('\n⚠️  Students who should be flagged for help but aren\'t:')
      shouldNeedHelp.slice(0, 5).forEach(perf => {
        console.log(`  ${perf.username}: ${perf.reasons.join(', ')}`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking good students:', error)
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

    // Determine if student should need help (using same logic as cron job)
    const reasons = []
    let shouldNeedHelp = false

    if (totalAssignments > 0) {  // Only check students who have assignments
      if (completionRate < 50) {
        reasons.push('Low overall completion rate')
        shouldNeedHelp = true
      }
      
      if (averageScore < 50 && totalQuestions > 0) {
        reasons.push('Low average score')
        shouldNeedHelp = true
      }

      if (overdueAssignments > 0) {
        reasons.push(`${overdueAssignments} overdue assignment${overdueAssignments === 1 ? '' : 's'}`)
        shouldNeedHelp = true
      }
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

checkGoodStudents() 