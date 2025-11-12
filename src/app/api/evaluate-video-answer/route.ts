import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../lib/services/auth.service'
import OpenAI from 'openai'

// Helper function to capitalize just the first letter
const capitalizeSentence = (text: string): string => {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface EvaluationRequest {
  answer: string
  videoUrl: string
  question: {
    question: string
    answer: string
  }
  rules?: string[]
  feedbackSettings?: {
    detailedFeedback?: boolean
    encouragementEnabled?: boolean
  }
  transcriptContent?: string | null
  language?: {
    code: string
    name: string
  } | null
  topic: string
  levels?: Array<{
    levelType: string
    cefrLevel?: string
    gradeLevel?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is not configured'
      }, { status: 500 })
    }

    const body: EvaluationRequest = await request.json()
    const { 
      answer, 
      question, 
      rules = [], 
      feedbackSettings = {},
      transcriptContent,
      language,
      topic,
      levels = []
    } = body

    // Capitalize the answer
    const capitalizedAnswer = capitalizeSentence(answer);

    // Use OpenAI to evaluate the student's answer
    const evaluation = await evaluateAnswerWithAI({
      studentAnswer: capitalizedAnswer,
      expectedAnswer: question.answer,
      questionText: question.question,
      topic,
      videoTranscript: transcriptContent,
      rules,
      feedbackSettings,
      language: language?.name || 'English',
      levels
    })

    return NextResponse.json({
      success: true,
      ...evaluation
    })
  } catch (error) {
    return handleServiceError(error)
  }
}

interface EvaluationParams {
  studentAnswer: string
  expectedAnswer: string
  questionText: string
  topic: string
  videoTranscript?: string | null
  rules: string[]
  feedbackSettings: {
    detailedFeedback?: boolean
    encouragementEnabled?: boolean
  }
  language: string
  levels: Array<{
    levelType: string
    cefrLevel?: string
    gradeLevel?: string
  }>
}

async function evaluateAnswerWithAI(params: EvaluationParams) {
  const {
    studentAnswer,
    expectedAnswer,
    questionText,
    topic,
    videoTranscript,
    rules,
    feedbackSettings,
    language,
    levels
  } = params

  // Generate level description for vocabulary guidance
  const getLevelDescription = (levels: Array<{ levelType: string; cefrLevel?: string; gradeLevel?: string }>) => {
    if (!levels || levels.length === 0) {
      return "Use clear, simple language appropriate for middle school students.";
    }

    const descriptions: string[] = [];
    
    for (const level of levels) {
      if (level.levelType === 'CEFR' && level.cefrLevel) {
        const cefrDescriptions: Record<string, string> = {
          'A1': 'Use EXTREMELY simple words (3-5 letter words) that a beginner would know. Think: cat, dog, run, play, eat.',
          'A2': 'Use simple, common words. Short sentences. Basic vocabulary only.',
          'B1': 'Use everyday vocabulary. Clear, straightforward language.',
          'B2': 'Use common vocabulary with some variety. Standard language.',
          'C1': 'Use varied vocabulary. Natural, fluent language.',
          'C2': 'Use sophisticated vocabulary freely. Advanced language is acceptable.'
        };
        descriptions.push(cefrDescriptions[level.cefrLevel] || '');
      } else if (level.levelType === 'GRADE' && level.gradeLevel) {
        const gradeDescriptions: Record<string, string> = {
          'PRE_K': 'Use EXTREMELY simple 2-4 letter words only (cat, dog, red, run). Think preschool vocabulary.',
          'KINDERGARTEN': 'Use very basic 3-5 letter words (play, jump, ball, fun). Think kindergarten level.',
          'GRADE_1': 'Use simple sight words and basic vocabulary. Short, clear words.',
          'GRADE_2': 'Use basic elementary vocabulary. Simple, familiar words.',
          'GRADE_3': 'Use elementary school vocabulary. Clear, simple language.',
          'GRADE_4': 'Use upper elementary vocabulary. Straightforward language.',
          'GRADE_5': 'Use middle school vocabulary. Moderately complex words are okay.',
          'GRADE_6': 'Use middle school vocabulary. Some complex words acceptable.',
          'GRADE_7': 'Use junior high vocabulary. Clear but varied language.',
          'GRADE_8': 'Use junior high vocabulary. Moderately advanced language is fine.',
          'GRADE_9': 'Use high school vocabulary. Varied, standard language.',
          'GRADE_10': 'Use high school vocabulary. More complex language acceptable.',
          'GRADE_11': 'Use advanced high school vocabulary. Sophisticated language is fine.',
          'GRADE_12': 'Use college-prep vocabulary. Advanced language fully acceptable.'
        };
        descriptions.push(gradeDescriptions[level.gradeLevel] || '');
      }
    }

    if (descriptions.length === 0) {
      return "Use clear, simple language appropriate for middle school students.";
    }

    return descriptions.join(' ');
  };

  const vocabularyGuidance = getLevelDescription(levels);

  // Build the system prompt based on settings
  let systemPrompt = `You are an educational assistant evaluating a student's answer to a question about a video. 
The video topic is: ${topic}
The question is: "${questionText}"
The expected answer is: "${expectedAnswer}"

${videoTranscript ? `The video transcript contains the following text: "${videoTranscript.substring(0, 2000)}${videoTranscript.length > 2000 ? '...' : ''}"` : ''}

CRITICAL VOCABULARY REQUIREMENT: ${vocabularyGuidance}

Your task is to evaluate whether the student's answer demonstrates understanding of the video content and correctly addresses the question.`;

  // Add rules evaluation section
  if (rules.length > 0) {
    systemPrompt += `\n\nYou MUST evaluate the answer against these specific rules:\n`;
    rules.forEach((rule, index) => {
      systemPrompt += `${index + 1}. ${rule}\n`;
    });
  }

  systemPrompt += `\nIMPORTANT INSTRUCTIONS:
1. The answer is correct if it demonstrates a basic understanding of the relevant concept from the video and addresses the question asked.
2. Compare the student's answer to the expected answer for conceptual similarity, not exact wording.
3. The answer should be marked as incorrect ONLY if it:
   - Contains factually incorrect information
   - Shows clear misunderstanding of the video content
   - Completely fails to address the question asked
4. Spelling or grammatical errors should NOT cause the answer to be marked as incorrect unless they change the meaning significantly.
5. Be lenient with phrasing - focus on whether the student understood the concept.

Respond with a JSON object containing:
- 'isCorrect' (boolean): whether the answer demonstrates understanding of the concept
- 'feedback' (string): a very brief explanation about why the answer is correct or incorrect, in very basic language, in 10 words or less. IMPORTANT: Refer to the user as 'you' or 'your' instead of 'the student' or 'the user'.
${feedbackSettings.detailedFeedback ? `- 'details' (string): ⚠️ ABSOLUTELY CRITICAL ⚠️ 
  IF INCORRECT: You MUST give a HINT ONLY - NEVER say the actual answer word. Guide them with questions or clues.
  ❌ FORBIDDEN: Never say "${expectedAnswer}" or any word from it directly.
  ✅ ALLOWED: "Think about what sweet food comes from bees", "What did the bear want from the beehive?", "Remember what the bear was searching for in the tree"
  Use phrases like "Think about...", "Remember when...", "What was the bear looking for...", "Consider what..." 
  Keep it in very basic language matching the student's level. Maximum 15 words.
  IF CORRECT: Provide brief positive feedback instead.` : ''}
${feedbackSettings.encouragementEnabled ? '- \'encouragement\' (string): encouraging feedback in 3 or fewer words' : ''}`;

  // Build the user prompt
  const userPrompt = `Student's answer: "${studentAnswer}"\n\nEvaluate this answer against the question, expected answer, and rules provided.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    })

    const response = JSON.parse(completion.choices[0].message.content || '{"isCorrect": false, "feedback": "Unable to evaluate"}');
    
    return response;

  } catch (error) {
    console.error('Error in AI evaluation:', error)
    
    // Fallback to basic evaluation if AI fails
    const isCorrect = studentAnswer.toLowerCase().includes(expectedAnswer.toLowerCase().substring(0, 10))
    
    return {
      isCorrect,
      feedback: isCorrect 
        ? "Good job! Your answer shows understanding."
        : "Your answer could be improved. Try again!",
      details: feedbackSettings.detailedFeedback 
        ? "AI evaluation temporarily unavailable."
        : "",
      encouragement: feedbackSettings.encouragementEnabled 
        ? "Keep practicing!"
        : ""
    }
  }
} 