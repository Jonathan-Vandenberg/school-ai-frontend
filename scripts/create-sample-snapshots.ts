import { PrismaClient } from '@prisma/client'
import { createManualSnapshot } from '../lib/scheduled-tasks/dashboard-snapshot'

const prisma = new PrismaClient()

async function createSampleSnapshots() {
  try {
    console.log('🔄 Creating sample dashboard snapshots for graph testing...')
    
    // Delete existing snapshots to start fresh
    await prisma.dashboardSnapshot.deleteMany({})
    console.log('🗑️  Cleared existing snapshots')
    
    // Create snapshots for the last 30 days with varying data
    const today = new Date()
    const snapshots = []
    
    for (let i = 29; i >= 0; i--) {
      const snapshotDate = new Date(today)
      snapshotDate.setDate(today.getDate() - i)
      snapshotDate.setHours(6, 0, 0, 0) // 6 AM snapshots
      
      // Simulate realistic growth patterns
      const dayProgress = (29 - i) / 29 // 0 to 1 progression
      
      // Base metrics that grow over time
      const totalStudents = Math.floor(25 + dayProgress * 9) // 25 to 34 students
      const totalTeachers = 3 // Constant
      const totalClasses = 3 // Constant
      const totalAssignments = Math.floor(10 + dayProgress * 7) // 10 to 17 assignments
      const classAssignments = Math.floor(totalAssignments * 0.7) // 70% class assignments
      const individualAssignments = totalAssignments - classAssignments
      
      // Completion rates that improve over time with some variation
      const baseCompletionRate = 15 + dayProgress * 50 + Math.sin(i * 0.3) * 10 // Varies around growing trend
      const averageCompletionRate = Math.max(0, Math.min(100, Math.floor(baseCompletionRate)))
      
      // Success rate that's generally high but varies
      const baseSuccessRate = 80 + Math.sin(i * 0.2) * 15 + dayProgress * 10
      const averageSuccessRate = Math.max(60, Math.min(100, Math.floor(baseSuccessRate)))
      
      // Students needing attention decreases as system improves
      const studentsNeedingAttention = Math.floor(10 - dayProgress * 8 + Math.random() * 3)
      
      // Recent activities vary by day
      const recentActivities = Math.floor(5 + Math.random() * 15 + Math.sin(i * 0.5) * 5)
      
      const snapshot = await prisma.dashboardSnapshot.create({
        data: {
          timestamp: snapshotDate,
          snapshotType: 'daily',
          totalClasses,
          totalTeachers,
          totalStudents,
          totalAssignments,
          classAssignments,
          individualAssignments,
          averageCompletionRate,
          averageSuccessRate,
          studentsNeedingAttention: Math.max(0, studentsNeedingAttention),
          recentActivities: Math.max(0, recentActivities),
          publishedAt: snapshotDate,
        }
      })
      
      snapshots.push(snapshot)
      
      if (i % 10 === 0) {
        console.log(`📊 Created snapshot for ${snapshotDate.toDateString()}: ${averageCompletionRate}% completion, ${averageSuccessRate}% success`)
      }
    }
    
    console.log(`\n✅ Created ${snapshots.length} sample snapshots`)
    
    // Show summary of the data range
    const firstSnapshot = snapshots[0]
    const lastSnapshot = snapshots[snapshots.length - 1]
    
    console.log('\n📈 Sample Data Summary:')
    console.log(`   Date Range: ${firstSnapshot.timestamp.toDateString()} to ${lastSnapshot.timestamp.toDateString()}`)
    console.log(`   Students: ${firstSnapshot.totalStudents} → ${lastSnapshot.totalStudents}`)
    console.log(`   Assignments: ${firstSnapshot.totalAssignments} → ${lastSnapshot.totalAssignments}`)
    console.log(`   Completion Rate: ${firstSnapshot.averageCompletionRate}% → ${lastSnapshot.averageCompletionRate}%`)
    console.log(`   Success Rate: ${firstSnapshot.averageSuccessRate}% → ${lastSnapshot.averageSuccessRate}%`)
    console.log(`   Students Needing Help: ${firstSnapshot.studentsNeedingAttention} → ${lastSnapshot.studentsNeedingAttention}`)
    
    // Also create a current snapshot with real data
    console.log('\n🔄 Creating current snapshot with real data...')
    const currentSnapshot = await createManualSnapshot('daily')
    console.log(`✅ Created current snapshot: ${currentSnapshot.id}`)
    
    console.log('\n🎉 Sample snapshot data ready for dashboard graphs!')
    
  } catch (error) {
    console.error('Error creating sample snapshots:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleSnapshots().catch(console.error) 