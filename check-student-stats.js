const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStats() {
  try {
    // Find the Student user
    const student = await prisma.user.findFirst({
      where: { username: 'Student' }
    });
    
    if (!student) {
      console.log('Student not found');
      return;
    }
    
    console.log('Student ID:', student.id);
    
    // Get current student stats
    const stats = await prisma.studentStats.findUnique({
      where: { studentId: student.id }
    });
    
    console.log('Current Student Stats:', JSON.stringify(stats, null, 2));
    
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
      },
      select: {
        id: true,
        topic: true,
        type: true
      }
    });
    
    console.log('\nActual assignments available to student:', assignments.length);
    console.log('Assignment details:', assignments.map(a => ({ id: a.id, topic: a.topic, type: a.type })));
    
    // Check if stats exist for this student
    if (!stats) {
      console.log('\nNo stats found for this student - this is the problem!');
    } else {
      console.log('\nComparison:');
      console.log('- Stats show total assignments:', stats.totalAssignments);
      console.log('- Actual assignments available:', assignments.length);
      console.log('- Stats show completed assignments:', stats.completedAssignments);
      console.log('- Stats show completion rate:', stats.completionRate + '%');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStats(); 