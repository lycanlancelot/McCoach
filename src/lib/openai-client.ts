import OpenAI from 'openai';
import type {
  VisionAnalysisParams,
  AIAnalysisResult,
  ParsedFoodResponse,
  DetectedFood,
} from '@/types/openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * System prompt for food identification
 * Instructs GPT-4o to analyze meal images and identify foods with quantities
 */
const FOOD_IDENTIFICATION_PROMPT = `You are a nutrition expert AI assistant. Analyze the provided meal photo and identify all visible food items.

For each food item, provide:
1. **name**: Clear, specific name of the food (e.g., "grilled chicken breast", not just "chicken")
2. **quantity**: Estimated amount (be realistic based on visual cues)
3. **unit**: Appropriate measurement unit (cup, oz, g, piece, slice, tbsp, etc.)
4. **confidence**: Your confidence level from 0 to 1 (0.0 = very uncertain, 1.0 = very certain)

Guidelines:
- Be specific: "brown rice" instead of "rice", "grilled chicken breast" instead of "chicken"
- Estimate portions realistically (a typical chicken breast is ~6 oz, a cup of rice is ~240g)
- If you see multiple items that are clearly the same, combine them
- If an item is unclear, still include it but with lower confidence
- Include condiments and sauces if visible
- Note cooking methods when obvious (grilled, fried, steamed, raw)

Respond ONLY with valid JSON in this exact format:
{
  "foods": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string",
      "confidence": number (0-1)
    }
  ],
  "overall_confidence": number (0-1),
  "notes": "optional string with any additional observations"
}`;

/**
 * Analyze meal image using OpenAI Vision API
 * Returns detected foods with quantities and confidence scores
 */
export async function analyzeMealImage(
  params: VisionAnalysisParams
): Promise<AIAnalysisResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error(
        'OpenAI API key is required. Get a key at https://platform.openai.com/api-keys and add it to your .env.local file as OPENAI_API_KEY'
      );
    }

    const {
      imageUrl,
      imageBase64,
      prompt = FOOD_IDENTIFICATION_PROMPT,
      maxTokens = 1000,
      temperature = 0.2,
    } = params;

    if (!imageUrl && !imageBase64) {
      throw new Error('Either imageUrl or imageBase64 must be provided');
    }

    // Prepare image content
    const imageContent = imageBase64
      ? `data:image/jpeg;base64,${imageBase64}`
      : imageUrl!;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageContent,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Parse JSON response
    const parsed: ParsedFoodResponse = JSON.parse(content);

    // Validate response structure
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      throw new Error('Invalid response structure: missing foods array');
    }

    // Validate each food item
    const validatedFoods: DetectedFood[] = parsed.foods
      .filter((food) => {
        return (
          food.name &&
          typeof food.name === 'string' &&
          typeof food.quantity === 'number' &&
          food.quantity > 0 &&
          typeof food.unit === 'string' &&
          typeof food.confidence === 'number' &&
          food.confidence >= 0 &&
          food.confidence <= 1
        );
      })
      .map((food) => ({
        name: food.name.trim(),
        quantity: food.quantity,
        unit: food.unit.trim(),
        confidence: Math.max(0, Math.min(1, food.confidence)),
      }));

    if (validatedFoods.length === 0) {
      throw new Error('No valid foods detected in image');
    }

    return {
      foods: validatedFoods,
      confidence: parsed.overall_confidence || 0.5,
      notes: parsed.notes,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze meal image: ${error.message}`);
    }
    throw new Error('Failed to analyze meal image: Unknown error');
  }
}

/**
 * Test function to verify OpenAI Vision API is working
 * Uses a sample image URL for testing
 */
export async function testVisionAPI(): Promise<boolean> {
  try {
    const testImageUrl =
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

    const result = await analyzeMealImage({
      imageUrl: testImageUrl,
      maxTokens: 500,
    });

    return result.foods.length > 0;
  } catch (error) {
    console.error('Vision API test failed:', error);
    return false;
  }
}
