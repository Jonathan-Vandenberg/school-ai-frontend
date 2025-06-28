#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeAssignmentStats() {
  console.log('🚀 Starting assignment statistics initialization...')

  try {
    // Get all assignments
    const assignments = await prisma.assignment.findMany({
      include: {
        questions: { select: { id: true } },
        progresses: {
          where: { isComplete: true },
          select: {
            studentId: true,
            isCorrect: true,
            questionId: true
          }
        },
        classes: {
          include: {
            class: {
              include: {
                users: { select: { userId: true } }
              }
            }
          }
        },
        students: { select: { userId: true } }
      }
    })

    console.log(`📊 Found ${assignments.length} assignments to process`)

    for (const assignment of assignments) {
      console.log(`\n📝 Processing assignment: ${assignment.topic || 'Untitled'} (${assignment.id})`)

      // Calculate total students in scope
      const classStudentIds = assignment.classes.flatMap(ac => 
        ac.class.users.map(u => u.userId)
      )
      const individualStudentIds = assignment.students.map(s => s.userId)
      const allStudentIds = [...new Set([...classStudentIds, ...individualStudentIds])]

      const totalStudents = allStudentIds.length
      const totalQuestions = assignment.questions.length
      const totalAnswers = assignment.progresses.length
      const totalCorrectAnswers = assignment.progresses.filter(p => p.isCorrect).length

      console.log(`   👥 Students in scope: ${totalStudents}`)
      console.log(`   ❓ Total questions: ${totalQuestions}`)
      console.log(`   💬 Total answers: ${totalAnswers}`)
      console.log(`   ✅ Correct answers: ${totalCorrectAnswers}`)

      // Calculate student completion
      const studentProgress = new Map<string, { completed: number, correct: number }>()
      
      assignment.progresses.forEach(progress => {
        if (!studentProgress.has(progress.studentId)) {
          studentProgress.set(progress.studentId, { completed: 0, correct: 0 })
        }
        const student = studentProgress.get(progress.studentId)!
        student.completed++
        if (progress.isCorrect) student.correct++
      })

      let completedStudents = 0
      let inProgressStudents = 0
      let totalScoreSum = 0

      studentProgress.forEach((progress, studentId) => {
        if (progress.completed >= totalQuestions) {
          completedStudents++
          // Calculate score for this completed student
          const score = totalQuestions > 0 ? (progress.correct / totalQuestions) * 100 : 0
          totalScoreSum += score
        } else if (progress.completed > 0) {
          inProgressStudents++
        }
      })

      const notStartedStudents = totalStudents - completedStudents - inProgressStudents
      const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0
      const accuracyRate = totalAnswers > 0 ? (totalCorrectAnswers / totalAnswers) * 100 : 0
      const averageScore = completedStudents > 0 ? totalScoreSum / completedStudents : 0

      console.log(`   📊 Completed students: ${completedStudents}`)
      console.log(`   🔄 In progress students: ${inProgressStudents}`)
      console.log(`   ⭕ Not started students: ${notStartedStudents}`)
      console.log(`   📈 Completion rate: ${completionRate.toFixed(1)}%`)
      console.log(`   🎯 Average score: ${averageScore.toFixed(1)}%`)
      console.log(`   ✔️ Accuracy rate: ${accuracyRate.toFixed(1)}%`)

      // Upsert assignment stats
      await prisma.assignmentStats.upsert({
        where: { assignmentId: assignment.id },
        update: {
          totalStudents,
          totalQuestions,
          completedStudents,
          inProgressStudents,
          notStartedStudents,
          completionRate: parseFloat(completionRate.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          lastUpdated: new Date()
        },
        create: {
          assignmentId: assignment.id,
          totalStudents,
          totalQuestions,
          completedStudents,
          inProgressStudents,
          notStartedStudents,
          completionRate: parseFloat(completionRate.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2))
        }
      })
    }

    console.log('\n🎉 Assignment statistics initialization completed successfully!')

    // Show updated aggregate
    const agg = await prisma.assignmentStats.aggregate({
      _avg: {
        completionRate: true,
        averageScore: true
      }
    })

    console.log('\n📈 Updated aggregate averages:')
    console.log(`   📊 Average completion rate: ${(agg._avg.completionRate || 0).toFixed(1)}%`)
    console.log(`   🎯 Average score: ${(agg._avg.averageScore || 0).toFixed(1)}%`)

  } catch (error) {
    console.error('❌ Error initializing assignment statistics:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
initializeAssignmentStats().catch(console.error) 