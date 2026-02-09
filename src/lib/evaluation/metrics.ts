/**
 * Evaluation metrics calculation utilities
 */

import type { AIAnalysisResult } from '@/types/openai';
import type { GroundTruth, EvaluationMetrics } from '@/types/evaluation';
import { convertToGrams } from '@/lib/nutrition-calculator';

/**
 * Normalize food names for comparison (lowercase, remove extra spaces)
 */
function normalizeFood(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two food names match (fuzzy matching)
 * Returns true if they're similar enough
 */
function foodsMatch(food1: string, food2: string): boolean {
  const norm1 = normalizeFood(food1);
  const norm2 = normalizeFood(food2);

  // Exact match
  if (norm1 === norm2) return true;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Could add more sophisticated matching (Levenshtein distance, etc.)
  return false;
}

/**
 * Calculate evaluation metrics by comparing AI result with ground truth
 */
export function calculateMetrics(
  aiResult: AIAnalysisResult,
  groundTruth: GroundTruth
): EvaluationMetrics {
  const aiTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  // Calculate AI totals (if not already provided)
  aiResult.foods.forEach((food) => {
    // This would need the actual nutrition data from the full analysis
    // For now, we'll assume the totals are passed separately
  });

  // 1. Food Detection Metrics
  const detectedFoods = aiResult.foods.map((f) => normalizeFood(f.name));
  const actualFoods = groundTruth.foods.map((f) => normalizeFood(f.name));

  let truePositives = 0;
  const matchedActual = new Set<number>();

  // Find true positives (foods correctly identified)
  detectedFoods.forEach((detected) => {
    actualFoods.forEach((actual, index) => {
      if (!matchedActual.has(index) && foodsMatch(detected, actual)) {
        truePositives++;
        matchedActual.add(index);
      }
    });
  });

  const falsePositives = detectedFoods.length - truePositives;
  const falseNegatives = actualFoods.length - truePositives;

  const precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const foodDetectionAccuracy = actualFoods.length > 0 ? truePositives / actualFoods.length : 0;

  // 2. Quantity Accuracy (for matched foods only)
  const quantityErrors: number[] = [];

  aiResult.foods.forEach((aiFood) => {
    const matchingGT = groundTruth.foods.find((gtFood) =>
      foodsMatch(aiFood.name, gtFood.name)
    );

    if (matchingGT) {
      try {
        const aiGrams = convertToGrams(aiFood.quantity, aiFood.unit);
        const gtGrams = convertToGrams(matchingGT.quantity, matchingGT.unit);

        if (gtGrams > 0) {
          const error = Math.abs(aiGrams - gtGrams) / gtGrams;
          quantityErrors.push(error);
        }
      } catch (error) {
        // Skip if conversion fails
      }
    }
  });

  const avgQuantityError =
    quantityErrors.length > 0
      ? quantityErrors.reduce((a, b) => a + b, 0) / quantityErrors.length
      : 1;
  const quantityAccuracy = Math.max(0, 1 - avgQuantityError);

  // 3. Nutrition Accuracy (using totals from the full analysis)
  // Note: This requires the actual nutrition totals from the AI analysis
  // For simplicity, we'll use placeholder values that should be passed in
  const calorieError = 0; // Will be calculated with actual totals
  const proteinError = 0;
  const carbsError = 0;
  const fatError = 0;

  const calorieAccuracy = Math.max(0, 1 - calorieError);
  const proteinAccuracy = Math.max(0, 1 - proteinError);
  const carbsAccuracy = Math.max(0, 1 - carbsError);
  const fatAccuracy = Math.max(0, 1 - fatAccuracy);

  // 4. Overall Score (weighted average)
  const overallScore =
    f1Score * 0.4 + // Food detection is most important
    quantityAccuracy * 0.3 + // Quantity estimation
    calorieAccuracy * 0.3; // Nutrition accuracy

  return {
    precision,
    recall,
    f1Score,
    foodDetectionAccuracy,
    quantityAccuracy,
    avgQuantityError,
    calorieAccuracy,
    proteinAccuracy,
    carbsAccuracy,
    fatAccuracy,
    overallScore,
  };
}

/**
 * Calculate nutrition accuracy given AI totals and ground truth
 */
export function calculateNutritionAccuracy(
  aiTotals: { calories: number; protein: number; carbs: number; fat: number },
  groundTruth: GroundTruth
): {
  calorieAccuracy: number;
  proteinAccuracy: number;
  carbsAccuracy: number;
  fatAccuracy: number;
} {
  const calorieError =
    groundTruth.totalCalories > 0
      ? Math.abs(aiTotals.calories - groundTruth.totalCalories) / groundTruth.totalCalories
      : 0;

  const proteinError =
    groundTruth.totalProtein > 0
      ? Math.abs(aiTotals.protein - groundTruth.totalProtein) / groundTruth.totalProtein
      : 0;

  const carbsError =
    groundTruth.totalCarbs > 0
      ? Math.abs(aiTotals.carbs - groundTruth.totalCarbs) / groundTruth.totalCarbs
      : 0;

  const fatError =
    groundTruth.totalFat > 0
      ? Math.abs(aiTotals.fat - groundTruth.totalFat) / groundTruth.totalFat
      : 0;

  return {
    calorieAccuracy: Math.max(0, 1 - calorieError),
    proteinAccuracy: Math.max(0, 1 - proteinError),
    carbsAccuracy: Math.max(0, 1 - carbsError),
    fatAccuracy: Math.max(0, 1 - fatError),
  };
}

/**
 * Aggregate metrics from multiple evaluation results
 */
export function aggregateMetrics(results: EvaluationMetrics[]): EvaluationMetrics {
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    precision: avg(results.map((r) => r.precision)),
    recall: avg(results.map((r) => r.recall)),
    f1Score: avg(results.map((r) => r.f1Score)),
    foodDetectionAccuracy: avg(results.map((r) => r.foodDetectionAccuracy)),
    quantityAccuracy: avg(results.map((r) => r.quantityAccuracy)),
    avgQuantityError: avg(results.map((r) => r.avgQuantityError)),
    calorieAccuracy: avg(results.map((r) => r.calorieAccuracy)),
    proteinAccuracy: avg(results.map((r) => r.proteinAccuracy)),
    carbsAccuracy: avg(results.map((r) => r.carbsAccuracy)),
    fatAccuracy: avg(results.map((r) => r.fatAccuracy)),
    overallScore: avg(results.map((r) => r.overallScore)),
  };
}
