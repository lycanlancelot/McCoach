import Anthropic from '@anthropic-ai/sdk';
import type {
  VisionAnalysisParams,
  AIAnalysisResult,
  ParsedFoodResponse,
  DetectedFood,
} from '@/types/openai';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

if (!ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY not found in environment variables');
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * System prompt for food identification
 * Instructs Claude to analyze meal images and identify foods with quantities
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
 * Convert image URL to base64 (required for Claude API)
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mediaType: string }> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      throw new Error(`URL does not point to an image (content-type: ${contentType})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Detect media type from response headers
    const mediaType = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('webp')
        ? 'image/webp'
        : contentType.includes('gif')
          ? 'image/gif'
          : 'image/jpeg';

    return { data: base64, mediaType };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch image from URL: ${errorMessage}`);
  }
}

/**
 * Analyze meal image using Claude Vision API
 * Returns detected foods with quantities and confidence scores
 */
export async function analyzeMealImage(
  params: VisionAnalysisParams
): Promise<AIAnalysisResult> {
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error(
        'Anthropic API key is required. Get a key at https://console.anthropic.com/keys and add it to your .env.local file as ANTHROPIC_API_KEY'
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

    // Prepare image content for Claude
    let imageData: string;
    let mediaType: string;

    if (imageBase64) {
      // Extract base64 data and media type
      const base64Pattern = /^data:image\/([a-z]+);base64,/;
      const match = imageBase64.match(base64Pattern);

      if (match) {
        mediaType = `image/${match[1]}`;
        imageData = imageBase64.replace(base64Pattern, '');
      } else {
        // Assume it's already clean base64
        imageData = imageBase64;
        mediaType = 'image/jpeg';
      }
    } else if (imageUrl) {
      const result = await imageUrlToBase64(imageUrl);
      imageData = result.data;
      mediaType = result.mediaType;
    } else {
      throw new Error('No image data provided');
    }

    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude Vision API');
    }

    const content = textContent.text;

    // Extract JSON from response (Claude might wrap it in markdown code blocks)
    let jsonString = content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    // Parse JSON response
    const parsed: ParsedFoodResponse = JSON.parse(jsonString);

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
 * Test function to verify Claude Vision API is working
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
