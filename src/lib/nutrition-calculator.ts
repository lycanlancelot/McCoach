import type { NutritionData } from '@/types/usda';
import type { FoodItem } from '@prisma/client';

/**
 * Serving size information for a food item
 */
export interface ServingInfo {
  quantity: number;
  unit: string;
  grams: number;
}

/**
 * Food item with serving information
 */
export interface FoodItemWithServing extends FoodItem {
  serving: ServingInfo;
}

/**
 * Calculate nutrition for a specific serving size
 * USDA data is per 100g, so we scale based on actual grams consumed
 */
export function calculateNutritionForServing(
  foodItem: FoodItem,
  serving: ServingInfo
): NutritionData {
  const scaleFactor = serving.grams / 100;

  return {
    calories: foodItem.calories * scaleFactor,
    protein: foodItem.protein * scaleFactor,
    carbs: foodItem.carbs * scaleFactor,
    fat: foodItem.fat * scaleFactor,
    fiber: foodItem.fiber ? foodItem.fiber * scaleFactor : undefined,
    sugar: foodItem.sugar ? foodItem.sugar * scaleFactor : undefined,
    sodium: foodItem.sodium ? foodItem.sodium * scaleFactor : undefined,
  };
}

/**
 * Calculate total nutrition from multiple food items
 * Sums up nutrition values across all items
 */
export function calculateTotalNutrition(items: FoodItemWithServing[]): NutritionData {
  const totals = items.reduce(
    (acc, item) => {
      const nutrition = calculateNutritionForServing(item, item.serving);

      return {
        calories: acc.calories + nutrition.calories,
        protein: acc.protein + nutrition.protein,
        carbs: acc.carbs + nutrition.carbs,
        fat: acc.fat + nutrition.fat,
        fiber: (acc.fiber || 0) + (nutrition.fiber || 0),
        sugar: (acc.sugar || 0) + (nutrition.sugar || 0),
        sodium: (acc.sodium || 0) + (nutrition.sodium || 0),
      };
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

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: totals.fiber > 0 ? Math.round(totals.fiber * 10) / 10 : undefined,
    sugar: totals.sugar > 0 ? Math.round(totals.sugar * 10) / 10 : undefined,
    sodium: totals.sodium > 0 ? Math.round(totals.sodium) : undefined,
  };
}

/**
 * Common serving size conversions to grams
 * Approximate values for common units
 */
export const SERVING_CONVERSIONS: Record<string, number> = {
  // Volume
  cup: 240,
  'fl oz': 30,
  tablespoon: 15,
  tbsp: 15,
  teaspoon: 5,
  tsp: 5,

  // Weight (already in grams)
  g: 1,
  gram: 1,
  kg: 1000,
  kilogram: 1000,
  oz: 28.35,
  ounce: 28.35,
  lb: 453.59,
  pound: 453.59,

  // Common serving sizes (approximate)
  piece: 100,
  slice: 30,
  serving: 100,
  whole: 150,
  medium: 120,
  large: 180,
  small: 80,
};

/**
 * Convert serving size to grams
 * Uses common conversions and falls back to 100g if unknown
 */
export function convertToGrams(quantity: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  const conversionFactor = SERVING_CONVERSIONS[normalizedUnit];

  if (conversionFactor) {
    return quantity * conversionFactor;
  }

  // If unit ends with 's', try singular form
  if (normalizedUnit.endsWith('s')) {
    const singular = normalizedUnit.slice(0, -1);
    const singularFactor = SERVING_CONVERSIONS[singular];
    if (singularFactor) {
      return quantity * singularFactor;
    }
  }

  // Default to 100g per serving if unit is unknown
  return quantity * 100;
}

/**
 * Estimate grams from food description and quantity
 * Uses heuristics when unit is not specified
 */
export function estimateGramsFromDescription(
  description: string,
  quantity: number
): number {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('whole') || lowerDesc.includes('entire')) {
    return quantity * 150;
  }
  if (lowerDesc.includes('slice')) {
    return quantity * 30;
  }
  if (lowerDesc.includes('piece') || lowerDesc.includes('chunk')) {
    return quantity * 100;
  }
  if (lowerDesc.includes('cup')) {
    return quantity * 240;
  }
  if (lowerDesc.includes('tablespoon') || lowerDesc.includes('tbsp')) {
    return quantity * 15;
  }
  if (lowerDesc.includes('teaspoon') || lowerDesc.includes('tsp')) {
    return quantity * 5;
  }

  // Default fallback
  return quantity * 100;
}

/**
 * Calculate daily nutrition summary for multiple meals
 * Aggregates nutrition across all meals for a given day
 */
export function calculateDailyTotals(meals: NutritionData[]): NutritionData {
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
      fiber: (acc.fiber || 0) + (meal.fiber || 0),
      sugar: (acc.sugar || 0) + (meal.sugar || 0),
      sodium: (acc.sodium || 0) + (meal.sodium || 0),
    }),
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

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: totals.fiber > 0 ? Math.round(totals.fiber * 10) / 10 : undefined,
    sugar: totals.sugar > 0 ? Math.round(totals.sugar * 10) / 10 : undefined,
    sodium: totals.sodium > 0 ? Math.round(totals.sodium) : undefined,
  };
}

/**
 * Calculate macronutrient percentages
 * Returns percentage of calories from protein, carbs, and fat
 */
export function calculateMacroPercentages(nutrition: NutritionData): {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
} {
  const totalCalories = nutrition.calories || 1;

  const proteinCalories = nutrition.protein * 4;
  const carbsCalories = nutrition.carbs * 4;
  const fatCalories = nutrition.fat * 9;

  return {
    proteinPercent: Math.round((proteinCalories / totalCalories) * 100),
    carbsPercent: Math.round((carbsCalories / totalCalories) * 100),
    fatPercent: Math.round((fatCalories / totalCalories) * 100),
  };
}
