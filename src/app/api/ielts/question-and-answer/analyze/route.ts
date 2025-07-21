import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../../../lib/services/auth.service'
import { handleServiceError } from '../../../../../../lib/services'
import { z } from 'zod'

/**
 * POST /api/ielts/question-and-answer/analyze
 * Analyze IELTS Question & Answer audio for preview functionality
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
      question: z.string().min(1, 'Question is required'),
      expected_language_level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
      accent: z.enum(['us', 'uk']).default('us'),
      raw_transcription: z.string().optional(), // Browser-provided raw transcription
    });

    const validatedData = analyzeSchema.parse(body);

    // Prepare request for audio-analysis backend (remove accent field as backend doesn't expect it)
    const analysisRequest = {
      audio_base64: validatedData.audio_base64,
      audio_format: validatedData.audio_format,
      question: validatedData.question,
      expected_language_level: validatedData.expected_language_level,
      scoring_criteria: 'ielts', // Always use IELTS scoring for IELTS assignments
      raw_transcription: validatedData.raw_transcription, // Browser raw transcription (what user actually said)
    };

    // Get audio analysis backend URL from environment
    const audioAnalysisUrl = process.env.AUDIO_ANALYSIS_URL || 'http://127.0.0.1:8000';
    const apiKey = process.env.AUDIO_ANALYSIS_API_KEY || 'test_client_key_123';

    // Call the audio-analysis backend
    const response = await fetch(`${audioAnalysisUrl}/freestyle-speech/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(analysisRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Audio analysis backend error: ${response.status} - ${errorData}`);
      throw new Error(`Audio analysis failed: ${response.status} - ${errorData}`);
    }

    const analysisResult = await response.json();

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error: any) {
    console.error('Error analyzing IELTS Q&A audio:', error);
    return handleServiceError(error);
  }
} 