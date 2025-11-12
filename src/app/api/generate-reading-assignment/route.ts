import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAppRouterMetrics } from '@/app/lib/withMetrics';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateReadingAssignment(req: NextRequest) {
  try {
    // Handle FormData for image uploads
    const formData = await req.formData();
    const context = formData.get('context') as string;
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 3;
    const topic = formData.get('topic') as string;
    const levelsStr = formData.get('levels') as string;
    const levels = levelsStr ? JSON.parse(levelsStr) : [];
    const sentencesPerPage = parseInt(formData.get('sentencesPerPage') as string) || 3;
    const imageFile = formData.get('image') as File | null;
    const existingPassagesStr = formData.get('existingPassages') as string;
    const existingPassages = existingPassagesStr ? JSON.parse(existingPassagesStr) : [];

    if (!context && !imageFile) {
      return NextResponse.json({ error: 'Context or image is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    // Convert levels to vocabulary description
    const getLevelDescription = (levels: any[]) => {
      if (!levels || levels.length === 0) {
        return "Grade 5-6 level - more complex vocabulary, varied sentence structures";
      }

      const cefrDescriptions: Record<string, string> = {
        'A1': 'CEFR A1 - Beginner level: EXTREMELY simple words, basic present tense, everyday familiar expressions, very short sentences (3-5 words)',
        'A2': 'CEFR A2 - Elementary level: Simple words, basic grammar, familiar everyday situations, short simple sentences',
        'B1': 'CEFR B1 - Intermediate level: Common vocabulary, simple connected text, familiar matters, clear standard language',
        'B2': 'CEFR B2 - Upper-Intermediate level: More complex vocabulary, abstract topics, detailed text, some sophistication',
        'C1': 'CEFR C1 - Advanced level: Wide range of vocabulary, complex texts, implicit meaning, sophisticated language',
        'C2': 'CEFR C2 - Proficiency level: Very wide vocabulary, complex abstract topics, nuanced expression, native-like fluency'
      };

      const gradeDescriptions: Record<string, string> = {
        'PRE_K': 'Pre-Kindergarten level - EXTREMELY simple 2-4 word sentences, basic nouns and verbs, familiar concepts (colors, animals, family)',
        'KINDERGARTEN': 'Kindergarten level - VERY simple 3-5 word sentences, basic sight words, simple present tense, everyday objects',
        'GRADE_1': 'Grade 1 level - Simple 4-6 word sentences, basic sight words, simple past/present tense, familiar topics',
        'GRADE_2': 'Grade 2 level - Simple 5-8 word sentences, basic vocabulary, simple sentence structures, concrete concepts',
        'GRADE_3': 'Grade 3 level - Varied sentence length (6-10 words), basic descriptive words, compound sentences',
        'GRADE_4': 'Grade 4 level - More complex sentences, descriptive language, some abstract concepts',
        'GRADE_5': 'Grade 5 level - Complex vocabulary, varied sentence structures, some abstract ideas',
        'GRADE_6': 'Grade 6 level - Advanced vocabulary, complex sentences, abstract concepts',
        'GRADE_7': 'Grade 7 level - Sophisticated vocabulary, complex ideas, analytical thinking',
        'GRADE_8': 'Grade 8 level - Advanced academic vocabulary, nuanced concepts, critical thinking',
        'GRADE_9': 'Grade 9 level - High school vocabulary, complex reasoning, analytical concepts',
        'GRADE_10': 'Grade 10 level - Advanced high school vocabulary, sophisticated ideas',
        'GRADE_11': 'Grade 11 level - College-prep vocabulary, complex analytical concepts',
        'GRADE_12': 'Grade 12 level - Advanced academic vocabulary, sophisticated reasoning'
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
        return "Grade 5-6 level - more complex vocabulary, varied sentence structures";
      }

      return descriptions.join(' OR ');
    };

    const vocabularyDescription = getLevelDescription(levels);
    
    // Check if this is for very young learners
    const hasVeryYoungLearners = levels.some((l: any) => 
      ['PRE_K', 'KINDERGARTEN', 'GRADE_1'].includes(l.gradeLevel)
    );

    const systemPrompt = `You are an expert in creating educational reading assignments. Based on the provided context${imageFile ? ' and image' : ''}, generate ${numQuestions || 3} relevant and high-quality reading passages.

The topic of the assignment is "${topic || 'General Reading Comprehension'}".

CRITICAL REQUIREMENTS:
- Vocabulary Level: ${vocabularyDescription}
- Each passage should contain exactly ${sentencesPerPage || 3} sentences
${hasVeryYoungLearners ? `
⚠️ EXTREMELY IMPORTANT FOR YOUNG LEARNERS:
- Use ONLY the simplest, most basic words (cat, dog, run, jump, red, blue, mom, dad, etc.)
- Keep sentences VERY SHORT (3-6 words maximum per sentence)
- Use simple present tense or basic past tense only
- Focus on familiar, concrete concepts that young children know
- NO complex words, NO advanced vocabulary, NO abstract concepts
- Think of words a 4-6 year old child would know
- Example good sentence: "The cat is red."
- Example good sentence: "I see a dog."
- Example bad sentence: "The feline exhibited remarkable characteristics."
` : ''}
- Use age-appropriate vocabulary and sentence complexity for the specified level
- Make passages engaging and educational
- Ensure content is suitable for the vocabulary level specified
${imageFile ? '- If an image is provided, use it as visual context to create relevant reading passages about what you see in the image' : ''}
${existingPassages.length > 0 ? '- DO NOT create passages that are similar to the existing ones provided below. Create NEW and DIFFERENT content.' : ''}

For each passage, provide:
1. A title for the passage (optional but helpful)
2. A reading passage that meets the vocabulary and sentence count requirements
3. The passage should be engaging and educational for the target level
${imageFile ? '4. If an image is provided, base the content on what you observe in the image' : ''}
${existingPassages.length > 0 ? '5. Ensure the new passages are completely different from the existing ones' : ''}

${existingPassages.length > 0 ? `EXISTING PASSAGES TO AVOID DUPLICATING:
${existingPassages.map((passage: any, index: number) => `${index + 1}. Title: "${passage.title || 'No title'}"\n   Content: "${passage.text}"`).join('\n\n')}

Please create NEW passages that are different from the above.` : ''}

Return the output as a JSON object with a single key "passages", which is an array of objects. Each object in the array should have two properties: "title" (optional passage title) and "text" (the reading passage content).

Example format:
{
  "passages": [
    {
      "title": "The History of Ancient Rome",
      "text": "Ancient Rome was one of the greatest civilizations in history. Founded in 753 BC, it grew from a small settlement to a vast empire that spanned three continents. The Romans were known for their advanced engineering, including the construction of roads, aqueducts, and magnificent buildings like the Colosseum."
    },
    {
      "title": "The Solar System",
      "text": "Our solar system consists of eight planets orbiting around a central star called the Sun. The four inner planets - Mercury, Venus, Earth, and Mars - are rocky and relatively small. The four outer planets - Jupiter, Saturn, Uranus, and Neptune - are gas giants."
    }
  ]
}`;

    // Prepare messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add user message with context and/or image
    const userMessage: any = {
      role: "user",
      content: []
    };

    if (context) {
      userMessage.content.push({
        type: "text",
        text: `Here is the context for the reading assignment:\n\n${context}`
      });
    }

    if (imageFile) {
      // Convert image to base64
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageFile.type;
      
      userMessage.content.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      });
    }

    messages.push(userMessage);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
    });

    const generatedContent = completion.choices[0].message?.content;

    if (!generatedContent) {
        return NextResponse.json({ error: 'Failed to generate reading passages from AI.' }, { status: 500 });
    }
    
    const parsedContent = JSON.parse(generatedContent);

    return NextResponse.json({
        success: true,
        generatedPassages: parsedContent,
    });

  } catch (error) {
    console.error('Error in generate-reading-assignment route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

// Export the POST handler wrapped with metrics
export const POST = withAppRouterMetrics(generateReadingAssignment);
