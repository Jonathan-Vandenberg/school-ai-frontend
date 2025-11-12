import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAppRouterMetrics } from '@/app/lib/withMetrics';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeVideoAssignment(req: NextRequest) {
  try {
    const { transcript, topic, levels } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    // Generate level description for appropriate question complexity
    const getLevelDescription = (levels: any[]) => {
      if (!levels || levels.length === 0) {
        return "middle school students (Grade 5-6)";
      }

      const cefrDescriptions: Record<string, string> = {
        'A1': 'beginner learners (CEFR A1) - use very simple vocabulary and short sentences',
        'A2': 'elementary learners (CEFR A2) - use simple vocabulary and basic grammar',
        'B1': 'intermediate learners (CEFR B1) - use common vocabulary and clear language',
        'B2': 'upper-intermediate learners (CEFR B2) - use more complex vocabulary and structures',
        'C1': 'advanced learners (CEFR C1) - use sophisticated vocabulary and complex language',
        'C2': 'proficient learners (CEFR C2) - use advanced academic vocabulary'
      };

      const gradeDescriptions: Record<string, string> = {
        'PRE_K': 'Pre-Kindergarten students - use extremely simple words and very short sentences',
        'KINDERGARTEN': 'Kindergarten students - use very simple words and basic sentences',
        'GRADE_1': 'Grade 1 students - use simple words and short sentences',
        'GRADE_2': 'Grade 2 students - use basic vocabulary and simple structures',
        'GRADE_3': 'Grade 3 students - use elementary vocabulary',
        'GRADE_4': 'Grade 4 students - use age-appropriate vocabulary',
        'GRADE_5': 'Grade 5 students - use intermediate vocabulary',
        'GRADE_6': 'Grade 6 students - use middle school vocabulary',
        'GRADE_7': 'Grade 7 students - use junior high vocabulary',
        'GRADE_8': 'Grade 8 students - use middle school vocabulary',
        'GRADE_9': 'Grade 9 students - use high school vocabulary',
        'GRADE_10': 'Grade 10 students - use high school vocabulary',
        'GRADE_11': 'Grade 11 students - use advanced high school vocabulary',
        'GRADE_12': 'Grade 12 students - use college-prep vocabulary'
      };

      const descriptions: string[] = [];
      
      for (const level of levels) {
        if (level.levelType === 'CEFR' && level.cefrLevel) {
          descriptions.push(cefrDescriptions[level.cefrLevel]);
        } else if (level.levelType === 'GRADE' && level.gradeLevel) {
          descriptions.push(gradeDescriptions[level.gradeLevel]);
        }
      }

      if (descriptions.length === 0) {
        return "middle school students (Grade 5-6)";
      }

      return descriptions.join(' OR ');
    };

    const levelDescription = getLevelDescription(levels || []);
    const hasVeryYoungLearners = levels?.some((l: any) => 
      ['PRE_K', 'KINDERGARTEN', 'GRADE_1', 'GRADE_2'].includes(l.gradeLevel)
    );

    const systemPrompt = `You are an expert in creating educational content. Based on the provided transcript from a YouTube video, generate 5 relevant and high-quality questions that a student can answer after watching the video. The topic of the assignment is "${topic}".

IMPORTANT: This assignment is for ${levelDescription}.
${hasVeryYoungLearners ? `
⚠️ CRITICAL FOR YOUNG LEARNERS:
- Use ONLY very simple words that young children (ages 4-7) would understand
- Keep questions SHORT and DIRECT (5-8 words maximum)
- Keep answers SHORT (1-2 simple sentences)
- Use present simple tense primarily
- Ask about concrete, visible things in the video
- Example good question: "What color is the bear?"
- Example good answer: "The bear is brown."
- Example BAD question: "What motivated the protagonist's actions?"
` : ''}
- Make questions and answers appropriate for the target age/level
- Use vocabulary and sentence structures suitable for ${levelDescription}
- Ensure questions test comprehension of the video content
- Keep language clear and accessible for the specified level

For each question, provide:
1.  A clear, concise question based on the transcript (appropriate for the specified level).
2.  A detailed, accurate answer derived directly from the transcript content (written at the appropriate level).

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