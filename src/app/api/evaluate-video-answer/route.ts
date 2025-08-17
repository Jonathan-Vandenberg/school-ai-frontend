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
      topic 
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
      language: language?.name || 'English'
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
    language
  } = params

  // Build the system prompt based on settings
  let systemPrompt = `You are an educational assistant evaluating a student's answer to a question about a video. 
The video topic is: ${topic}
The question is: "${questionText}"
The expected answer is: "${expectedAnswer}"

${videoTranscript ? `The video transcript contains the following text: "${videoTranscript.substring(0, 2000)}${videoTranscript.length > 2000 ? '...' : ''}"` : ''}

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
${feedbackSettings.detailedFeedback ? '- \'details\' (string): feedback in very basic language, in 10 words or less. with suggestions for improvement. IMPORTANT: Do not give the user the actual correct answer. Give them a clue.' : ''}
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