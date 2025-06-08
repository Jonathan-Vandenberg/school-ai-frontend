import cron from 'node-cron'
import { prisma, withTransaction, DatabaseError } from '../db'

/**
 * Dashboard snapshot scheduled task
 * Creates snapshots of dashboard metrics once per day at 6 AM
 */
export function createDashboardSnapshotTask() {
  console.log('Registering dashboard snapshot task...')
  
  // Schedule the task to run once per day at 6 AM
  const task = cron.schedule('0 6 * * *', async () => {
    try {
      console.log('Running daily dashboard snapshot task...')
      
      await withTransaction(async (tx) => {
        // Get current metrics
        const classes = await tx.class.findMany({
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    customRole: true,
                  },
                },
              },
            },
            assignments: {
              include: {
                assignment: {
                  select: {
                    id: true,
                    type: true,
                    questions: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
        
        const teachers = await tx.user.findMany({
          where: {
            customRole: 'TEACHER',
          },
          select: {
            id: true,
          },
        })
        
        const students = await tx.user.findMany({
          where: {
            customRole: 'STUDENT',
          },
          include: {
            classes: {
              include: {
                class: {
                  include: {
                    assignments: {
                      include: {
                        assignment: {
                          select: {
                            id: true,
                            type: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            assignmentsAssigned: {
              include: {
                assignment: {
                  select: {
                    id: true,
                    type: true,
                  },
                },
              },
            },
            progresses: {
              include: {
                assignment: {
                  select: {
                    id: true,
                  },
                },
                question: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        })
        
        // Calculate basic metrics
        const totalClasses = classes.length
        const totalTeachers = teachers.length
        const totalStudents = students.length
        
        // Calculate assignment metrics
        const uniqueAssignments = new Set()
        const classAssignmentsSet = new Set()
        const individualAssignmentsSet = new Set()
        
        // Add class assignments
        classes.forEach((classItem: any) => {
          classItem.assignments.forEach((classAssignment: any) => {
            const assignment = classAssignment.assignment
            uniqueAssignments.add(assignment.id)
            classAssignmentsSet.add(assignment.id)
          })
        })
        
        // Add individual assignments
        students.forEach((student: any) => {
          student.assignmentsAssigned.forEach((userAssignment: any) => {
            const assignment = userAssignment.assignment
            uniqueAssignments.add(assignment.id)
            individualAssignmentsSet.add(assignment.id)
          })
        })
        
        const totalAssignments = uniqueAssignments.size
        const classAssignments = classAssignmentsSet.size
        const individualAssignments = individualAssignmentsSet.size
        
        // Process student metrics
        let studentsNeedingAttention = 0
        
        const processedStudents = students.map((student: any) => {
          // Create a set of assigned assignments for this student
          const assignedAssignments = new Set()
          
          // Add class assignments
          student.classes.forEach((userClass: any) => {
            userClass.class.assignments.forEach((classAssignment: any) => {
              assignedAssignments.add(classAssignment.assignment.id)
            })
          })
          
          // Add individual assignments
          student.assignmentsAssigned.forEach((userAssignment: any) => {
            assignedAssignments.add(userAssignment.assignment.id)
          })
          
          // Get progress data for the student
          const studentProgress = student.progresses
          
          // Track individual question progress
          let totalQuestions = 0
          let completedQuestions = 0
          let correctQuestions = 0
          
          // Track assignment-level completion
          const assignmentCompletionMap = new Map()
          
          studentProgress.forEach((progress: any) => {
            if (!progress.assignment) return
            
            const assignmentId = progress.assignment.id
            if (assignedAssignments.has(assignmentId)) {
              // Count this as a question
              totalQuestions++
              
              // If the question is complete, count it
              if (progress.isComplete) {
                completedQuestions++
                
                // If the question is also correct, count that too
                if (progress.isCorrect) {
                  correctQuestions++
                }
              }
              
              // Track assignment completion
              const currentComplete = assignmentCompletionMap.get(assignmentId) || false
              assignmentCompletionMap.set(assignmentId, currentComplete || progress.isComplete)
            }
          })
          
          // Count completed assignments for the completion rate
          const completedAssignments = Array.from(assignmentCompletionMap.values()).filter(Boolean).length
          const totalAssignmentsForStudent = assignedAssignments.size
          
          // Calculate rates
          const completionRate = totalAssignmentsForStudent > 0 ? (completedAssignments / totalAssignmentsForStudent) * 100 : 0
          const successRate = completedQuestions > 0 ? (correctQuestions / completedQuestions) * 100 : 0
          
          const needsAttention = (completedAssignments > 0 && successRate < 70) || 
                                (totalAssignmentsForStudent > 0 && completionRate < 70)
          
          if (needsAttention) {
            studentsNeedingAttention++
          }
          
          return {
            completionRate,
            successRate,
            totalAssignments: totalAssignmentsForStudent,
            completedAssignments,
          }
        })
        
        // Calculate average completion and success rates
        const studentsWithAssignments = processedStudents.filter((s: any) => s.totalAssignments > 0)
        
        let averageCompletionRate = 0
        let averageSuccessRate = 0
        
        if (studentsWithAssignments.length > 0) {
          const totalCompletionRate = studentsWithAssignments.reduce((acc: number, s: any) => acc + s.completionRate, 0)
          const totalSuccessRate = studentsWithAssignments.reduce((acc: number, s: any) => acc + s.successRate, 0)
          
          averageCompletionRate = totalCompletionRate / studentsWithAssignments.length
          averageSuccessRate = totalSuccessRate / studentsWithAssignments.length
        }
        
        // Count recent activities (last 24 hours)
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        
        const recentActivities = await tx.activityLog.count({
          where: {
            createdAt: {
              gte: oneDayAgo,
            },
            publishedAt: {
              not: null,
            },
          },
        })
        
        // Create the snapshot
        const snapshot = await tx.dashboardSnapshot.create({
          data: {
            timestamp: new Date(),
            snapshotType: 'daily',
            totalClasses,
            totalTeachers,
            totalStudents,
            totalAssignments,
            classAssignments,
            individualAssignments,
            averageCompletionRate: Math.round(averageCompletionRate),
            averageSuccessRate: Math.round(averageSuccessRate),
            studentsNeedingAttention,
            recentActivities,
            publishedAt: new Date(),
          },
        })
        
        console.log(`Created dashboard snapshot: ${snapshot.id}`)
        
        // Clean up old snapshots (keep 365 days)
        const oldestToKeep = new Date()
        oldestToKeep.setDate(oldestToKeep.getDate() - 365)
        
        const deletedSnapshots = await tx.dashboardSnapshot.deleteMany({
          where: {
            timestamp: {
              lt: oldestToKeep,
            },
          },
        })
        
        if (deletedSnapshots.count > 0) {
          console.log(`Cleaned up ${deletedSnapshots.count} old dashboard snapshots`)
        }
        
        console.log('Dashboard snapshot task completed successfully')
      })
    } catch (error) {
      console.error('Error in dashboard snapshot task:', error)
      
      if (error instanceof DatabaseError) {
        console.error('Database error during dashboard snapshot:', error.cause)
      }
    }
  })

  return task
}

/**
 * Manually create a dashboard snapshot
 * Useful for testing or on-demand analytics
 */
export async function createManualSnapshot(snapshotType: 'daily' | 'weekly' | 'monthly' = 'daily') {
  console.log(`Creating manual ${snapshotType} dashboard snapshot...`)
  
  try {
    return await withTransaction(async (tx) => {
      // Similar logic to the scheduled task but allow different snapshot types
      const now = new Date()
      
      // Get basic counts
      const [totalClasses, totalTeachers, totalStudents, totalAssignments] = await Promise.all([
        tx.class.count(),
        tx.user.count({ where: { customRole: 'TEACHER' } }),
        tx.user.count({ where: { customRole: 'STUDENT' } }),
        tx.assignment.count({ where: { publishedAt: { not: null } } }),
      ])
      
      // Get assignment type breakdown
      const [classAssignments, individualAssignments] = await Promise.all([
        tx.assignment.count({ 
          where: { 
            publishedAt: { not: null },
            type: 'CLASS',
          }
        }),
        tx.assignment.count({ 
          where: { 
            publishedAt: { not: null },
            type: 'INDIVIDUAL',
          }
        }),
      ])
      
      // Get recent activities count
      const recentActivities = await tx.activityLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      })
      
      // Create snapshot with basic metrics
      // For a manual snapshot, we'll use simplified calculations
      const snapshot = await tx.dashboardSnapshot.create({
        data: {
          timestamp: now,
          snapshotType,
          totalClasses,
          totalTeachers,
          totalStudents,
          totalAssignments,
          classAssignments,
          individualAssignments,
          averageCompletionRate: 0, // Will be calculated in full version
          averageSuccessRate: 0, // Will be calculated in full version
          studentsNeedingAttention: 0, // Will be calculated in full version
          recentActivities,
          publishedAt: now,
        },
      })
      
      console.log(`Manual snapshot created: ${snapshot.id}`)
      return snapshot
    })
  } catch (error) {
    console.error('Error creating manual snapshot:', error)
    throw error
  }
}

/**
 * Get recent dashboard snapshots
 */
export async function getRecentSnapshots(limit: number = 30) {
  return await prisma.dashboardSnapshot.findMany({
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })
} 