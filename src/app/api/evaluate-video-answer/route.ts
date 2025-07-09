import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../lib/services/auth.service'
import OpenAI from 'openai'

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

    // Use OpenAI to evaluate the student's answer
    const evaluation = await evaluateAnswerWithAI({
      studentAnswer: answer,
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

  // Create a comprehensive system prompt for evaluation
  const systemPrompt = `You are an expert language teacher evaluating a student's spoken response to a video comprehension question. 

**Context:**
- Topic: ${topic}
- Language: ${language}
- Question: ${questionText}
- Expected Answer: ${expectedAnswer}
${videoTranscript ? `- Video Transcript: ${videoTranscript.substring(0, 1000)}...` : ''}

**Evaluation Rules:**
${rules.length > 0 ? rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n') : 'No specific rules provided.'}

**Your Task:**
Evaluate the student's spoken response and provide:
1. **isCorrect**: Boolean - true if the answer demonstrates understanding of the key concepts
2. **feedback**: String - Clear, constructive feedback (2-3 sentences)
3. **details**: String - Detailed analysis if requested (what was good, what could be improved)
4. **encouragement**: String - Motivational message if requested
5. **ruleEvaluation**: Object - For each rule, indicate if passed and provide specific feedback

**Evaluation Criteria:**
- Content accuracy and relevance to the question
- Demonstration of understanding key concepts from the video
- Adherence to specified rules
- Language appropriateness for the level
- Overall comprehension shown

Be fair but encouraging. Consider that this is spoken language, so minor grammatical errors or filler words are acceptable.

Return your evaluation as a JSON object with the exact structure requested.`

  const userPrompt = `Please evaluate this student response:

**Student's Answer:** "${studentAnswer}"

Provide your evaluation following the criteria and format specified.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for more consistent evaluation
    })

    const evaluationContent = completion.choices[0].message?.content
    if (!evaluationContent) {
      throw new Error('No evaluation content received from AI')
    }

    const evaluation = JSON.parse(evaluationContent)

    // Ensure we have the required fields with fallbacks
    return {
      isCorrect: evaluation.isCorrect || false,
      feedback: evaluation.feedback || "Thank you for your response. Keep practicing!",
      details: feedbackSettings.detailedFeedback ? (evaluation.details || "") : "",
      encouragement: feedbackSettings.encouragementEnabled ? (evaluation.encouragement || "Keep up the good work!") : "",
      ruleEvaluation: evaluation.ruleEvaluation || {}
    }

  } catch (error) {
    console.error('Error in AI evaluation:', error)
    
    // Fallback to basic evaluation if AI fails
    const isCorrect = studentAnswer.toLowerCase().includes(expectedAnswer.toLowerCase().substring(0, 10))
    
    return {
      isCorrect,
      feedback: isCorrect 
        ? "Good job! Your answer shows understanding of the key concepts."
        : "Your answer could be improved. Try to include more details from the video.",
      details: feedbackSettings.detailedFeedback 
        ? "AI evaluation temporarily unavailable. Basic evaluation applied."
        : "",
      encouragement: feedbackSettings.encouragementEnabled 
        ? "Keep practicing - you're doing great!"
        : "",
      ruleEvaluation: {}
    }
  }
} 