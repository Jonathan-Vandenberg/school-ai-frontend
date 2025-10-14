import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services'
import { postFormToAudioApi } from '@/app/lib/tenant-api'

// Audio analysis API key
const AUDIO_ANALYSIS_API_KEY = process.env.AUDIO_ANALYSIS_API_KEY

export async function POST(request: NextRequest) {
  console.log('🎤 [WHISPER] Transcription request received')
  
  try {
    // Authenticate user
    await AuthService.getAuthenticatedUser()
    console.log('🎤 [WHISPER] User authenticated successfully')
    
    // Check if API key is configured
    if (!AUDIO_ANALYSIS_API_KEY) {
      console.error('🎤 [WHISPER] Audio analysis API key not configured')
      return NextResponse.json({ 
        error: 'Service configuration error', 
        details: 'Audio analysis API key not configured' 
      }, { 
        status: 500 
      });
    }
    
    const contentType = request.headers.get('content-type')
    console.log('🎤 [WHISPER] Content type:', contentType)
    
    if (!contentType?.includes('multipart/form-data')) {
      console.error('🎤 [WHISPER] Invalid content type, expected multipart/form-data')
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'Expected multipart/form-data with audio file' 
      }, { 
        status: 400 
      });
    }

    // Extract audio file from FormData
    const formData = await request.formData()
    const audioFile = formData.get('audioFile') as File || formData.get('file') as File
    
    if (!audioFile) {
      console.error('🎤 [WHISPER] No audio file provided')
      return NextResponse.json({ 
        error: 'Missing audio file', 
        details: 'Audio file is required for transcription' 
      }, { 
        status: 400 
      });
    }

    console.log('🎤 [WHISPER] Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // Validate audio file size
    if (audioFile.size < 100) {
      console.error('🎤 [WHISPER] Audio file too small:', audioFile.size)
      return NextResponse.json({ 
        error: 'Invalid audio file', 
        details: 'Audio file is too small' 
      }, { 
        status: 400 
      });
    }

    // Create FormData for the audio analysis API (Whisper transcription only)
    const backendFormData = new FormData()
    backendFormData.append('file', audioFile)
    backendFormData.append('transcribe_only', 'true') // Tell backend we only want transcription
    
    console.log('🎤 [WHISPER] Calling /analyze/transcribe endpoint')

    // Call the audio analysis backend for transcription only
    let response
    try {
      response = await postFormToAudioApi('/analyze/transcribe', backendFormData)

      console.log('🎤 [WHISPER] Transcribe API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎤 [WHISPER] Transcribe API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        return NextResponse.json({ 
          error: 'Transcription failed', 
          details: `Transcription service error: ${response.status} - ${errorText}` 
        }, { 
          status: 500 
        });
      }
    } catch (fetchError) {
      console.error('🎤 [WHISPER] Fetch error to transcription backend:', fetchError)
      return NextResponse.json({ 
        error: 'Transcription failed', 
        details: `Connection failed to transcription backend. Error: ${(fetchError as Error).message}` 
      }, { 
        status: 500 
      });
    }

    const result = await response.json()
    console.log('🎤 [WHISPER] Transcription successful:', {
      hasText: !!result.text,
      textLength: result.text?.length || 0
    })
    
    // Return the transcription result
    return NextResponse.json({
      success: true,
      transcript: result.text || result.predicted_text || '',
      confidence: result.confidence || 0.85,
      processing_time_ms: result.processing_time_ms || Date.now()
    })

  } catch (error) {
    console.error('🎤 [WHISPER] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { 
      status: 500 
    });
  }
}
