import { NextRequest } from 'next/server';
import { searchAndCacheFoods } from '@/lib/usda-client';
import { nutritionSearchSchema } from '@/lib/validators/nutrition';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

/**
 * GET /api/nutrition/search
 * Search USDA food database and return nutrition information
 *
 * Query parameters:
 * - query: string (required) - Search term
 * - limit: number (optional, default: 10, max: 50) - Number of results
 * - dataType: string (optional) - Comma-separated data types to filter
 *
 * Example: /api/nutrition/search?query=chicken%20breast&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const validationResult = nutritionSearchSchema.safeParse({
      query: searchParams.get('query'),
      limit: searchParams.get('limit'),
      dataType: searchParams.get('dataType'),
    });

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => err.message).join(', ');
      return errorResponse(`Validation error: ${errors}`, 400);
    }

    const { query, limit, dataType } = validationResult.data;

    const results = await searchAndCacheFoods(query, limit);

    if (!results || !results.foods) {
      return errorResponse('No results found or invalid response from USDA API', 500);
    }

    return successResponse(
      {
        query: results.query,
        foods: results.foods.map((food) => ({
          fdcId: food.fdcId,
          description: food.description,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          nutrition: food.nutrition,
          cached: food.cached,
        })),
      },
      {
        total: results.totalHits,
        count: results.foods.length,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
