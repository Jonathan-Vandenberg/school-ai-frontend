import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../../lib/services'
import { z } from 'zod'

/**
 * POST /api/ielts/pronunciation/analyze
 * Analyze IELTS Pronunciation audio for preview functionality
 * Teachers and students can use this for preview/testing
 */
export async function POST(request: NextRequest) {
  try {
    // For preview functionality, we don't require authentication
    // This allows teachers to test assignments before creating them
    const body = await request.json();

    // Validate request data
    const analyzeSchema = z.object({
      audio_base64: z.string().min(1, 'Audio data is required'),
      audio_format: z.string().min(1, 'Audio format is required'),
      expected_text: z.string().min(1, 'Expected text is required'),
      accent: z.enum(['us', 'uk']).default('us'),
      raw_transcription: z.string().optional(), // Browser-provided raw transcription
    });

    const validatedData = analyzeSchema.parse(body);

    // Prepare request for audio-analysis backend
    const analysisRequest = {
      audio_base64: validatedData.audio_base64,
      audio_format: validatedData.audio_format,
      expected_text: validatedData.expected_text,
      raw_transcription: validatedData.raw_transcription, // Browser raw transcription
    };

    // Get audio analysis backend URL from environment
    const audioAnalysisUrl = process.env.AUDIO_ANALYSIS_URL || 'http://127.0.0.1:8000';
    const apiKey = process.env.AUDIO_ANALYSIS_API_KEY || 'test_client_key_123';

    // Determine the endpoint based on accent
    const endpoint = validatedData.accent === 'uk' 
      ? '/pronunciation-analysis/assess/uk' 
      : '/pronunciation-analysis/assess/us';

    // Call the audio-analysis backend
    const response = await fetch(`${audioAnalysisUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(analysisRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Audio analysis failed: ${response.status} - ${errorData}`);
    }

    const analysisResult = await response.json();

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error: any) {
    console.error('Error analyzing IELTS Pronunciation audio:', error);
    return handleServiceError(error);
  }
} 