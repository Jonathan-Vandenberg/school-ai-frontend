import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAppRouterMetrics } from '@/app/lib/withMetrics';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeVideoAssignment(req: NextRequest) {
  try {
    const { transcript, topic } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    const systemPrompt = `You are an expert in creating educational content. Based on the provided transcript from a YouTube video, generate 5 relevant and high-quality questions that a student can answer after watching the video. The topic of the assignment is "${topic}".

For each question, provide:
1.  A clear, concise question based on the transcript.
2.  A detailed, accurate answer derived directly from the transcript content.

Return the output as a JSON object with a single key "questions", which is an array of objects. Each object in the array should have two properties: "text" (the question) and "answer" (the expected answer).

Example format:
{
  "questions": [
    {
      "text": "What is the main topic discussed in the first minute?",
      "answer": "The main topic discussed is the history of the Eiffel Tower."
    },
    ...
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the transcript:\n\n${transcript}` }
      ],
      response_format: { type: "json_object" },
    });

    const generatedContent = completion.choices[0].message?.content;

    if (!generatedContent) {
        return NextResponse.json({ error: 'Failed to generate questions from AI.' }, { status: 500 });
    }
    
    const parsedContent = JSON.parse(generatedContent);

    return NextResponse.json({
        success: true,
        improvedQuestions: parsedContent,
    });

  } catch (error) {
    console.error('Error in analyze-video-assignment route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

// Export the POST handler wrapped with metrics
export const POST = withAppRouterMetrics(analyzeVideoAssignment); 