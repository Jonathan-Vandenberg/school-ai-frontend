import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define voice mappings based on accent
const getVoiceForAccent = (accent?: string) => {
  // Default to 'nova' if no accent is specified
  if (!accent) return 'nova';
  
  // Select voice based on accent
  switch (accent.toUpperCase()) {
    case 'UK':
      return 'nova'; // British-sounding voice
    case 'US':
    default:
      return 'nova'; // American-sounding voice
  }
};

export async function POST(req: Request) {
  try {
    const { text, voice, accent } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Add small pauses before and after the word by adding spaces
    // This creates natural pauses without requiring SSML
    const paddedText = `  ${text}  `;

    // Determine which voice to use - use provided voice or derive from accent
    const selectedVoice = voice || getVoiceForAccent(accent);

    // Create speech parameters
    const speechParams = {
      model: 'tts-1', // Use the correct TTS model
      voice: selectedVoice as any, // Available voices: alloy, echo, fable, onyx, nova, shimmer
      input: paddedText,
      speed: 0.8, // Slightly slower speed for better clarity
      response_format: 'mp3' as const, // mp3, opus, aac, flac, wav, pcm
    };

    const response = await openai.audio.speech.create(speechParams);

    // Get the audio data as arrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for sending over JSON
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return NextResponse.json({ 
      audio: base64Audio,
      format: 'mp3',
      text,
      accent: accent || 'US',
      voice: selectedVoice
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
