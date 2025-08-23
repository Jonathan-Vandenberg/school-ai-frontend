#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeSchoolStats() {
  console.log('🚀 Starting school statistics initialization...')

  try {
    const today = new Date()
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    console.log(`📊 Initializing school stats for: ${dateKey.toDateString()}`)

    // Count totals
    const [
      totalUsers,
      totalTeachers, 
      totalStudents,
      totalClasses,
      totalAssignments,
      activeAssignments,
      scheduledAssignments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { customRole: 'TEACHER' } }),
      prisma.user.count({ where: { customRole: 'STUDENT' } }),
      prisma.class.count(),
      prisma.assignment.count(),
      prisma.assignment.count({ where: { isActive: true } }),
      prisma.assignment.count({ 
        where: { 
          isActive: false, 
          scheduledPublishAt: { not: null } 
        } 
      })
    ])

    // Get completed assignments count
    const completedAssignments = await prisma.assignment.count({
      where: {
        progresses: {
          some: {
            isComplete: true
          }
        }
      }
    })

    // Aggregate assignment statistics from pre-calculated assignment stats
    const assignmentStatsAgg = await prisma.assignmentStats.aggregate({
      _avg: {
        completionRate: true,
        averageScore: true
      }
    })

    // Count daily active users (users with activity in last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const [dailyActiveStudents, dailyActiveTeachers] = await Promise.all([
      // Students with recent progress submissions
      prisma.user.count({
        where: {
          customRole: 'STUDENT',
          progresses: {
            some: {
              updatedAt: { gte: yesterday }
            }
          }
        }
      }),
      // Teachers with recent assignment creation or updates
      prisma.user.count({
        where: {
          customRole: 'TEACHER',
          OR: [
            {
              assignmentsCreated: {
                some: {
                  createdAt: { gte: yesterday }
                }
              }
            },
            {
              assignmentsCreated: {
                some: {
                  updatedAt: { gte: yesterday }
                }
              }
            }
          ]
        }
      })
    ])

    // Students needing help (from student stats if available, otherwise estimate)
    const studentsNeedingHelp = await prisma.studentStats.count({
      where: {
        OR: [
          { completionRate: { lt: 50 } },
          { accuracyRate: { lt: 60 } }
        ]
      }
    })

    // Calculate total questions and answers across all assignments
    const totalQuestionsResult = await prisma.question.aggregate({
      _count: { id: true }
    })

    const totalAnswersResult = await prisma.studentAssignmentProgress.aggregate({
      _count: { id: true },
      where: { isComplete: true }
    })

    const totalCorrectAnswersResult = await prisma.studentAssignmentProgress.aggregate({
      _count: { id: true },
      where: { 
        isComplete: true,
        isCorrect: true 
      }
    })

    const totalQuestions = totalQuestionsResult._count.id
    const totalAnswers = totalAnswersResult._count.id
    const totalCorrectAnswers = totalCorrectAnswersResult._count.id

    // Upsert school stats for today
    await prisma.schoolStats.upsert({
      where: { date: dateKey },
      update: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalClasses,
        totalAssignments,
        activeAssignments,
        scheduledAssignments,
        completedAssignments,
        averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
        averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
        totalQuestions,
        totalAnswers,
        totalCorrectAnswers,
        studentsNeedingHelp
      },
      create: {
        date: dateKey,
        totalUsers,
        totalTeachers,
        totalStudents,
        totalClasses,
        totalAssignments,
        activeAssignments,
        scheduledAssignments,
        completedAssignments,
        averageCompletionRate: parseFloat((assignmentStatsAgg._avg.completionRate || 0).toFixed(2)),
        averageScore: parseFloat((assignmentStatsAgg._avg.averageScore || 0).toFixed(2)),
        totalQuestions,
        totalAnswers,
        totalCorrectAnswers,
        studentsNeedingHelp
      }
    })

    console.log(`✅ School statistics initialized for ${dateKey.toDateString()}:`)
    console.log(`   👥 Total users: ${totalUsers}`)
    console.log(`   🎓 Teachers: ${totalTeachers}`)
    console.log(`   👨‍🎓 Students: ${totalStudents}`)
    console.log(`   🏫 Classes: ${totalClasses}`)
    console.log(`   📚 Total assignments: ${totalAssignments}`)
    console.log(`   🟢 Active assignments: ${activeAssignments}`)
    console.log(`   ⏰ Scheduled assignments: ${scheduledAssignments}`)
    console.log(`   ✅ Completed assignments: ${completedAssignments}`)
    console.log(`   📊 Average completion rate: ${(assignmentStatsAgg._avg.completionRate || 0).toFixed(1)}%`)
    console.log(`   🎯 Average score: ${(assignmentStatsAgg._avg.averageScore || 0).toFixed(1)}%`)
    console.log(`   📝 Total questions: ${totalQuestions}`)
    console.log(`   💬 Total answers: ${totalAnswers}`)
    console.log(`   ✔️ Correct answers: ${totalCorrectAnswers}`)
    console.log(`   🟢 Daily active students: ${dailyActiveStudents}`)
    console.log(`   👨‍🏫 Daily active teachers: ${dailyActiveTeachers}`)
    console.log(`   🔴 Students needing help: ${studentsNeedingHelp}`)

    console.log('\n🎉 School statistics initialization completed successfully!')

  } catch (error) {
    console.error('❌ Error initializing school statistics:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
initializeSchoolStats().catch(console.error) 