import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStudentStats() {
  const student = await prisma.user.findFirst({
    where: { username: 'student' },
    select: { id: true, username: true }
  });
  
  console.log('Checking student progress for The Brave Little Firefly...');
  
  // Get the Firefly assignment
  const assignment = await prisma.assignment.findFirst({
    where: { topic: { contains: 'Firefly' } },
    select: { id: true, topic: true, questions: { select: { id: true } } }
  });
  
  if (!assignment) {
    console.log('Firefly assignment not found');
    return;
  }
  
  console.log(`Assignment: ${assignment.topic}`);
  console.log(`Total questions: ${assignment.questions.length}`);
  
  // Get progress for this assignment
  const progress = await prisma.studentAssignmentProgress.findMany({
    where: {
      studentId: student.id,
      assignmentId: assignment.id,
      isComplete: true
    },
    select: {
      questionId: true,
      isCorrect: true,
      createdAt: true
    }
  });
  
  console.log(`Progress records: ${progress.length}`);
  console.log(`Unique questions answered: ${new Set(progress.map(p => p.questionId)).size}`);
  console.log(`Correct answers: ${progress.filter(p => p.isCorrect).length}`);
  
  // Check student stats
  const studentStats = await prisma.studentStats.findUnique({
    where: { studentId: student.id },
    select: {
      totalAssignments: true,
      completedAssignments: true,
      averageScore: true,
      lastUpdated: true
    }
  });
  
  console.log('Student stats:', studentStats);
}

checkStudentStats().catch(console.error); 