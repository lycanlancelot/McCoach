import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import type { Prisma } from '@prisma/client';

/**
 * POST /api/meals
 * Create a new meal with food items
 *
 * Request body:
 * {
 *   imageUrl: string,
 *   description?: string,
 *   aiAnalysis?: object,
 *   confidence?: number,
 *   calories: number,
 *   protein: number,
 *   carbs: number,
 *   fat: number,
 *   fiber?: number,
 *   sugar?: number,
 *   sodium?: number,
 *   foodItems?: Array<{
 *     fdcId: number,
 *     quantity: number,
 *     unit: string,
 *     grams: number
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      imageUrl,
      description,
      aiAnalysis,
      confidence,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      foodItems = [],
    } = body;

    // Validate required fields
    if (!imageUrl) {
      return errorResponse('Image URL is required', 400);
    }

    if (typeof calories !== 'number' || typeof protein !== 'number' ||
        typeof carbs !== 'number' || typeof fat !== 'number') {
      return errorResponse('Nutrition values (calories, protein, carbs, fat) are required', 400);
    }

    // Create meal with associated food items in a transaction
    const meal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create the meal
      const createdMeal = await tx.meal.create({
        data: {
          imageUrl,
          description,
          aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
          confidence: confidence || null,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          sugar,
          sodium,
          timestamp: new Date(),
        },
      });

      // Create food items if provided
      if (foodItems.length > 0) {
        await Promise.all(
          foodItems.map(async (item: any) => {
            if (!item.fdcId) return;

            // Create or get the FoodItem from cache
            let foodItem = await tx.foodItem.findUnique({
              where: { fdcId: item.fdcId },
            });

            // If not cached, create it (this would happen if analyze endpoint skipped caching)
            if (!foodItem && item.nutrition) {
              foodItem = await tx.foodItem.create({
                data: {
                  fdcId: item.fdcId,
                  description: item.description || item.name,
                  dataType: item.dataType || 'Unknown',
                  calories: item.nutrition.calories,
                  protein: item.nutrition.protein,
                  carbs: item.nutrition.carbs,
                  fat: item.nutrition.fat,
                  fiber: item.nutrition.fiber,
                  sugar: item.nutrition.sugar,
                  sodium: item.nutrition.sodium,
                },
              });
            }

            if (foodItem) {
              // Create junction table entry
              await tx.mealFoodItem.create({
                data: {
                  mealId: createdMeal.id,
                  foodItemId: foodItem.id,
                  quantity: item.quantity,
                  unit: item.unit,
                  grams: item.grams,
                },
              });
            }
          })
        );
      }

      // Return meal with food items
      return tx.meal.findUnique({
        where: { id: createdMeal.id },
        include: {
          foodItems: {
            include: {
              foodItem: true,
            },
          },
        },
      });
    });

    return successResponse(meal, { created: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/meals
 * Retrieve all meals with optional pagination and date filtering
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for date filtering
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Query meals with pagination
    const [meals, total] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: {
          foodItems: {
            include: {
              foodItem: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.meal.count({ where }),
    ]);

    return successResponse(
      {
        meals: meals.map((meal) => ({
          ...meal,
          aiAnalysis: meal.aiAnalysis ? JSON.parse(meal.aiAnalysis) : null,
        })),
      },
      {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
