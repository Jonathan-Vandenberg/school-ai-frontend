import { PrismaClient, Prisma } from '@prisma/client'
import { AuthService, AuthenticatedUser, NotFoundError, ForbiddenError, ValidationError } from './auth.service'
import { withTransaction } from '../db'

const prisma = new PrismaClient()

export interface CreateQuizData {
  title: string
  topic: string
  description?: string
  numberOfQuestions: number
  numberOfOptions: number
  timeLimitMinutes?: number | null
  classIds: string[]
  studentIds?: string[]
  assignToEntireClass: boolean
  scheduledPublishAt?: Date | null
  dueDate?: Date | null
  isAIGenerated: boolean
  questions?: {
    question: string
    correctAnswer: string
    options: string[]
    explanation?: string
  }[]
}

export interface QuizWithDetails {
  id: string
  title: string
  topic: string
  description: string | null
  numberOfQuestions: number
  numberOfOptions: number
  timeLimitMinutes: number | null
  isAIGenerated: boolean
  isActive: boolean
  isLiveSession: boolean
  liveSessionStartedAt: Date | null
  liveSessionEndedAt: Date | null
  scheduledPublishAt: Date | null
  dueDate: Date | null
  currentSession: number
  allowMultipleSessions: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  teacher: {
    id: string
    username: string
  }
  questions: Array<{
    id: string
    question: string
    correctAnswer: string
    explanation: string | null
    order: number
    options: Array<{
      id: string
      text: string
      isCorrect: boolean
      order: number
    }>
  }>
  classes: Array<{
    class: {
      id: string
      name: string
    }
  }>
  students: Array<{
    user: {
      id: string
      username: string
    }
  }>
}

export interface AIQuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

export interface AIQuizResponse {
  questions: AIQuizQuestion[]
}

/**
 * Quiz Service
 * Handles all quiz-related database operations with authentication
 */
export class QuizService {
  /**
   * Generate quiz questions using AI
   */
  static async generateQuestionsWithAI(
    topic: string,
    numberOfQuestions: number,
    numberOfOptions: number,
    title?: string,
    description?: string,
    imageUrls?: string[],
    existingQuestions?: AIQuizQuestion[]
  ): Promise<AIQuizQuestion[]> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      // Dynamic import to avoid issues with server-side only modules
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Build context from title, topic, description, and images
      let contextInfo = `Topic: "${topic}"`;
      if (title) {
        contextInfo = `Title: "${title}"\n${contextInfo}`;
      }
      if (description) {
        contextInfo += `\nDescription: "${description}"`;
      }

      // Add existing questions context to avoid duplicates
      let existingQuestionsContext = '';
      if (existingQuestions && existingQuestions.length > 0) {
        existingQuestionsContext = `\n\nEXISTING QUESTIONS TO AVOID DUPLICATING:\n`;
        existingQuestions.forEach((q, index) => {
          existingQuestionsContext += `${index + 1}. "${q.question}"\n`;
        });
        existingQuestionsContext += `\nIMPORTANT: Generate completely different questions that DO NOT overlap with the existing ones above. Focus on different aspects, concepts, or details.`;
      }

      let messages: any[] = [];
      
      if (imageUrls && imageUrls.length > 0) {
        // Image-based question generation
        const systemPrompt = `You are an expert educator creating multiple choice quiz questions based on provided images. Generate ${numberOfQuestions} educational questions using the images and context provided.

Context:
${contextInfo}${existingQuestionsContext}

Each question must have exactly ${numberOfOptions} answer options with only one correct answer.

Guidelines:
- Analyze the images carefully and create questions about what you observe
- Questions can be about objects, concepts, relationships, or details shown in the images
- Use the topic and context to focus the questions appropriately
- Options should be plausible but only one correct
- Include brief explanations for the correct answers
- Questions should be clear, educational, and age-appropriate
- Vary difficulty levels appropriately
- Ensure all questions are unique and different from any existing questions listed above

Return a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Clear question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 2",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}`;

        messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Generate ${numberOfQuestions} multiple choice questions with ${numberOfOptions} options each based on these images and the provided context.`
              },
              ...imageUrls.map(url => ({
                type: "image_url",
                image_url: { url }
              }))
            ]
          }
        ];
      } else {
        // Text-based question generation (original logic)
        const systemPrompt = `You are an expert educator creating multiple choice quiz questions. Generate ${numberOfQuestions} educational questions based on the following context:

${contextInfo}${existingQuestionsContext}

Each question must have exactly ${numberOfOptions} answer options with only one correct answer.

Guidelines:
- Questions should be clear, educational, and age-appropriate
- Use the title and description to understand the specific focus and context
- Options should be plausible but only one correct
- Include brief explanations for the correct answers
- Cover different aspects of the topic as described
- Vary difficulty levels appropriately
- Ensure questions align with the quiz's purpose as indicated by the title and description
- Ensure all questions are unique and different from any existing questions listed above

Return a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Clear question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 2",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}`;

        const userPrompt = `Generate ${numberOfQuestions} multiple choice questions with ${numberOfOptions} options each, using the provided context to create relevant and focused questions.`;
        
        messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ];
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const generatedContent = completion.choices[0].message?.content;
      if (!generatedContent) {
        throw new Error('No content received from AI');
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(generatedContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', generatedContent);
        throw new Error('Invalid JSON response from AI');
      }

      // Handle both array format and object with questions array
      let questionsArray;
      if (Array.isArray(parsedContent)) {
        questionsArray = parsedContent;
      } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
        questionsArray = parsedContent.questions;
      } else {
        throw new Error('AI response does not contain a valid questions array');
      }

      // Validate each question structure
      const validatedQuestions = questionsArray.map((q: any, index: number) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || !q.correctAnswer) {
          throw new Error(`Invalid question structure at index ${index}`);
        }

        if (q.options.length !== numberOfOptions) {
          throw new Error(`Question ${index + 1} has ${q.options.length} options, expected ${numberOfOptions}`);
        }

        if (!q.options.includes(q.correctAnswer)) {
          throw new Error(`Question ${index + 1} correct answer not found in options`);
        }

        return {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'No explanation provided.',
        };
      });

      return validatedQuestions;
    } catch (error) {
      console.error('Error generating AI questions:', error);
      throw new Error(`Failed to generate questions with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new quiz
   */
  static async createQuiz(
    currentUser: AuthenticatedUser,
    quizData: CreateQuizData
  ): Promise<QuizWithDetails> {
    // Ensure user has permission to create quizzes
    AuthService.requireTeacherOrAdmin(currentUser);

    // Validate quiz data
    if (!quizData.title || !quizData.topic) {
      throw new ValidationError('Title and topic are required');
    }

    if (quizData.numberOfQuestions < 1 || quizData.numberOfOptions < 2) {
      throw new ValidationError('Invalid number of questions or options');
    }

    if (quizData.classIds.length === 0) {
      throw new ValidationError('At least one class must be selected');
    }

    // If manual questions provided, validate them
    if (!quizData.isAIGenerated && (!quizData.questions || quizData.questions.length === 0)) {
      throw new ValidationError('Questions are required when not using AI generation');
    }

    // Verify user can access all selected classes
    for (const classId of quizData.classIds) {
      if (currentUser.customRole === 'TEACHER') {
        // Check if teacher is assigned to this class
        const classAssignment = await prisma.userClass.findFirst({
          where: {
            userId: currentUser.id,
            classId: classId
          }
        });
        if (!classAssignment) {
          throw new ForbiddenError(`Cannot access class ${classId}`);
        }
      }
      // Admins can access any class by default
    }

    const publishDate = quizData.scheduledPublishAt ? quizData.scheduledPublishAt : new Date();
    const isScheduled = quizData.scheduledPublishAt && quizData.scheduledPublishAt > new Date();

    return withTransaction(async (tx) => {
      // 1. Create the quiz
      const newQuiz = await tx.quiz.create({
        data: {
          title: quizData.title,
          topic: quizData.topic,
          description: quizData.description,
          numberOfQuestions: quizData.numberOfQuestions,
          numberOfOptions: quizData.numberOfOptions,
          timeLimitMinutes: quizData.timeLimitMinutes,
          isAIGenerated: quizData.isAIGenerated,
          teacherId: currentUser.id,
          publishedAt: isScheduled ? null : publishDate,
          scheduledPublishAt: isScheduled ? quizData.scheduledPublishAt : null,
          dueDate: quizData.dueDate,
        },
        include: {
          teacher: {
            select: { id: true, username: true }
          },
        }
      });

      // 2. Create quiz questions and options
      if (quizData.questions && quizData.questions.length > 0) {
        for (let i = 0; i < quizData.questions.length; i++) {
          const questionData = quizData.questions[i];
          
          const question = await tx.quizQuestion.create({
            data: {
              question: questionData.question,
              correctAnswer: questionData.correctAnswer,
              explanation: questionData.explanation,
              order: i + 1,
              quizId: newQuiz.id,
            }
          });

          // Create options for this question
          for (let j = 0; j < questionData.options.length; j++) {
            const optionText = questionData.options[j];
            await tx.quizOption.create({
              data: {
                text: optionText,
                isCorrect: optionText === questionData.correctAnswer,
                order: j + 1,
                questionId: question.id,
              }
            });
          }
        }
      }

      // 3. Create class assignments
      for (const classId of quizData.classIds) {
        await tx.quizClass.create({
          data: {
            quizId: newQuiz.id,
            classId: classId,
          }
        });
      }

      // 4. Create individual student assignments if not assigning to entire class
      if (!quizData.assignToEntireClass && quizData.studentIds && quizData.studentIds.length > 0) {
        for (const studentId of quizData.studentIds) {
          await tx.quizStudent.create({
            data: {
              quizId: newQuiz.id,
              userId: studentId,
            }
          });
        }
      } else if (quizData.assignToEntireClass) {
        // Get all students from selected classes and assign quiz to them
        const studentsInClasses = await tx.userClass.findMany({
          where: {
            classId: {
              in: quizData.classIds
            },
            user: {
              customRole: 'STUDENT'
            }
          },
          select: {
            userId: true
          }
        });

        // Create quiz assignments for all students
        for (const student of studentsInClasses) {
          await tx.quizStudent.create({
            data: {
              quizId: newQuiz.id,
              userId: student.userId,
            }
          });
        }
      }

      // 5. Create activity log
      await tx.activityLog.create({
        data: {
          type: 'ASSIGNMENT_CREATED', // We'll extend this enum later
          action: 'Quiz Created',
          details: {
            quizId: newQuiz.id,
            title: quizData.title,
            topic: quizData.topic,
            numberOfQuestions: quizData.numberOfQuestions,
            isAIGenerated: quizData.isAIGenerated,
          },
          userId: currentUser.id,
          quizId: newQuiz.id,
        }
      });

      // 6. Fetch and return the complete quiz with all relations
      const completeQuiz = await tx.quiz.findUnique({
        where: { id: newQuiz.id },
        include: {
          teacher: {
            select: { id: true, username: true }
          },
          questions: {
            include: {
              options: {
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          },
          classes: {
            include: {
              class: {
                select: { id: true, name: true }
              }
            }
          },
          students: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          }
        }
      });

      return completeQuiz as QuizWithDetails;
    });
  }

  /**
   * Get quiz by ID with details
   */
  static async getQuizById(
    currentUser: AuthenticatedUser,
    quizId: string
  ): Promise<QuizWithDetails & { hasSubmissions: boolean }> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        teacher: {
          select: { id: true, username: true }
        },
        questions: {
          include: {
            options: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        classes: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        },
        students: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check if user can access this quiz
    const canAccess = await AuthService.canManageQuiz(currentUser, quizId);
    if (!canAccess) {
      throw new ForbiddenError('Cannot access this quiz');
    }

    const { _count, ...quizData } = quiz;
    
    return {
      ...quizData,
      hasSubmissions: _count.submissions > 0
    } as QuizWithDetails & { hasSubmissions: boolean };
  }

  /**
   * List quizzes for a teacher
   */
  static async listQuizzes(
    currentUser: AuthenticatedUser,
    params: {
      page?: number
      limit?: number
      classId?: string
    } = {}
  ): Promise<{
    quizzes: QuizWithDetails[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const skip = (page - 1) * limit;

    let where: Prisma.QuizWhereInput = {};

    if (currentUser.customRole === 'TEACHER') {
      where.teacherId = currentUser.id;
    }

    if (params.classId) {
      where.classes = {
        some: {
          classId: params.classId
        }
      };
    }

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacher: {
            select: { id: true, username: true }
          },
          questions: {
            include: {
              options: {
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          },
          classes: {
            include: {
              class: {
                select: { id: true, name: true }
              }
            }
          },
          students: {
            include: {
              user: {
                select: { id: true, username: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.quiz.count({ where })
    ]);

    return {
      quizzes: quizzes as QuizWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

// Add to AuthService for quiz permissions
declare module './auth.service' {
  namespace AuthService {
    function canManageQuiz(user: AuthenticatedUser, quizId: string): Promise<boolean>;
  }
}

// Extend AuthService with quiz permissions
AuthService.canManageQuiz = async function(user: AuthenticatedUser, quizId: string): Promise<boolean> {
  if (user.customRole === 'ADMIN') return true;
  
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { teacherId: true }
  });
  
  return quiz?.teacherId === user.id;
}; 