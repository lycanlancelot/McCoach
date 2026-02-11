import { NextRequest } from 'next/server';
import { analyzeMealImage } from '@/lib/claude-vision-client';
import { searchAndCacheFoods } from '@/lib/usda-client';
import { calculateNutritionForServing, convertToGrams } from '@/lib/nutrition-calculator';
import { saveMealImage } from '@/lib/file-storage';
import { validateImageFile } from '@/lib/image-validator';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import type { NutritionData } from '@/types/usda';
import type { DetectedFood } from '@/types/openai';

interface FoodItemWithNutrition extends DetectedFood {
  fdcId?: number;
  description?: string;
  dataType?: string;
  nutrition?: NutritionData;
  grams: number;
}

/**
 * POST /api/meals/analyze
 * Upload meal image, analyze with AI, and lookup nutrition data
 *
 * Request: multipart/form-data with 'image' file OR 'imageUrl' field
 * Response: AI analysis results + nutrition data for each food + totals
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const imageUrlParam = formData.get('imageUrl') as string | null;

    let fullImageUrl: string;
    let imageUrl: string;

    if (imageFile) {
      // File upload path
      // Validate image file
      const validation = validateImageFile(imageFile);
      if (!validation.valid) {
        const errorMessages = validation.errors.map((e) => e.message).join(', ');
        return errorResponse(`Image validation failed: ${errorMessages}`, 400);
      }

      // Save image to filesystem
      imageUrl = await saveMealImage(imageFile);
      fullImageUrl = `${request.nextUrl.origin}${imageUrl}`;
    } else if (imageUrlParam) {
      // URL path - use the provided URL directly
      fullImageUrl = imageUrlParam;
      imageUrl = imageUrlParam;
    } else {
      return errorResponse('No image file or URL provided', 400);
    }

    // Analyze image with Claude Vision API
    const aiAnalysis = await analyzeMealImage({
      imageUrl: fullImageUrl,
    });

    if (!aiAnalysis.foods || aiAnalysis.foods.length === 0) {
      return successResponse({
        imageUrl,
        aiAnalysis,
        foodItems: [],
        totals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
        message: 'No foods detected in image. Please try a clearer photo or add foods manually.',
      });
    }

    // Lookup nutrition data for each detected food
    const foodItems: FoodItemWithNutrition[] = await Promise.all(
      aiAnalysis.foods.map(async (food) => {
        try {
          // Convert quantity to grams for nutrition calculation
          const grams = convertToGrams(food.quantity, food.unit);

          // Search USDA for this food
          const searchResults = await searchAndCacheFoods(food.name, 1);

          if (searchResults.foods && searchResults.foods.length > 0) {
            const usdaFood = searchResults.foods[0];

            // Calculate nutrition for the detected serving size
            const nutrition = calculateNutritionForServing(
              {
                calories: usdaFood.nutrition.calories,
                protein: usdaFood.nutrition.protein,
                carbs: usdaFood.nutrition.carbs,
                fat: usdaFood.nutrition.fat,
                fiber: usdaFood.nutrition.fiber || 0,
                sugar: usdaFood.nutrition.sugar || 0,
                sodium: usdaFood.nutrition.sodium || 0,
              },
              { quantity: food.quantity, unit: food.unit, grams }
            );

            return {
              ...food,
              fdcId: usdaFood.fdcId,
              description: usdaFood.description,
              dataType: usdaFood.dataType,
              nutrition,
              grams,
            };
          }

          // If no USDA match, return estimated nutrition based on average values
          return {
            ...food,
            grams,
            nutrition: {
              calories: 100, // Rough estimate
              protein: 5,
              carbs: 15,
              fat: 3,
              fiber: 1,
              sugar: 2,
              sodium: 100,
            },
          };
        } catch (error) {
          // If nutrition lookup fails, return food with estimated values
          const grams = convertToGrams(food.quantity, food.unit);
          return {
            ...food,
            grams,
            nutrition: {
              calories: 100,
              protein: 5,
              carbs: 15,
              fat: 3,
              fiber: 1,
              sugar: 2,
              sodium: 100,
            },
          };
        }
      })
    );

    // Calculate total nutrition from all foods
    const totals = foodItems.reduce(
      (acc, food) => {
        if (food.nutrition) {
          return {
            calories: acc.calories + food.nutrition.calories,
            protein: acc.protein + food.nutrition.protein,
            carbs: acc.carbs + food.nutrition.carbs,
            fat: acc.fat + food.nutrition.fat,
            fiber: acc.fiber + (food.nutrition.fiber || 0),
            sugar: acc.sugar + (food.nutrition.sugar || 0),
            sodium: acc.sodium + (food.nutrition.sodium || 0),
          };
        }
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      }
    );

    // Round totals to 1 decimal place
    const roundedTotals = {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
      sugar: Math.round(totals.sugar * 10) / 10,
      sodium: Math.round(totals.sodium * 10) / 10,
    };

    return successResponse({
      imageUrl,
      aiAnalysis: {
        foods: aiAnalysis.foods,
        confidence: aiAnalysis.confidence,
        notes: aiAnalysis.notes,
      },
      foodItems: foodItems.map((food) => ({
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
        grams: food.grams,
        confidence: food.confidence,
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        nutrition: food.nutrition,
      })),
      totals: roundedTotals,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
