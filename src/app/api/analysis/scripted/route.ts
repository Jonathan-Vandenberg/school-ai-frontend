import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { postFormToAudioApi } from '@/app/lib/tenant-api'

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
  console.log('🚀 [API] Scripted analysis request received')
  
  try {
    // Authenticate user
    await AuthService.getAuthenticatedUser()
    console.log('🚀 [API] User authenticated successfully')
    
    // Check if API key is configured
    if (!AUDIO_ANALYSIS_API_KEY) {
      console.error('🚀 [API] Audio analysis API key not configured')
      return NextResponse.json({ 
        error: 'Service configuration error', 
        details: 'Audio analysis API key not configured' 
      }, { 
        status: 500 
      });
    }
    
    const contentType = request.headers.get('content-type')
    console.log('🚀 [API] Content type:', contentType)
    
    let expectedText: string
    let browserTranscript: string | undefined
    let analysisType: string | undefined
    let audioFile: File | undefined

    // Handle both JSON (reading) and FormData (pronunciation with audio)
    if (contentType?.includes('multipart/form-data')) {
      // FormData request (pronunciation with audio)
      console.log('🚀 [API] Processing FormData request')
      const formData = await request.formData()
      expectedText = formData.get('expectedText') as string
      browserTranscript = formData.get('browserTranscript') as string || undefined
      analysisType = formData.get('analysisType') as string || undefined
      audioFile = formData.get('audioFile') as File || undefined
      
      console.log('🚀 [API] FormData extracted:', {
        expectedTextLength: expectedText?.length || 0,
        browserTranscriptLength: browserTranscript?.length || 0,
        analysisType,
        audioFileSize: audioFile?.size || 0,
        audioFileName: audioFile?.name || 'none'
      })
    } else {
      // JSON request (reading without audio)
      console.log('🚀 [API] Processing JSON request')
      const body: AnalysisRequest = await request.json()
      expectedText = body.expectedText
      browserTranscript = body.browserTranscript
      analysisType = body.analysisType
      
      console.log('🚀 [API] JSON extracted:', {
        expectedTextLength: expectedText?.length || 0,
        browserTranscriptLength: browserTranscript?.length || 0,
        analysisType
      })
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
    
    // Handle browser transcript vs audio transcription fallback
    const hasBrowserTranscript = cleanBrowserTranscript && cleanBrowserTranscript.length > 0
    const hasAudioFile = audioFile && audioFile.size > 0
    
    console.log('🚀 [API] Transcript/Audio decision:', {
      hasBrowserTranscript,
      browserTranscriptLength: cleanBrowserTranscript?.length || 0,
      hasAudioFile,
      audioFileSize: audioFile?.size || 0
    })
    
    if (hasBrowserTranscript) {
      // Use browser transcript if available
      console.log('🚀 [API] Using browser transcript')
      backendFormData.append('browser_transcript', cleanBrowserTranscript)
      backendFormData.append('use_audio', 'false')
    } else if (hasAudioFile) {
      // If no browser transcript but we have audio, let backend use Whisper
      // Send empty browser transcript and tell backend to use audio transcription
      console.log('🚀 [API] No browser transcript available, falling back to Whisper transcription from audio')
      backendFormData.append('browser_transcript', '')
      backendFormData.append('use_audio', 'true')
    } else {
      // No transcript and no audio - this is an error case
      console.error('🚀 [API] No transcript or audio file provided')
      return NextResponse.json({ 
        error: 'Failed to analyze speech', 
        details: 'No transcript or audio file provided for analysis' 
      }, { 
        status: 400 
      });
    }
    
    if (analysisType) {
      backendFormData.append('analysis_type', analysisType)
    }
    
    // Add audio file if provided
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
      const path = analysisType === 'PRONUNCIATION' ? '/analyze/pronunciation' : '/analyze/scripted'
      console.log('🚀 [API] Calling backend API:', {
        path,
        url: `${AUDIO_ANALYSIS_URL}${path}`,
        hasExpectedText: !!cleanExpectedText,
        hasBrowserTranscript,
        hasAudioFile,
        useAudio: hasAudioFile ? 'true' : 'false'
      })
      
      response = await postFormToAudioApi(path, backendFormData)

      console.log('🚀 [API] Backend response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🚀 [API] Audio analysis API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        return NextResponse.json({ 
          error: 'Failed to analyze speech', 
          details: `Audio analysis service error: ${response.status} - ${errorText}` 
        }, { 
          status: 500 
        });
      }
    } catch (fetchError) {
      console.error('🚀 [API] Fetch error to audio analysis backend:', fetchError)
      console.error('🚀 [API] Full error details:', {
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
    
    if (overallScore === 0) {
      // Zero score indicates wrong text for reading assignments
      feedback = 'Please read the exact text shown. Try again!'
      encouragement = 'Keep trying!'
    } else if (overallScore >= 90) {
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
