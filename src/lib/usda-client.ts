import { prisma } from '@/lib/db';
import type {
  USDASearchParams,
  USDASearchResult,
  USDAFoodDetails,
  USDAFood,
  NutritionData,
  USDA_NUTRIENT_IDS,
} from '@/types/usda';

const USDA_BASE_URL = process.env.USDA_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.USDA_API_KEY || '';

// USDA Nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBOHYDRATE: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
} as const;

/**
 * Search USDA FoodData Central database for foods
 * Implements fuzzy matching and filtering by data type
 */
export async function searchUSDAFoods(
  params: USDASearchParams
): Promise<USDASearchResult> {
  try {
    const {
      query,
      dataType,
      pageSize = 10,
      pageNumber = 1,
      sortBy = 'dataType.keyword',
      sortOrder = 'asc',
    } = params;

    const url = new URL(`${USDA_BASE_URL}/foods/search`);
    url.searchParams.append('query', query);
    url.searchParams.append('pageSize', String(pageSize));
    url.searchParams.append('pageNumber', String(pageNumber));
    url.searchParams.append('sortBy', sortBy);
    url.searchParams.append('sortOrder', sortOrder);

    if (dataType && dataType.length > 0) {
      url.searchParams.append('dataType', dataType.join(','));
    }

    if (USDA_API_KEY) {
      url.searchParams.append('api_key', USDA_API_KEY);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (errorData?.error?.code === 'API_KEY_MISSING') {
        throw new Error(
          'USDA API key is required. Get a free key at https://fdc.nal.usda.gov/api-key-signup.html and add it to your .env.local file as USDA_API_KEY'
        );
      }

      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    const data: USDASearchResult = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Failed to search USDA foods: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get detailed food information by FDC ID
 * Includes complete nutrient breakdown
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<USDAFoodDetails> {
  try {
    const url = new URL(`${USDA_BASE_URL}/food/${fdcId}`);

    if (USDA_API_KEY) {
      url.searchParams.append('api_key', USDA_API_KEY);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    const data: USDAFoodDetails = await response.json();
    return data;
  } catch (error) {
    throw new Error(
      `Failed to get USDA food details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract nutrition data from USDA food nutrients
 * Normalizes to our internal NutritionData format
 */
export function extractNutritionData(food: USDAFood | USDAFoodDetails): NutritionData {
  const nutrients = food.foodNutrients || [];

  const findNutrient = (nutrientId: number): number => {
    const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
    return nutrient?.value || 0;
  };

  return {
    calories: findNutrient(NUTRIENT_IDS.ENERGY),
    protein: findNutrient(NUTRIENT_IDS.PROTEIN),
    carbs: findNutrient(NUTRIENT_IDS.CARBOHYDRATE),
    fat: findNutrient(NUTRIENT_IDS.FAT),
    fiber: findNutrient(NUTRIENT_IDS.FIBER) || undefined,
    sugar: findNutrient(NUTRIENT_IDS.SUGAR) || undefined,
    sodium: findNutrient(NUTRIENT_IDS.SODIUM) || undefined,
  };
}

/**
 * Get or create cached food item in database
 * Prevents redundant USDA API calls
 */
export async function getCachedFoodItem(fdcId: number) {
  try {
    const cached = await prisma.foodItem.findUnique({
      where: { fdcId },
    });

    if (cached) {
      return cached;
    }

    const foodDetails = await getUSDAFoodDetails(fdcId);
    const nutrition = extractNutritionData(foodDetails);

    const foodItem = await prisma.foodItem.create({
      data: {
        fdcId: foodDetails.fdcId,
        description: foodDetails.description,
        dataType: foodDetails.dataType,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        sodium: nutrition.sodium,
        brandOwner: foodDetails.brandOwner,
        ingredients: foodDetails.ingredients,
        servingSize: foodDetails.servingSize,
        servingUnit: foodDetails.servingSizeUnit,
      },
    });

    return foodItem;
  } catch (error) {
    throw new Error(
      `Failed to get cached food item: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search for foods and return with cached/fresh data
 * Prioritizes cache hits to minimize API usage
 */
export async function searchAndCacheFoods(query: string, limit: number = 10) {
  try {
    const searchResults = await searchUSDAFoods({
      query,
      pageSize: limit,
      pageNumber: 1,
    });

    if (!searchResults.foods || searchResults.foods.length === 0) {
      return {
        query,
        totalHits: 0,
        foods: [],
      };
    }

    const foods = await Promise.all(
      searchResults.foods.map(async (food) => {
        try {
          const cached = await prisma.foodItem.findUnique({
            where: { fdcId: food.fdcId },
          });

          if (cached) {
            return {
              ...food,
              cached: true,
              nutrition: {
                calories: cached.calories,
                protein: cached.protein,
                carbs: cached.carbs,
                fat: cached.fat,
                fiber: cached.fiber,
                sugar: cached.sugar,
                sodium: cached.sodium,
              },
            };
          }

          const nutrition = extractNutritionData(food);
          return {
            ...food,
            cached: false,
            nutrition,
          };
        } catch (error) {
          const nutrition = extractNutritionData(food);
          return {
            ...food,
            cached: false,
            nutrition,
          };
        }
      })
    );

    return {
      query,
      totalHits: searchResults.totalHits,
      foods,
    };
  } catch (error) {
    throw new Error(
      `Failed to search and cache foods: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Batch fetch multiple food items by FDC IDs
 * Useful for retrieving multiple foods at once with caching
 */
export async function batchGetFoodItems(fdcIds: number[]) {
  try {
    const foods = await Promise.all(
      fdcIds.map(async (fdcId) => {
        try {
          return await getCachedFoodItem(fdcId);
        } catch (error) {
          return null;
        }
      })
    );

    return foods.filter((food) => food !== null);
  } catch (error) {
    throw new Error(
      `Failed to batch get food items: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
