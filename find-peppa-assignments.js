const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPeppaAssignments() {
  console.log('🔍 Finding all Peppa Pig assignments...\n');
  
  // Find all assignments with Peppa in the title
  const assignments = await prisma.assignment.findMany({
    where: { 
      topic: { contains: 'Peppa', mode: 'insensitive' }
    },
    include: {
      questions: {
        select: { id: true, textQuestion: true },
        orderBy: { createdAt: 'asc' }
      },
      teacher: {
        select: { username: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${assignments.length} Peppa Pig assignments:\n`);
  
  assignments.forEach((assignment, index) => {
    console.log(`${index + 1}. ${assignment.topic}`);
    console.log(`   ID: ${assignment.id}`);
    console.log(`   Teacher: ${assignment.teacher?.username || 'Unknown'}`);
    console.log(`   Created: ${assignment.createdAt}`);
    console.log(`   Questions: ${assignment.questions.length}`);
    console.log(`   Active: ${assignment.isActive}`);
    console.log('');
  });
  
  // Now check the specific assignment ID from your response
  const specificAssignmentId = 'cmcge1lzd0018ieu09e8ncyyd';
  console.log(`🎯 Checking specific assignment ID: ${specificAssignmentId}\n`);
  
  const specificAssignment = await prisma.assignment.findUnique({
    where: { id: specificAssignmentId },
    include: {
      questions: {
        select: { id: true, textQuestion: true },
        orderBy: { createdAt: 'asc' }
      },
      teacher: {
        select: { username: true }
      }
    }
  });
  
  if (specificAssignment) {
    console.log(`✅ Found specific assignment:`);
    console.log(`   Topic: ${specificAssignment.topic}`);
    console.log(`   ID: ${specificAssignment.id}`);
    console.log(`   Teacher: ${specificAssignment.teacher?.username || 'Unknown'}`);
    console.log(`   Questions: ${specificAssignment.questions.length}`);
    console.log(`   Active: ${specificAssignment.isActive}`);
    console.log('');
    
    // Check Andy's progress on this specific assignment
    const andy = await prisma.user.findFirst({
      where: { username: 'Andy' }
    });
    
    if (andy) {
      const progress = await prisma.studentAssignmentProgress.findMany({
        where: {
          studentId: andy.id,
          assignmentId: specificAssignmentId
        },
        include: {
          question: {
            select: { textQuestion: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log(`📊 Andy's progress on this assignment: ${progress.length} records\n`);
      
      progress.forEach((p, index) => {
        console.log(`Progress ${index + 1}:`);
        console.log(`  Question: ${p.question?.textQuestion || 'Unknown'}`);
        console.log(`  Question ID: ${p.questionId}`);
        console.log(`  Complete: ${p.isComplete}`);
        console.log(`  Correct: ${p.isCorrect}`);
        console.log(`  Created: ${p.createdAt}`);
        console.log('');
      });
      
      // Check for the specific question IDs from your response
      const questionIds = [
        'cmcge1lzo001aieu0mt1qffd9',
        'cmcge1lzo001bieu0bjezv798', 
        'cmcge1lzo001cieu0qf7q9dbt',
        'cmcge1lzo001dieu01iszuxsl',
        'cmcge1lzo001eieu0dmz8f6eg'
      ];
      
      console.log('🔍 Checking specific question IDs from your response:\n');
      
      for (const questionId of questionIds) {
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          select: { 
            id: true, 
            textQuestion: true, 
            assignmentId: true,
            assignment: {
              select: { topic: true }
            }
          }
        });
        
        if (question) {
          console.log(`✅ Question found: ${question.textQuestion}`);
          console.log(`   ID: ${question.id}`);
          console.log(`   Assignment: ${question.assignment?.topic}`);
          console.log(`   Assignment ID: ${question.assignmentId}`);
          
          const progressForQuestion = await prisma.studentAssignmentProgress.findFirst({
            where: {
              studentId: andy.id,
              questionId: questionId
            }
          });
          
          if (progressForQuestion) {
            console.log(`   ✅ Progress found: complete=${progressForQuestion.isComplete}, correct=${progressForQuestion.isCorrect}`);
          } else {
            console.log(`   ❌ No progress found for Andy`);
          }
        } else {
          console.log(`❌ Question ${questionId} not found`);
        }
        console.log('');
      }
    }
  } else {
    console.log(`❌ Assignment ${specificAssignmentId} not found`);
  }
}

findPeppaAssignments()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 