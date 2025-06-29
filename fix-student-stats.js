const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStudentStats() {
  try {
    // Find the Student user
    const student = await prisma.user.findFirst({
      where: { username: 'Student' }
    });
    
    if (!student) {
      console.log('Student not found');
      return;
    }
    
    console.log('Fixing stats for Student:', student.id);
    
    // Count actual assignments available to this student
    const assignments = await prisma.assignment.findMany({
      where: {
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
        isActive: true
      }
    });
    
    console.log('Actual assignments available:', assignments.length);
    
    // Get current stats
    const currentStats = await prisma.studentStats.findUnique({
      where: { studentId: student.id }
    });
    
    console.log('Current completed assignments:', currentStats.completedAssignments);
    
    // Update the student stats with correct total assignments
    const updatedStats = await prisma.studentStats.update({
      where: { studentId: student.id },
      data: {
        totalAssignments: assignments.length,
        completionRate: assignments.length > 0 ? (currentStats.completedAssignments / assignments.length) * 100 : 0,
        lastUpdated: new Date()
      }
    });
    
    console.log('Updated stats:');
    console.log('- Total assignments:', updatedStats.totalAssignments);
    console.log('- Completed assignments:', updatedStats.completedAssignments);
    console.log('- Completion rate:', updatedStats.completionRate.toFixed(2) + '%');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStudentStats(); 