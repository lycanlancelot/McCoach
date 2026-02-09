/**
 * Types for evaluation and benchmarking system
 */

export interface FoodGroundTruth {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GroundTruth {
  foods: FoodGroundTruth[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface BenchmarkMetadata {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  complexity?: 'simple' | 'medium' | 'complex';
  cuisine?: string;
  description?: string;
}

export interface BenchmarkItem {
  id?: string;
  imageUrl: string;
  groundTruth: GroundTruth;
  metadata?: BenchmarkMetadata;
}

export interface EvaluationMetrics {
  // Food detection metrics
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1Score: number; // Harmonic mean of precision and recall
  foodDetectionAccuracy: number; // % of foods correctly identified

  // Quantity metrics
  quantityAccuracy: number; // 1 - average % error
  avgQuantityError: number; // Average absolute % error

  // Nutrition metrics
  calorieAccuracy: number; // 1 - % error
  proteinAccuracy: number;
  carbsAccuracy: number;
  fatAccuracy: number;

  // Overall
  overallScore: number; // Weighted average of all metrics
}

export interface EvaluationResult {
  imageUrl: string;
  aiResult: any; // AI analysis result
  groundTruth: GroundTruth;
  metrics: EvaluationMetrics;
  errors?: string[];
}

export interface AggregatedMetrics extends EvaluationMetrics {
  totalItems: number;
  averageConfidence: number;
  modelVersion: string;
  timestamp: Date;
}
