import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeMealImage } from '@/lib/claude-vision-client';
import { searchAndCacheFoods } from '@/lib/usda-client';
import { calculateNutritionForServing, convertToGrams } from '@/lib/nutrition-calculator';
import { calculateMetrics, calculateNutritionAccuracy, aggregateMetrics } from '@/lib/evaluation/metrics';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import type { EvaluationResult } from '@/types/evaluation';

/**
 * POST /api/evaluation/run
 * Run evaluation on benchmark dataset
 *
 * Request body:
 * {
 *   benchmarkIds?: string[] // Optional: specific benchmark IDs to test
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { benchmarkIds } = body;

    // Fetch benchmark items
    let benchmarkItems;
    if (benchmarkIds && benchmarkIds.length > 0) {
      benchmarkItems = await prisma.benchmarkItem.findMany({
        where: { id: { in: benchmarkIds } },
      });
    } else {
      // Run on all benchmark items
      benchmarkItems = await prisma.benchmarkItem.findMany({
        take: 20, // Limit to avoid long-running requests
      });
    }

    if (benchmarkItems.length === 0) {
      return errorResponse('No benchmark items found. Please create benchmark dataset first.', 400);
    }

    // Run evaluation on each item
    const results: EvaluationResult[] = [];

    for (const item of benchmarkItems) {
      try {
        const groundTruth = JSON.parse(item.groundTruth);

        // Analyze image with AI
        const aiAnalysis = await analyzeMealImage({
          imageUrl: item.imageUrl,
        });

        // Get nutrition data for detected foods
        let aiTotals = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };

        const foodsWithNutrition = await Promise.all(
          aiAnalysis.foods.map(async (food) => {
            try {
              const grams = convertToGrams(food.quantity, food.unit);
              const searchResults = await searchAndCacheFoods(food.name, 1);

              if (searchResults.foods && searchResults.foods.length > 0) {
                const usdaFood = searchResults.foods[0];
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

                aiTotals.calories += nutrition.calories;
                aiTotals.protein += nutrition.protein;
                aiTotals.carbs += nutrition.carbs;
                aiTotals.fat += nutrition.fat;

                return { ...food, nutrition };
              }
              return { ...food, nutrition: null };
            } catch (error) {
              return { ...food, nutrition: null };
            }
          })
        );

        // Calculate metrics
        let metrics = calculateMetrics(aiAnalysis, groundTruth);

        // Update nutrition accuracy with actual totals
        const nutritionAccuracy = calculateNutritionAccuracy(aiTotals, groundTruth);
        metrics = { ...metrics, ...nutritionAccuracy };

        // Recalculate overall score with nutrition data
        metrics.overallScore =
          metrics.f1Score * 0.4 +
          metrics.quantityAccuracy * 0.3 +
          metrics.calorieAccuracy * 0.3;

        results.push({
          imageUrl: item.imageUrl,
          aiResult: {
            ...aiAnalysis,
            foods: foodsWithNutrition,
            totals: aiTotals,
          },
          groundTruth,
          metrics,
        });
      } catch (error) {
        results.push({
          imageUrl: item.imageUrl,
          aiResult: null,
          groundTruth: JSON.parse(item.groundTruth),
          metrics: {
            precision: 0,
            recall: 0,
            f1Score: 0,
            foodDetectionAccuracy: 0,
            quantityAccuracy: 0,
            avgQuantityError: 1,
            calorieAccuracy: 0,
            proteinAccuracy: 0,
            carbsAccuracy: 0,
            fatAccuracy: 0,
            overallScore: 0,
          },
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }

    // Aggregate metrics
    const validResults = results.filter((r) => r.metrics.overallScore > 0);
    const aggregated = aggregateMetrics(validResults.map((r) => r.metrics));

    const averageConfidence =
      validResults.reduce(
        (sum, r) => sum + (r.aiResult?.confidence || 0),
        0
      ) / Math.max(validResults.length, 1);

    // Store evaluation run
    const evaluationRun = await prisma.evaluationRun.create({
      data: {
        modelVersion: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        promptVersion: '1.0', // You can increment this when you update prompts
        metrics: JSON.stringify({
          ...aggregated,
          totalItems: results.length,
          averageConfidence,
        }),
        results: JSON.stringify(results),
        timestamp: new Date(),
      },
    });

    return successResponse({
      runId: evaluationRun.id,
      aggregated: {
        ...aggregated,
        totalItems: results.length,
        averageConfidence,
      },
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/evaluation/run
 * Get evaluation run history
 */
export async function GET() {
  try {
    const runs = await prisma.evaluationRun.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const runsWithParsedData = runs.map((run: typeof runs[number]) => ({
      id: run.id,
      modelVersion: run.modelVersion,
      promptVersion: run.promptVersion,
      metrics: JSON.parse(run.metrics),
      timestamp: run.timestamp,
    }));

    return successResponse({ runs: runsWithParsedData });
  } catch (error) {
    return handleApiError(error);
  }
}
