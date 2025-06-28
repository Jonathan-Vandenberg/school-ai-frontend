#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeClassStats() {
  console.log('🚀 Starting class statistics initialization...')

  try {
    // Get all classes
    const classes = await prisma.class.findMany({
      select: { 
        id: true, 
        name: true,
        users: {
          where: { user: { customRole: 'STUDENT' } },
          select: { userId: true }
        }
      }
    })

    console.log(`📊 Found ${classes.length} classes to process`)

    for (const classData of classes) {
      console.log(`\n📝 Processing class: ${classData.name} (${classData.id})`)

      const studentIds = classData.users.map(u => u.userId)
      console.log(`👥 Students in class: ${studentIds.length}`)

      // Get all assignments for this class
      const assignments = await prisma.assignment.findMany({
        where: {
          classes: {
            some: { classId: classData.id }
          }
        },
        include: {
          questions: { select: { id: true } },
          progresses: {
            where: { 
              studentId: { in: studentIds },
              isComplete: true 
            },
            select: {
              isCorrect: true,
              studentId: true,
              assignmentId: true
            }
          }
        }
      })

      // Calculate class-level statistics
      let totalQuestions = 0
      let totalAnswers = 0
      let totalCorrectAnswers = 0
      let activeStudents = 0
      let studentsNeedingHelp = 0

      // Track student activity and performance
      const studentActivity = new Map<string, { 
        totalAnswers: number, 
        correctAnswers: number, 
        completedAssignments: number 
      }>()

      // Initialize tracking for all students
      studentIds.forEach(studentId => {
        studentActivity.set(studentId, { 
          totalAnswers: 0, 
          correctAnswers: 0, 
          completedAssignments: 0 
        })
      })

      // Process each assignment
      assignments.forEach(assignment => {
        const assignmentTotalQuestions = assignment.questions.length
        totalQuestions += assignmentTotalQuestions * studentIds.length // Total possible questions for all students

        // Group progress by student for this assignment
        const studentProgress = new Map<string, { completed: number, correct: number }>()
        
        assignment.progresses.forEach(progress => {
          if (!studentProgress.has(progress.studentId)) {
            studentProgress.set(progress.studentId, { completed: 0, correct: 0 })
          }
          const student = studentProgress.get(progress.studentId)!
          student.completed++
          if (progress.isCorrect) student.correct++
        })

        // Update student activity tracking
        studentProgress.forEach((progress, studentId) => {
          const activity = studentActivity.get(studentId)!
          activity.totalAnswers += progress.completed
          activity.correctAnswers += progress.correct
          
          // Check if student completed this assignment
          if (progress.completed >= assignmentTotalQuestions) {
            activity.completedAssignments++
          }
        })

        totalAnswers += assignment.progresses.length
        totalCorrectAnswers += assignment.progresses.filter(p => p.isCorrect).length
      })

      // Analyze student performance
      studentActivity.forEach((activity, studentId) => {
        if (activity.totalAnswers > 0) {
          activeStudents++
          
          // Identify students needing help (low completion rate or low accuracy)
          const completionRate = assignments.length > 0 ? (activity.completedAssignments / assignments.length) * 100 : 0
          const accuracyRate = activity.totalAnswers > 0 ? (activity.correctAnswers / activity.totalAnswers) * 100 : 0
          
          if (completionRate < 50 || accuracyRate < 60) {
            studentsNeedingHelp++
          }
        }
      })

      // Calculate average metrics
      const averageCompletion = studentIds.length > 0 && assignments.length > 0 
        ? Array.from(studentActivity.values()).reduce((sum, activity) => {
            return sum + (assignments.length > 0 ? (activity.completedAssignments / assignments.length) * 100 : 0)
          }, 0) / studentIds.length
        : 0

      const averageScore = totalAnswers > 0 
        ? (totalCorrectAnswers / totalAnswers) * 100 
        : 0

      const accuracyRate = totalAnswers > 0 
        ? (totalCorrectAnswers / totalAnswers) * 100 
        : 0

      // Upsert class stats
      await prisma.classStatsDetailed.upsert({
        where: { classId: classData.id },
        update: {
          totalStudents: studentIds.length,
          totalAssignments: assignments.length,
          averageCompletion: parseFloat(averageCompletion.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          activeStudents,
          studentsNeedingHelp,
          lastActivityDate: totalAnswers > 0 ? new Date() : null,
          lastUpdated: new Date()
        },
        create: {
          classId: classData.id,
          totalStudents: studentIds.length,
          totalAssignments: assignments.length,
          averageCompletion: parseFloat(averageCompletion.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalQuestions,
          totalAnswers,
          totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate.toFixed(2)),
          activeStudents,
          studentsNeedingHelp,
          lastActivityDate: totalAnswers > 0 ? new Date() : null
        }
      })

      console.log(`✅ Updated stats for ${classData.name}:`)
      console.log(`   👥 Total students: ${studentIds.length}`)
      console.log(`   📚 Total assignments: ${assignments.length}`)
      console.log(`   📊 Average completion: ${averageCompletion.toFixed(1)}%`)
      console.log(`   🎯 Average score: ${averageScore.toFixed(1)}%`)
      console.log(`   🟢 Active students: ${activeStudents}`)
      console.log(`   🔴 Students needing help: ${studentsNeedingHelp}`)
    }

    console.log('\n🎉 Class statistics initialization completed successfully!')

  } catch (error) {
    console.error('❌ Error initializing class statistics:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
initializeClassStats().catch(console.error) 