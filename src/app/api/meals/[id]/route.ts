import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

/**
 * GET /api/meals/[id]
 * Retrieve a single meal by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meal = await prisma.meal.findUnique({
      where: { id },
      include: {
        foodItems: {
          include: {
            foodItem: true,
          },
        },
      },
    });

    if (!meal) {
      return errorResponse('Meal not found', 404);
    }

    return successResponse({
      ...meal,
      aiAnalysis: meal.aiAnalysis ? JSON.parse(meal.aiAnalysis) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/meals/[id]
 * Update a meal
 *
 * Request body: Partial meal data to update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if meal exists
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
    });

    if (!existingMeal) {
      return errorResponse('Meal not found', 404);
    }

    // Update meal
    const updatedMeal = await prisma.meal.update({
      where: { id },
      data: {
        description: body.description,
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        fiber: body.fiber,
        sugar: body.sugar,
        sodium: body.sodium,
        updatedAt: new Date(),
      },
      include: {
        foodItems: {
          include: {
            foodItem: true,
          },
        },
      },
    });

    return successResponse({
      ...updatedMeal,
      aiAnalysis: updatedMeal.aiAnalysis ? JSON.parse(updatedMeal.aiAnalysis) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/meals/[id]
 * Delete a meal and its associated food items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if meal exists
    const existingMeal = await prisma.meal.findUnique({
      where: { id },
    });

    if (!existingMeal) {
      return errorResponse('Meal not found', 404);
    }

    // Delete meal and cascade to mealFoodItems (configured in schema)
    await prisma.meal.delete({
      where: { id },
    });

    return successResponse({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
