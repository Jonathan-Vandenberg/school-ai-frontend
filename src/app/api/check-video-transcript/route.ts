import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        console.error("APIFY_API_TOKEN is not set");
        return NextResponse.json({ error: 'Apify API token is not configured.' }, { status: 500 });
    }

    const apifyUrl = 'https://api.apify.com/v2/acts/topaz_sharingan~youtube-transcript-scraper-1/run-sync-get-dataset-items';

    const apifyResponse = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`
      },
      body: JSON.stringify({
        startUrls: [videoUrl],
      }),
    });

    if (!apifyResponse.ok) {
        const errorText = await apifyResponse.text();
        console.error(`Apify API error (${apifyResponse.status}):`, errorText);
        return NextResponse.json({ error: 'Failed to fetch transcript from Apify.', details: errorText }, { status: apifyResponse.status });
    }

    const results = await apifyResponse.json();
    const transcriptData = results?.[0];

    if (transcriptData && transcriptData.transcript) {
      return NextResponse.json({
        hasTranscript: true,
        transcriptContent: transcriptData.transcript,
        transcriptLang: transcriptData.languageCode || 'unknown',
      });
    } else {
      return NextResponse.json({
        hasTranscript: false,
        transcriptContent: null,
        transcriptLang: null,
      });
    }
  } catch (error) {
    console.error('Error in check-video-transcript route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
} 