import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'

// Audio analysis backend URL
const AUDIO_ANALYSIS_URL = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'

interface AnalysisRequest {
  expectedText: string
  browserTranscript: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const body: AnalysisRequest = await request.json()
    const { expectedText, browserTranscript } = body

    // Validate required fields
    if (!expectedText || !browserTranscript) {
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: 'Missing required fields: expectedText or browserTranscript' 
      }, { 
        status: 400 
      });
    }

    // Clean expectedText and browserTranscript
    const cleanExpectedText = expectedText.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim()
    const cleanBrowserTranscript = browserTranscript.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim()
    
    console.log('Sending to audio analysis:', {
      expectedText: cleanExpectedText,
      browserTranscript: cleanBrowserTranscript
    })
    
    // Create FormData for the audio analysis API (no audio file needed)
    const formData = new FormData()
    formData.append('expected_text', cleanExpectedText)
    formData.append('browser_transcript', cleanBrowserTranscript)

    // Call the audio analysis backend
    let response
    try {
      console.log('Attempting to connect to:', `${AUDIO_ANALYSIS_URL}/analyze/scripted`)
      console.log('FormData contents:', {
        expected_text: cleanExpectedText,
        browser_transcript: cleanBrowserTranscript
      })

      response = await fetch(`${AUDIO_ANALYSIS_URL}/analyze/scripted`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Audio analysis API error:', errorText)
        return NextResponse.json({ 
          error: 'Failed to analyze speech', 
          details: `Audio analysis service error: ${response.status} - ${errorText}` 
        }, { 
          status: 500 
        });
      }
    } catch (fetchError) {
      console.error('Fetch error to audio analysis backend:', fetchError)
      console.error('Full error details:', {
        message: (fetchError as Error).message,
        stack: (fetchError as Error).stack,
        url: `${AUDIO_ANALYSIS_URL}/analyze/scripted`
      })
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: `Connection failed to audio analysis backend at ${AUDIO_ANALYSIS_URL}. Error: ${(fetchError as Error).message}` 
      }, { 
        status: 500 
      });
    }

    const analysisResult = await response.json()
    
    // Calculate overall correctness based on pronunciation scores
    const overallScore = analysisResult.pronunciation?.overall_score || 0
    const isCorrect = overallScore >= 70 // Consider 70+ as correct
    
    // Generate simple feedback based on score
    let feedback = ''
    let encouragement = ''
    
    if (overallScore >= 90) {
      feedback = 'Excellent pronunciation! Keep it up!'
      encouragement = 'Amazing!'
    } else if (overallScore >= 80) {
      feedback = 'Very good! Small improvements possible.'
      encouragement = 'Great job!'
    } else if (overallScore >= 70) {
      feedback = 'Good effort! Practice makes perfect.'
      encouragement = 'Keep trying!'
    } else if (overallScore >= 50) {
      feedback = 'Good attempt! Focus on difficult sounds.'
      encouragement = 'You can do it!'
    } else {
      feedback = 'Keep practicing! Break down difficult words.'
      encouragement = 'Don\'t give up!'
    }

    return NextResponse.json({
      success: true,
      analysis: {
        isCorrect,
        feedback,
        encouragement,
        pronunciationResult: analysisResult.pronunciation,
        predictedText: analysisResult.predicted_text,
        overallScore
      },
      isCorrect
    });
    
  } catch (error: any) {
    console.error('Error in speech analysis:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to analyze speech', 
      details: errorMessage 
    }, { 
      status: error.status || 500 
    });
  }
}
