#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStudentPerformance() {
  console.log('🔍 Checking actual student performance data...')
  
  try {
    // Get a few students to check their real data
    const students = await prisma.user.findMany({
      where: {
        customRole: 'STUDENT'
      },
      take: 5,
      select: {
        id: true,
        username: true
      }
    })

    for (const student of students) {
      console.log(`\n📊 Checking ${student.username} (${student.id}):`)
      
      // Get their assignments
      const assignments = await prisma.assignment.findMany({
        where: {
          isActive: true,
          OR: [
            {
              students: {
                some: { userId: student.id }
              }
            },
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
            }
          ]
        },
        select: {
          id: true,
          topic: true,
          dueDate: true
        }
      })

      console.log(`  📝 Total assignments: ${assignments.length}`)

      // Get their progress
      const progresses = await prisma.studentAssignmentProgress.findMany({
        where: {
          studentId: student.id,
          assignmentId: {
            in: assignments.map(a => a.id)
          }
        },
        select: {
          assignmentId: true,
          isComplete: true,
          isCorrect: true
        }
      })

      console.log(`  🏃 Total progress records: ${progresses.length}`)

      // Calculate completed assignments
      const completedAssignments = new Set(
        progresses.filter(p => p.isComplete).map(p => p.assignmentId)
      ).size

      const completionRate = assignments.length > 0 ? 
        (completedAssignments / assignments.length) * 100 : 0

      console.log(`  ✅ Completed assignments: ${completedAssignments}/${assignments.length}`)
      console.log(`  📈 Completion rate: ${completionRate.toFixed(1)}%`)

      // Calculate scores
      const completedProgresses = progresses.filter(p => p.isComplete)
      const correctAnswers = completedProgresses.filter(p => p.isCorrect).length
      const averageScore = completedProgresses.length > 0 ? 
        (correctAnswers / completedProgresses.length) * 100 : 0

      console.log(`  🎯 Correct answers: ${correctAnswers}/${completedProgresses.length}`)
      console.log(`  📊 Average score: ${averageScore.toFixed(1)}%`)

      // Check overdue assignments
      const currentDate = new Date()
      const overdueAssignments = assignments.filter(a => 
        a.dueDate && new Date(a.dueDate) < currentDate
      ).length

      console.log(`  ⏰ Overdue assignments: ${overdueAssignments}`)

      // Show assignments details
      console.log('  📋 Assignment details:')
      assignments.slice(0, 3).forEach(a => {
        const isCompleted = progresses.some(p => p.assignmentId === a.id && p.isComplete)
        console.log(`    - ${a.topic || 'Untitled'}: ${isCompleted ? '✅' : '❌'} ${a.dueDate ? `(due: ${a.dueDate.toLocaleDateString()})` : ''}`)
      })
      if (assignments.length > 3) {
        console.log(`    ... and ${assignments.length - 3} more`)
      }
    }

  } catch (error) {
    console.error('❌ Error checking student performance:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStudentPerformance() 