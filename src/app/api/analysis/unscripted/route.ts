import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'

// Audio analysis backend URL
const AUDIO_ANALYSIS_URL = process.env.AUDIO_ANALYSIS_URL || 'http://127.0.0.1:8000'

interface AnalysisRequest {
  expectedText?: string
  browserTranscript?: string
  analysisType?: string
  audioFile?: File
  questionText?: string
  context?: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const currentUser = await AuthService.getAuthenticatedUser()
    
    const contentType = request.headers.get('content-type')
    let expectedText: string | undefined
    let browserTranscript: string | undefined
    let analysisType: string | undefined
    let audioFile: File | undefined
    let questionText: string | undefined
    let context: string | undefined

    // Handle both JSON (text-based) and FormData (audio-based) requests
    if (contentType?.includes('multipart/form-data')) {
      // FormData request (with audio)
      const formData = await request.formData()
      expectedText = formData.get('expectedText') as string || undefined
      browserTranscript = formData.get('browserTranscript') as string || undefined
      analysisType = formData.get('analysisType') as string || undefined
      audioFile = formData.get('audioFile') as File || undefined
      questionText = formData.get('questionText') as string || undefined
      context = formData.get('context') as string || undefined
    } else {
      // JSON request (text-based)
      const body: AnalysisRequest = await request.json()
      expectedText = body.expectedText
      browserTranscript = body.browserTranscript
      analysisType = body.analysisType
      questionText = body.questionText
      context = body.context
    }

    // For IELTS assignments, we need the actual response text for analysis
    const responseText = browserTranscript || expectedText || ''
    
    if (!responseText.trim()) {
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: 'No text available for analysis' 
      }, { 
        status: 400 
      });
    }

    // Create FormData for the audio analysis API
    const backendFormData = new FormData()
    
    // Add audio file if provided
    if (audioFile) {
      backendFormData.append('file', audioFile)
    } else {
      // Create a minimal dummy file for the backend
      const webmHeader = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, // EBML
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x23, // Header length
        0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, // doctype = "webm"
        0x42, 0x87, 0x81, 0x02, // version
        0x42, 0x85, 0x81, 0x02, // read version
        0x42, 0xf3, 0x81, 0x08, // Segment
        0x18, 0x53, 0x80, 67, // Info
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

    // Set parameters for IELTS analysis
    backendFormData.append('browser_transcript', responseText)
    backendFormData.append('use_audio', 'true')
    backendFormData.append('deep_analysis', 'true')
    
    // Add question and context for IELTS analysis
    if (questionText) {
      backendFormData.append('question_text', questionText)
    }
    if (context) {
      backendFormData.append('context', context)
    }

    // Call the audio analysis backend (it now handles all AI analysis when deep_analysis=true)
    let response
    try {
      const url = `${AUDIO_ANALYSIS_URL}/analyze/unscripted`
      
      response = await fetch(url, {
        method: 'POST',
        body: backendFormData,
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
      })

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
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: `Connection failed to audio analysis backend at ${AUDIO_ANALYSIS_URL}. Error: ${(fetchError as Error).message}` 
      }, { 
        status: 500 
      });
    }

    const analysisResult = await response.json()
    
    // Transform the backend response to match our frontend expectations
    const transformedResult = {
      transcribed_text: analysisResult.predicted_text,
      pronunciation: analysisResult.pronunciation,
      grammar: analysisResult.grammar,
      relevance: analysisResult.relevance,
      ielts_score: analysisResult.ielts_score,
      metrics: analysisResult.metrics,
      processing_time_ms: Date.now(),
      confidence_level: 85 // Default confidence level
    }

    // Return comprehensive IELTS analysis
    return NextResponse.json({
      success: true,
      analysis: transformedResult
    });
    
  } catch (error: any) {
    console.error('Error in IELTS speech analysis:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to analyze speech', 
      details: errorMessage 
    }, { 
      status: error.status || 500 
    });
  }
}


