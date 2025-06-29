const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllStudentStats() {
  try {
    console.log('🔧 Fixing all student statistics...\n');
    
    // Get all students
    const students = await prisma.user.findMany({
      where: { customRole: 'STUDENT' },
      select: { id: true, username: true }
    });
    
    console.log(`Found ${students.length} students to check\n`);
    
    let fixedCount = 0;
    
    for (const student of students) {
      // Calculate actual assignments for this student
      const actualAssignments = await prisma.assignment.count({
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
        }
      });
      
      // Get current stats
      const currentStats = await prisma.studentStats.findUnique({
        where: { studentId: student.id }
      });
      
      if (!currentStats) {
        console.log(`❌ ${student.username}: No stats record found`);
        continue;
      }
      
      const currentTotal = currentStats.totalAssignments;
      const currentCompletion = currentStats.completionRate;
      
      if (currentTotal !== actualAssignments) {
        // Fix the assignment count and recalculate completion rate
        const newCompletionRate = actualAssignments > 0 
          ? (currentStats.completedAssignments / actualAssignments) * 100 
          : 0;
        
        await prisma.studentStats.update({
          where: { studentId: student.id },
          data: {
            totalAssignments: actualAssignments,
            completionRate: parseFloat(newCompletionRate.toFixed(2)),
            notStartedAssignments: Math.max(0, actualAssignments - currentStats.completedAssignments - currentStats.inProgressAssignments),
            lastUpdated: new Date()
          }
        });
        
        console.log(`✅ ${student.username}:`);
        console.log(`   Total assignments: ${currentTotal} → ${actualAssignments}`);
        console.log(`   Completion rate: ${currentCompletion}% → ${newCompletionRate.toFixed(2)}%`);
        console.log(`   Completed: ${currentStats.completedAssignments}/${actualAssignments}`);
        console.log();
        
        fixedCount++;
      } else {
        console.log(`✓ ${student.username}: Already correct (${actualAssignments} assignments, ${currentCompletion}%)`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} student statistics records`);
    
    // Show Andy's updated stats as verification
    const andy = await prisma.user.findFirst({
      where: { username: 'Andy' },
      select: { id: true }
    });
    
    if (andy) {
      const andyStats = await prisma.studentStats.findUnique({
        where: { studentId: andy.id }
      });
      
      console.log('\n📊 Andy\'s updated stats:');
      console.log(`- Total assignments: ${andyStats.totalAssignments}`);
      console.log(`- Completed assignments: ${andyStats.completedAssignments}`);
      console.log(`- Completion rate: ${andyStats.completionRate}%`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllStudentStats(); 