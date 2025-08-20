import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'

// Audio analysis backend URL and API key
const AUDIO_ANALYSIS_URL = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'
const AUDIO_ANALYSIS_API_KEY = process.env.AUDIO_ANALYSIS_API_KEY

interface AnalysisRequest {
  expectedText: string
  browserTranscript?: string
  analysisType?: string
  audioFile?: File
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    // Check if API key is configured
    if (!AUDIO_ANALYSIS_API_KEY) {
      return NextResponse.json({ 
        error: 'Service configuration error', 
        details: 'Audio analysis API key not configured' 
      }, { 
        status: 500 
      });
    }
    
    const contentType = request.headers.get('content-type')
    let expectedText: string
    let browserTranscript: string | undefined
    let analysisType: string | undefined
    let audioFile: File | undefined

    // Handle both JSON (reading) and FormData (pronunciation with audio)
    if (contentType?.includes('multipart/form-data')) {
      // FormData request (pronunciation with audio)
      const formData = await request.formData()
      expectedText = formData.get('expectedText') as string
      browserTranscript = formData.get('browserTranscript') as string || undefined
      analysisType = formData.get('analysisType') as string || undefined
      audioFile = formData.get('audioFile') as File || undefined
    } else {
      // JSON request (reading without audio)
      const body: AnalysisRequest = await request.json()
      expectedText = body.expectedText
      browserTranscript = body.browserTranscript
      analysisType = body.analysisType
    }

    // Validate required fields
    if (!expectedText) {
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: 'Missing required fields: expectedText' 
      }, { 
        status: 400 
      });
    }

    // For pronunciation analysis, audio file is required
    if (analysisType === 'PRONUNCIATION' && !audioFile) {
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: 'Audio file is required for pronunciation analysis' 
      }, { 
        status: 400 
      });
    }

    // Clean expectedText and browserTranscript
    const cleanExpectedText = expectedText.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim()
    const cleanBrowserTranscript = browserTranscript?.replace(/\\n/g, ' ').replace(/\n/g, ' ').trim()
    
    // Create FormData for the audio analysis API
    const backendFormData = new FormData()
    backendFormData.append('expected_text', cleanExpectedText)
    if (cleanBrowserTranscript) {
      backendFormData.append('browser_transcript', cleanBrowserTranscript)
    }
    
    // Add audio file if provided (for pronunciation analysis)
    if (audioFile) {
      backendFormData.append('file', audioFile)
    } else {
      // For scripted analysis without audio, create a minimal dummy file
      const webmHeader = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, // EBML
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x23, // Header length
        0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, // doctype = "webm"
        0x42, 0x87, 0x81, 0x02, // version
        0x42, 0x85, 0x81, 0x02, // read version
        0x42, 0xf3, 0x81, 0x08, // Segment
        0x18, 0x53, 0x80, 0x67, // Info
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x19,
        0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40, // Timecode scale
        0x4d, 0x80, 0x84, 0x6f, 0x70, 0x75, 0x73, // Codec = opus
        0x16, 0x54, 0xae, 0x6b, // Tracks
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2f,
        0xae, 0x83, 0x01, 0x00, 0x00, 0x28, // Track entry
        0xd7, 0x81, 0x01, // Track number
        0x73, 0xc5, 0x81, 0x01, // Track UID
        0x83, 0x81, 0x02, // Track type (audio)
        0x86, 0x84, 0x6f, 0x70, 0x75, 0x73, // Codec ID = opus
        0x1f, 0x43, 0xb6, 0x75, // Cluster
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c,
        0xe7, 0x81, 0x00, // Timecode
        0xa3, 0x81, 0x00, 0x81, 0x00, 0x01 // Simple block with minimal data
      ])
      const dummyBlob = new Blob([webmHeader], { type: 'audio/webm' })
      backendFormData.append('file', dummyBlob, 'dummy.webm')
    }

    // Call the audio analysis backend
    let response
    try {
      const url = analysisType === 'PRONUNCIATION' ? `${AUDIO_ANALYSIS_URL}/analyze/pronunciation` : `${AUDIO_ANALYSIS_URL}/analyze/scripted`

      response = await fetch(url, {
        method: 'POST',
        body: backendFormData,
        headers: {
          'Authorization': `Bearer ${AUDIO_ANALYSIS_API_KEY}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
      })

      console.log('URL:', url)
      console.log('FormData:', backendFormData)

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
