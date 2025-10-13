import { NextRequest, NextResponse } from 'next/server'
import { AuthService, handleServiceError } from '@/lib/services'
import { postFormToAudioApi } from '@/app/lib/tenant-api'

// Audio analysis backend URL and API key
const AUDIO_ANALYSIS_URL = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8000'
const AUDIO_ANALYSIS_API_KEY = process.env.AUDIO_ANALYSIS_API_KEY

interface PronunciationAnalysisRequest {
  expected_text: string
  file: File
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await AuthService.getAuthenticatedUser()
    
    // Check if API key is configured
    if (!AUDIO_ANALYSIS_API_KEY) {
      return NextResponse.json({ 
        error: 'Service configuration error', 
        details: 'Audio analysis API key not configured' 
      }, { 
        status: 500 
      });
    }
    
    // Handle FormData request (pronunciation analysis requires audio)
    const formData = await request.formData()
    const expectedText = formData.get('expected_text') as string
    const audioFile = formData.get('file') as File

    console.log('🔍 Backend received:', {
      expectedText: expectedText,
      expectedTextLength: expectedText?.length,
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.type
    })

    // Validate required fields
    if (!expectedText) {
      return NextResponse.json({ 
        error: 'Failed to analyze pronunciation', 
        details: 'Missing required field: expected_text' 
      }, { 
        status: 400 
      });
    }

    if (!audioFile) {
      return NextResponse.json({ 
        error: 'Failed to analyze pronunciation', 
        details: 'Audio file is required for pronunciation analysis' 
      }, { 
        status: 400 
      });
    }

    // Create FormData for backend API
    const backendFormData = new FormData()
    backendFormData.append('expected_text', expectedText)
    backendFormData.append('file', audioFile)

    console.log('📊 Forwarding to FastAPI backend:', {
      expectedText: expectedText,
      expectedTextLength: expectedText.length,
      audioFileSize: audioFile.size,
      audioFileType: audioFile.type
    })

    try {
      // Use the tenant API helper to make the request
      const response = await postFormToAudioApi('/analyze/pronunciation', backendFormData)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Backend API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        
        return NextResponse.json({
          error: 'Backend analysis failed',
          details: `Audio analysis service returned ${response.status}: ${errorText}`
        }, { 
          status: response.status 
        });
      }

      const result = await response.json()
      
      console.log('✅ Pronunciation analysis completed:', {
        overallScore: result.pronunciation?.overall_score,
        wordCount: result.pronunciation?.words?.length
      })

      return NextResponse.json(result)

    } catch (fetchError: any) {
      console.error('❌ Network error calling backend API:', fetchError)
      
      return NextResponse.json({
        error: 'Network error',
        details: 'Failed to connect to audio analysis service'
      }, { 
        status: 503 
      });
    }

  } catch (error: any) {
    console.error('❌ Error in pronunciation analysis:', error)
    return handleServiceError(error)
  }
}
