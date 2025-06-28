#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeStudentStats() {
  console.log('🚀 Starting student statistics initialization...')

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true }
    })

    console.log(`📊 Found ${students.length} students to process`)

    for (const student of students) {
      console.log(`\n📝 Processing student: ${student.username} (${student.id})`)

      // Get all assignments accessible to this student
      const assignments = await prisma.assignment.findMany({
        where: {
          OR: [
            // Class assignments - student is in the class
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
            // Individual assignments - student is directly assigned
            {
              students: {
                some: { userId: student.id }
              }
            }
          ]
        },
        include: {
          questions: { select: { id: true } },
          progresses: {
            where: { 
              studentId: student.id,
              isComplete: true 
            },
            select: {
              isCorrect: true,
              questionId: true,
              assignmentId: true
            }
          }
        }
      })

      // Calculate statistics
      let completedAssignments = 0
      let inProgressAssignments = 0
      let totalQuestions = 0
      let totalAnswers = 0
      let totalCorrectAnswers = 0

      const assignmentProgress = new Map<string, { total: number, completed: number, correct: number }>()

      assignments.forEach(assignment => {
        const assignmentTotalQuestions = assignment.questions.length
        const assignmentCompletedQuestions = assignment.progresses.length
        const assignmentCorrectAnswers = assignment.progresses.filter(p => p.isCorrect).length

        totalQuestions += assignmentTotalQuestions
        totalAnswers += assignmentCompletedQuestions
        totalCorrectAnswers += assignmentCorrectAnswers

        assignmentProgress.set(assignment.id, {
          total: assignmentTotalQuestions,
          completed: assignmentCompletedQuestions,
          correct: assignmentCorrectAnswers
        })

        // Check if assignment is completed (all questions answered)
        if (assignmentTotalQuestions > 0 && assignmentCompletedQuestions >= assignmentTotalQuestions) {
          completedAssignments++
        } else if (assignmentCompletedQuestions > 0) {
          inProgressAssignments++
        }
      })

      // Calculate rates
      const completionRate = assignments.length > 0 
        ? (completedAssignments / assignments.length) * 100 
        : 0

      const accuracyRate = totalAnswers > 0 
        ? (totalCorrectAnswers / totalAnswers) * 100 
        : 0

      // Calculate average score for completed assignments only
      let averageScore = 0
      if (completedAssignments > 0) {
        const completedScores: number[] = []
        assignmentProgress.forEach((progress, assignmentId) => {
          if (progress.total > 0 && progress.completed >= progress.total) {
            const score = (progress.correct / progress.total) * 100
            completedScores.push(score)
          }
        })
        
        if (completedScores.length > 0) {
          averageScore = completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length
        }
      }

      // Upsert student stats
      await prisma.studentStats.upsert({
        where: { studentId: student.id },
        update: {
          totalAssignments: assignments.length,
          completedAssignments,
          inProgressAssignments,
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          completionRate: parseFloat(completionRate.toFixed(2)),
          lastUpdated: new Date()
        },
        create: {
          studentId: student.id,
          totalAssignments: assignments.length,
          completedAssignments,
          inProgressAssignments,
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          completionRate: parseFloat(completionRate.toFixed(2))
        }
      })

      console.log(`✅ Updated stats for ${student.username}:`)
      console.log(`   📚 Total assignments: ${assignments.length}`)
      console.log(`   ✅ Completed: ${completedAssignments}`)
      console.log(`   🔄 In progress: ${inProgressAssignments}`)
      console.log(`   🎯 Average score: ${averageScore.toFixed(1)}%`)
      console.log(`   📊 Completion rate: ${completionRate.toFixed(1)}%`)
      console.log(`   🎯 Accuracy rate: ${accuracyRate.toFixed(1)}%`)
    }

    console.log('\n🎉 Student statistics initialization completed successfully!')

  } catch (error) {
    console.error('❌ Error initializing student statistics:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
initializeStudentStats().catch(console.error) 