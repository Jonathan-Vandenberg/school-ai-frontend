const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssignmentCreation() {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { isActive: true },
      select: {
        id: true,
        topic: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('All assignments ordered by creation date:');
    assignments.forEach((a, i) => {
      console.log(`${i+1}. ${a.topic} (${a.id}) - Created: ${a.createdAt}`);
    });
    
    // Check student stats history
    const student = await prisma.user.findFirst({
      where: { username: 'Student' }
    });
    
    if (student) {
      const stats = await prisma.studentStats.findUnique({
        where: { studentId: student.id }
      });
      console.log('\nStudent stats last updated:', stats?.lastUpdated);
      console.log('Student stats created:', stats?.createdAt);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssignmentCreation(); 