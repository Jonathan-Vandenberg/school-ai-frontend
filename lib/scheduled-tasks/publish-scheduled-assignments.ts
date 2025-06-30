import cron from 'node-cron'
import { prisma, withTransaction, DatabaseError } from '../db'

/**
 * Scheduled task to activate assignments that have reached their scheduled publish time
 * This function will run every minute to check for assignments that need to be activated
 */
export function createPublishScheduledAssignmentsTask() {
  console.log('Registering scheduled assignments publication task...')
  
  // Schedule the task to run every minute
  const task = cron.schedule('* * * * *', async () => {
    const now = new Date()
    const timestamp = now.toISOString()
    console.log(`\n🕐 [${timestamp}] CRON: Starting scheduled assignment publication check...`)
    
    try {
      // Use transaction to ensure data integrity
      await withTransaction(async (tx) => {
        // Find all published assignments with isActive=false and a scheduledPublishAt date in the past
        const assignmentsToActivate = await tx.assignment.findMany({
          where: {
            publishedAt: { not: null }, // Must be published
            isActive: false, // Not active yet
            scheduledPublishAt: {
              lte: now, // Less than or equal to current time
              not: null, // Not null
            },
          },
          select: {
            id: true,
            topic: true,
            scheduledPublishAt: true,
            teacher: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        })
        
        if (assignmentsToActivate.length > 0) {
          console.log(`🎯 [${timestamp}] FOUND ${assignmentsToActivate.length} assignments ready for activation!`)
          
          // Activate each assignment
          for (const assignment of assignmentsToActivate) {
            await tx.assignment.update({
              where: { id: assignment.id },
              data: {
                isActive: true,
                // Keep the original scheduledPublishAt for audit purposes
              },
            })
            
            // Log the activation as an activity
            await tx.activityLog.create({
              data: {
                type: 'ASSIGNMENT_CREATED', // Reusing existing enum
                userId: assignment.teacher?.id,
                assignmentId: assignment.id,
                publishedAt: now,
              },
            })
            
            console.log(`   ✅ Activated: "${assignment.topic}" (ID: ${assignment.id})`)
          }
          
          console.log(`🎉 [${timestamp}] Successfully activated ${assignmentsToActivate.length} assignments!`)
        } else {
          // Only log this every 10 minutes to avoid spam
          if (now.getMinutes() % 10 === 0) {
            console.log(`💤 [${timestamp}] No assignments ready for activation at this time`)
          }
        }
      })
    } catch (error) {
      console.error(`❌ [${timestamp}] Error in scheduled assignment activation:`, error)
      
      // If it's a database error, we might want to retry or alert
      if (error instanceof DatabaseError) {
        console.error('🔌 Database error during assignment activation:', error.cause)
      }
    }
    
    console.log(`✅ [${timestamp}] CRON: Assignment publication check completed\n`)
  })

  return task
}

/**
 * Utility function to manually activate missed assignments
 * Similar to the fix-missed-publications script in Strapi
 */
export async function activateMissedAssignments(): Promise<{
  activated: number
  errors: string[]
}> {
  const now = new Date()
  const results = {
    activated: 0,
    errors: [] as string[],
  }
  
  try {
    await withTransaction(async (tx) => {
      const missedAssignments = await tx.assignment.findMany({
        where: {
          publishedAt: { not: null },
          isActive: false,
          scheduledPublishAt: {
            lte: now,
            not: null,
          },
        },
        select: {
          id: true,
          topic: true,
          scheduledPublishAt: true,
          teacher: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })
      
      for (const assignment of missedAssignments) {
        try {
          await tx.assignment.update({
            where: { id: assignment.id },
            data: { isActive: true },
          })
          
          // Log the manual activation
          await tx.activityLog.create({
            data: {
              type: 'ASSIGNMENT_CREATED',
              userId: assignment.teacher?.id,
              assignmentId: assignment.id,
              publishedAt: now,
            },
          })
          
          results.activated++
          console.log(`Manually activated missed assignment: ${assignment.id} - ${assignment.topic}`)
        } catch (error) {
          const errorMsg = `Failed to activate assignment ${assignment.id}: ${error}`
          results.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
    })
  } catch (error) {
    const errorMsg = `Transaction failed during missed assignments activation: ${error}`
    results.errors.push(errorMsg)
    console.error(errorMsg)
  }
  
  return results
}

/**
 * Get assignments scheduled for the future
 */
export async function getScheduledAssignments() {
  const now = new Date()
  
  return await prisma.assignment.findMany({
    where: {
      publishedAt: { not: null },
      isActive: false,
      scheduledPublishAt: {
        gt: now,
        not: null,
      },
    },
    select: {
      id: true,
      topic: true,
      scheduledPublishAt: true,
      teacher: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      classes: {
        select: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      students: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      scheduledPublishAt: 'asc',
    },
  })
} 