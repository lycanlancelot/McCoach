'use client';

import type { Meal } from '@/lib/api-client';

interface NutritionSummaryProps {
  meals: Meal[];
}

export default function NutritionSummary({ meals }: NutritionSummaryProps) {
  // Calculate daily totals from all meals
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Typical daily goals (these could be user-configurable in the future)
  const goals = {
    calories: 2000,
    protein: 150,
    carbs: 225,
    fat: 65,
  };

  const getPercentage = (current: number, goal: number) => {
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Today&apos;s Summary</h2>

      {meals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No meals logged yet today</p>
          <p className="text-sm text-gray-400 mt-1">Upload a meal photo to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calories */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-gray-700">Calories</span>
              <span className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{Math.round(totals.calories)}</span> /{' '}
                {goals.calories}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getPercentage(totals.calories, goals.calories))} transition-all duration-500`}
                style={{ width: `${getPercentage(totals.calories, goals.calories)}%` }}
              />
            </div>
          </div>

          {/* Protein */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-gray-700">Protein</span>
              <span className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{Math.round(totals.protein)}g</span> /{' '}
                {goals.protein}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getPercentage(totals.protein, goals.protein))} transition-all duration-500`}
                style={{ width: `${getPercentage(totals.protein, goals.protein)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-gray-700">Carbs</span>
              <span className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{Math.round(totals.carbs)}g</span> /{' '}
                {goals.carbs}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getPercentage(totals.carbs, goals.carbs))} transition-all duration-500`}
                style={{ width: `${getPercentage(totals.carbs, goals.carbs)}%` }}
              />
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-gray-700">Fat</span>
              <span className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{Math.round(totals.fat)}g</span> /{' '}
                {goals.fat}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getPercentage(totals.fat, goals.fat))} transition-all duration-500`}
                style={{ width: `${getPercentage(totals.fat, goals.fat)}%` }}
              />
            </div>
          </div>

          {/* Meal Count */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Meals logged</span>
              <span className="text-lg font-bold text-gray-900">{meals.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
