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
    const vocabularyLevel = formData.get('vocabularyLevel') as string;
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

    // Vocabulary level mapping
    const vocabularyLevels = {
      "1": "Kindergarten level - EXTREMELY simple words, short sentences, basic concepts",
      "2": "Grade 1 level - very simple words, short sentences, familiar topics",
      "3": "Grade 2 level - basic vocabulary, simple sentence structures",
      "4": "Grade 3-4 level - intermediate vocabulary, compound sentences",
      "5": "Grade 5-6 level - more complex vocabulary, varied sentence structures",
      "6": "Grade 7-8 level - advanced vocabulary, complex sentences",
      "7": "Grade 9-10 level - sophisticated vocabulary, complex ideas",
      "8": "Grade 11-12 level - advanced academic vocabulary, nuanced concepts",
      "9": "College prep level - academic vocabulary, analytical concepts",
      "10": "Advanced level - sophisticated academic vocabulary, complex reasoning"
    };

    const vocabularyDescription = vocabularyLevels[vocabularyLevel as keyof typeof vocabularyLevels] || vocabularyLevels["5"];

    const systemPrompt = `You are an expert in creating educational reading assignments. Based on the provided context${imageFile ? ' and image' : ''}, generate ${numQuestions || 3} relevant and high-quality reading passages.

The topic of the assignment is "${topic || 'General Reading Comprehension'}".

IMPORTANT REQUIREMENTS:
- Vocabulary Level: ${vocabularyDescription}
- Each passage should contain exactly ${sentencesPerPage || 3} sentences
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
