import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { StudentWeeklyResultsService, StudentWeeklyResult } from '@/lib/services/student-weekly-results.service'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AIAnalysisRequest {
  studentResult: StudentWeeklyResult
  language: 'en' | 'vi'
}

interface AIAnalysisResponse {
  analysis: string
  recommendations: string[]
  strengths: string[]
  areasForImprovement: string[]
  overallAssessment: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement'
  assignmentAnalyses: AssignmentAnalysis[]
  parentGuidance: ParentGuidance
}

interface AssignmentAnalysis {
  assignmentId: string
  assignmentName: string
  analysis: string
  performance: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement'
  specificFeedback: string[]
  suggestions: string[]
}

interface ParentGuidance {
  praisePoints: string[]
  supportAreas: string[]
  specificActions: string[]
  encouragement: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'Service configuration error', 
        details: 'OpenAI API key not configured' 
      }, { 
        status: 500 
      })
    }

    const body: AIAnalysisRequest = await request.json()
    const { studentResult, language } = body

    if (!studentResult) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'Student result data is required' 
      }, { 
        status: 400 
      })
    }

    // Generate AI analysis
    const analysis = await generateAIAnalysis(studentResult, language)

    return NextResponse.json({
      success: true,
      data: analysis,
    })

  } catch (error) {
    console.error('Error in AI analysis API:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'Authentication required' 
      }, { 
        status: 401 
      })
    }

    return NextResponse.json({ 
      error: 'Internal server error', 
      details: 'Failed to generate AI analysis' 
    }, { 
      status: 500 
    })
  }
}

async function generateAIAnalysis(
  studentResult: StudentWeeklyResult,
  language: 'en' | 'vi'
): Promise<AIAnalysisResponse> {
  const { studentName, assignments, overallStats } = studentResult

  // Prepare data for AI analysis
  const assignmentSummary = assignments.map(a => ({
    topic: a.topic,
    type: a.type,
    isIELTS: a.isIELTS,
    completed: a.isComplete,
    score: a.score,
    questionsCompleted: a.questions.filter(q => q.isComplete).length,
    totalQuestions: a.questions.length,
    dueDate: a.dueDate,
    completedAt: a.completedAt,
  }))

  const systemPrompt = language === 'vi' 
    ? `Bạn là một giáo viên AI chuyên nghiệp, có kinh nghiệm trong việc phân tích tiến độ học tập của học sinh. 
    Nhiệm vụ của bạn là phân tích dữ liệu học tập hàng tuần và đưa ra nhận xét, đánh giá chi tiết về tiến độ học tập của học sinh.
    
    Hãy phân tích dữ liệu một cách khách quan, tích cực và mang tính xây dựng. 
    Tập trung vào những điểm mạnh, điểm cần cải thiện và đưa ra các khuyến nghị cụ thể.
    
    Đưa ra phân tích chi tiết về:
    - Hiệu suất học tập tổng thể
    - Chất lượng hoàn thành bài tập
    - Xu hướng tiến bộ
    - Các lĩnh vực cần chú ý đặc biệt
    - Khuyến nghị cụ thể cho phụ huynh và học sinh
    
    Trả lời bằng tiếng Việt, sử dụng ngôn ngữ phù hợp với phụ huynh học sinh.`
    : `You are a professional AI teacher with extensive experience in analyzing student learning progress. 
    Your task is to analyze weekly learning data and provide detailed insights, assessments, and recommendations about the student's academic progress.
    
    Analyze the data objectively, positively, and constructively. 
    Focus on strengths, areas for improvement, and provide specific recommendations.
    
    Provide detailed analysis on:
    - Overall learning performance
    - Quality of assignment completion
    - Progress trends
    - Areas requiring special attention
    - Specific recommendations for parents and students
    
    Respond in English using language appropriate for parents.`

  const userPrompt = language === 'vi'
    ? `Hãy phân tích tiến độ học tập hàng tuần của học sinh ${studentName}:

THỐNG KÊ TỔNG QUAN:
- Tổng bài tập: ${overallStats.totalAssignments}
- Bài tập đã hoàn thành: ${overallStats.completedAssignments}
- Điểm trung bình: ${overallStats.averageScore}%
- Tỷ lệ hoàn thành: ${overallStats.completionRate}%

CHI TIẾT BÀI TẬP:
${assignmentSummary.map(a => `
- ${a.topic} (${a.type}${a.isIELTS ? ' - IELTS' : ''})
  Trạng thái: ${a.completed ? 'Hoàn thành' : 'Chưa hoàn thành'}
  ${a.score !== null && a.score !== undefined ? `Điểm: ${a.score}%` : 'Chưa có điểm'}
  Câu hỏi: ${a.questionsCompleted}/${a.totalQuestions}
  ${a.dueDate ? `Hạn nộp: ${new Date(a.dueDate).toLocaleDateString('vi-VN')}` : ''}
  ${a.completedAt ? `Hoàn thành: ${new Date(a.completedAt).toLocaleDateString('vi-VN')}` : ''}
`).join('')}

Hãy cung cấp phân tích chi tiết bao gồm:
1. Đánh giá tổng quan về tiến độ học tập và chất lượng hoàn thành bài tập
2. Phân tích chi tiết từng bài tập riêng biệt
3. Phân tích các điểm mạnh của học sinh
4. Xác định các lĩnh vực cần cải thiện
5. Đưa ra khuyến nghị cụ thể cho phụ huynh và học sinh
6. Hướng dẫn cụ thể cho phụ huynh về cách hỗ trợ con
7. Đánh giá tổng thể (excellent/good/satisfactory/needs_improvement)

Trả lời bằng JSON với format:
{
  "analysis": "phân tích chi tiết và toàn diện về tiến độ học tập, chất lượng hoàn thành bài tập, xu hướng tiến bộ, và các điểm cần chú ý...",
  "recommendations": ["khuyến nghị cụ thể 1", "khuyến nghị cụ thể 2", "khuyến nghị cụ thể 3"],
  "strengths": ["điểm mạnh 1", "điểm mạnh 2", "điểm mạnh 3"],
  "areasForImprovement": ["điểm cần cải thiện 1", "điểm cần cải thiện 2"],
  "overallAssessment": "excellent|good|satisfactory|needs_improvement",
  "assignmentAnalyses": [
    {
      "assignmentId": "assignment_id",
      "assignmentName": "Tên bài tập",
      "analysis": "Phân tích chi tiết về hiệu suất của học sinh trong bài tập này",
      "performance": "excellent|good|satisfactory|needs_improvement",
      "specificFeedback": ["phản hồi cụ thể 1", "phản hồi cụ thể 2"],
      "suggestions": ["gợi ý cải thiện 1", "gợi ý cải thiện 2"]
    }
  ],
  "parentGuidance": {
    "praisePoints": ["điểm đáng khen ngợi 1", "điểm đáng khen ngợi 2"],
    "supportAreas": ["lĩnh vực cần hỗ trợ 1", "lĩnh vực cần hỗ trợ 2"],
    "specificActions": ["hành động cụ thể phụ huynh có thể làm 1", "hành động cụ thể 2"],
    "encouragement": "Lời động viên tích cực và khích lệ cho học sinh"
  }
}`
    : `Please analyze the weekly learning progress of student ${studentName}:

OVERALL STATISTICS:
- Total assignments: ${overallStats.totalAssignments}
- Completed assignments: ${overallStats.completedAssignments}
- Average score: ${overallStats.averageScore}%
- Completion rate: ${overallStats.completionRate}%

ASSIGNMENT DETAILS:
${assignmentSummary.map(a => `
- ${a.topic} (${a.type}${a.isIELTS ? ' - IELTS' : ''})
  Status: ${a.completed ? 'Completed' : 'Not completed'}
  ${a.score !== null && a.score !== undefined ? `Score: ${a.score}%` : 'No score yet'}
  Questions: ${a.questionsCompleted}/${a.totalQuestions}
  ${a.dueDate ? `Due: ${new Date(a.dueDate).toLocaleDateString()}` : ''}
  ${a.completedAt ? `Completed: ${new Date(a.completedAt).toLocaleDateString()}` : ''}
`).join('')}

Please provide detailed analysis including:
1. Overall assessment of learning progress and assignment completion quality
2. Detailed analysis of each individual assignment
3. Analysis of student strengths
4. Identification of areas for improvement
5. Specific recommendations for parents and students
6. Specific guidance for parents on how to support their child
7. Overall assessment (excellent/good/satisfactory/needs_improvement)

Respond in JSON format:
{
  "analysis": "detailed and comprehensive analysis of learning progress, assignment completion quality, progress trends, and areas requiring attention...",
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area for improvement 1", "area for improvement 2"],
  "overallAssessment": "excellent|good|satisfactory|needs_improvement",
  "assignmentAnalyses": [
    {
      "assignmentId": "assignment_id",
      "assignmentName": "Assignment Name",
      "analysis": "Detailed analysis of student's performance on this specific assignment",
      "performance": "excellent|good|satisfactory|needs_improvement",
      "specificFeedback": ["specific feedback 1", "specific feedback 2"],
      "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
    }
  ],
  "parentGuidance": {
    "praisePoints": ["praise point 1", "praise point 2"],
    "supportAreas": ["area needing support 1", "area needing support 2"],
    "specificActions": ["specific action parent can take 1", "specific action 2"],
    "encouragement": "Positive encouragement and motivation for the student"
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    try {
      const parsedResponse = JSON.parse(responseText)
      return parsedResponse as AIAnalysisResponse
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError)
      console.error('Raw response:', responseText)
      
      // Fallback: return a structured response even if JSON parsing fails
      return {
        analysis: responseText,
        recommendations: [
          language === 'vi' 
            ? 'Tiếp tục duy trì thói quen học tập tốt và hoàn thành bài tập đúng hạn'
            : 'Continue maintaining good study habits and completing assignments on time'
        ],
        strengths: [
          language === 'vi' 
            ? 'Có tiến độ học tập tích cực'
            : 'Shows positive learning progress'
        ],
        areasForImprovement: [
          language === 'vi' 
            ? 'Có thể cải thiện tỷ lệ hoàn thành bài tập'
            : 'Can improve assignment completion rate'
        ],
        overallAssessment: overallStats.completionRate >= 80 ? 'good' : 'satisfactory',
        assignmentAnalyses: assignmentSummary.map(a => ({
          assignmentId: a.topic.replace(/\s+/g, '_').toLowerCase(),
          assignmentName: a.topic,
          analysis: language === 'vi' 
            ? `Học sinh ${a.completed ? 'đã hoàn thành' : 'chưa hoàn thành'} bài tập này với ${a.score || 0}% điểm số.`
            : `Student ${a.completed ? 'completed' : 'has not completed'} this assignment with ${a.score || 0}% score.`,
          performance: (a.score || 0) >= 80 ? 'excellent' : (a.score || 0) >= 60 ? 'good' : 'needs_improvement',
          specificFeedback: [
            language === 'vi' 
              ? `${a.completed ? 'Hoàn thành tốt' : 'Cần hoàn thành'} bài tập`
              : `${a.completed ? 'Well completed' : 'Needs completion'} assignment`
          ],
          suggestions: [
            language === 'vi' 
              ? a.completed ? 'Tiếp tục duy trì chất lượng' : 'Cần tập trung hoàn thành'
              : a.completed ? 'Continue maintaining quality' : 'Focus on completion'
          ]
        })),
        parentGuidance: {
          praisePoints: [
            language === 'vi' 
              ? 'Học sinh đã thể hiện sự chăm chỉ'
              : 'Student has shown dedication'
          ],
          supportAreas: [
            language === 'vi' 
              ? 'Hỗ trợ hoàn thành bài tập đúng hạn'
              : 'Support timely assignment completion'
          ],
          specificActions: [
            language === 'vi' 
              ? 'Kiểm tra tiến độ học tập hàng ngày'
              : 'Check daily learning progress'
          ],
          encouragement: language === 'vi' 
            ? 'Hãy tiếp tục cố gắng và học tập chăm chỉ!'
            : 'Keep up the great work and continue studying hard!'
        }
      }
    }

  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to generate AI analysis')
  }
}

/**
 * Get AI analysis for a specific student's weekly results
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const weekStart = searchParams.get('weekStart')
    const weekEnd = searchParams.get('weekEnd')
    const language = searchParams.get('language') as 'en' | 'vi' || 'en'

    if (!studentId || !weekStart || !weekEnd) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'studentId, weekStart, and weekEnd are required' 
      }, { 
        status: 400 
      })
    }

    // Get student weekly results
    const studentResult = await StudentWeeklyResultsService.getStudentWeeklyResult(
      studentId,
      new Date(weekStart),
      new Date(weekEnd)
    )

    if (!studentResult) {
      return NextResponse.json({ 
        error: 'Not found', 
        details: 'No data found for the specified student and week' 
      }, { 
        status: 404 
      })
    }

    // Generate AI analysis
    const analysis = await generateAIAnalysis(studentResult, language)

    return NextResponse.json({
      success: true,
      data: {
        studentResult,
        analysis,
      },
    })

  } catch (error) {
    console.error('Error in AI analysis GET API:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'Authentication required' 
      }, { 
        status: 401 
      })
    }

    return NextResponse.json({ 
      error: 'Internal server error', 
      details: 'Failed to generate AI analysis' 
    }, { 
      status: 500 
    })
  }
}
