/**
 * Frontend API client for meal tracking backend
 * Provides type-safe wrappers around fetch calls
 */

import type { NutritionData } from '@/types/usda';
import type { AIAnalysisResult, DetectedFood } from '@/types/openai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * API Response format
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    [key: string]: any;
  };
}

/**
 * Meal data structure
 */
export interface Meal {
  id: string;
  imageUrl: string;
  description?: string;
  aiAnalysis?: AIAnalysisResult;
  confidence?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  foodItems?: MealFoodItem[];
}

export interface MealFoodItem {
  id: string;
  mealId: string;
  foodItemId: string;
  quantity: number;
  unit: string;
  grams: number;
  foodItem: FoodItem;
  createdAt: Date;
}

export interface FoodItem {
  id: string;
  fdcId: number;
  description: string;
  dataType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  brandOwner?: string;
  servingSize?: number;
  servingUnit?: string;
}

/**
 * Food item with nutrition for meal creation
 */
export interface FoodItemWithNutrition {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  confidence: number;
  fdcId?: number;
  description?: string;
  dataType?: string;
  nutrition?: NutritionData;
}

/**
 * Meal analysis result from /api/meals/analyze
 */
export interface MealAnalysisResult {
  imageUrl: string;
  aiAnalysis: AIAnalysisResult;
  foodItems: FoodItemWithNutrition[];
  totals: NutritionData & { fiber: number; sugar: number; sodium: number };
  message?: string;
}

/**
 * Analyze meal image with AI
 */
export async function analyzeMealImage(imageFile: File): Promise<MealAnalysisResult> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${API_BASE_URL}/api/meals/analyze`, {
    method: 'POST',
    body: formData,
  });

  const result: ApiResponse<MealAnalysisResult> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to analyze meal image');
  }

  return result.data;
}

/**
 * Create a new meal
 */
export async function createMeal(data: {
  imageUrl: string;
  description?: string;
  aiAnalysis?: AIAnalysisResult;
  confidence?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  foodItems?: FoodItemWithNutrition[];
}): Promise<Meal> {
  const response = await fetch(`${API_BASE_URL}/api/meals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<Meal> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create meal');
  }

  return result.data;
}

/**
 * Get all meals with optional pagination and date filtering
 */
export async function getMeals(options?: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<{ meals: Meal[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();

  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.startDate) params.append('startDate', options.startDate.toISOString());
  if (options?.endDate) params.append('endDate', options.endDate.toISOString());

  const response = await fetch(
    `${API_BASE_URL}/api/meals${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
    }
  );

  const result: ApiResponse<{ meals: Meal[] }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch meals');
  }

  return {
    meals: result.data.meals,
    total: result.meta?.total || 0,
    hasMore: result.meta?.hasMore || false,
  };
}

/**
 * Get a single meal by ID
 */
export async function getMeal(id: string): Promise<Meal> {
  const response = await fetch(`${API_BASE_URL}/api/meals/${id}`, {
    method: 'GET',
  });

  const result: ApiResponse<Meal> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch meal');
  }

  return result.data;
}

/**
 * Update a meal
 */
export async function updateMeal(
  id: string,
  data: Partial<Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Meal> {
  const response = await fetch(`${API_BASE_URL}/api/meals/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<Meal> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update meal');
  }

  return result.data;
}

/**
 * Delete a meal
 */
export async function deleteMeal(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/meals/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<{ deleted: boolean }> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete meal');
  }
}

/**
 * Search USDA food database
 */
export async function searchFoods(query: string, limit: number = 10) {
  const params = new URLSearchParams({ query, limit: limit.toString() });

  const response = await fetch(`${API_BASE_URL}/api/nutrition/search?${params.toString()}`, {
    method: 'GET',
  });

  const result: ApiResponse<{
    query: string;
    foods: Array<{
      fdcId: number;
      description: string;
      dataType: string;
      brandOwner?: string;
      servingSize?: number;
      servingSizeUnit?: string;
      nutrition: NutritionData;
      cached: boolean;
    }>;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to search foods');
  }

  return result.data;
}
