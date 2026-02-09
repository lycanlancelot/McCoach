'use client';

import Image from 'next/image';
import type { Meal } from '@/lib/api-client';

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this meal?')) {
      onDelete(meal.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        <Image
          src={meal.imageUrl}
          alt={meal.description || 'Meal'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {meal.confidence && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {Math.round(meal.confidence * 100)}% confidence
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Date and Description */}
        <div className="mb-3">
          <div className="text-sm text-gray-500">{formatDate(meal.timestamp)}</div>
          {meal.description && (
            <div className="text-gray-700 mt-1 text-sm">{meal.description}</div>
          )}
        </div>

        {/* Nutrition Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{Math.round(meal.calories)}</div>
            <div className="text-xs text-gray-600">cal</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-600">{meal.protein}g</div>
            <div className="text-xs text-gray-600">protein</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{meal.carbs}g</div>
            <div className="text-xs text-gray-600">carbs</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-600">{meal.fat}g</div>
            <div className="text-xs text-gray-600">fat</div>
          </div>
        </div>

        {/* Food Items */}
        {meal.aiAnalysis?.foods && meal.aiAnalysis.foods.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Detected foods:</div>
            <div className="flex flex-wrap gap-1">
              {meal.aiAnalysis.foods.slice(0, 3).map((food, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                >
                  {food.name}
                </span>
              ))}
              {meal.aiAnalysis.foods.length > 3 && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">
                  +{meal.aiAnalysis.foods.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-full mt-2 text-red-600 hover:text-red-700 text-sm font-medium py-2 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
