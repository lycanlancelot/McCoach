'use client';

import { useState } from 'react';
import type { MealAnalysisResult } from '@/lib/api-client';

interface MealAnalysisModalProps {
  analysis: MealAnalysisResult;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (analysis: MealAnalysisResult) => void;
  onCancel: () => void;
}

export default function MealAnalysisModal({
  analysis,
  isOpen,
  onClose,
  onConfirm,
  onCancel,
}: MealAnalysisModalProps) {
  const [editedAnalysis, setEditedAnalysis] = useState(analysis);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(editedAnalysis);
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const handleRemoveFood = (index: number) => {
    const updatedFoods = editedAnalysis.foodItems.filter((_, i) => i !== index);
    const updatedTotals = updatedFoods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.nutrition?.calories || 0),
        protein: acc.protein + (food.nutrition?.protein || 0),
        carbs: acc.carbs + (food.nutrition?.carbs || 0),
        fat: acc.fat + (food.nutrition?.fat || 0),
        fiber: acc.fiber + (food.nutrition?.fiber || 0),
        sugar: acc.sugar + (food.nutrition?.sugar || 0),
        sodium: acc.sodium + (food.nutrition?.sodium || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
    );

    setEditedAnalysis({
      ...editedAnalysis,
      foodItems: updatedFoods,
      totals: updatedTotals,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Analysis Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                Confidence: {Math.round(editedAnalysis.aiAnalysis.confidence * 100)}%
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* AI Notes */}
          {editedAnalysis.aiAnalysis.notes && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{editedAnalysis.aiAnalysis.notes}</p>
            </div>
          )}

          {/* Detected Foods */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Detected Foods</h3>
            {editedAnalysis.foodItems.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                No foods detected. You can add them manually after saving.
              </p>
            ) : (
              <div className="space-y-2">
                {editedAnalysis.foodItems.map((food, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{food.name}</span>
                        {food.fdcId && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {food.quantity} {food.unit} ({food.grams}g)
                        {food.nutrition && (
                          <span className="ml-2">
                            • {Math.round(food.nutrition.calories)} cal, {food.nutrition.protein}g
                            protein
                          </span>
                        )}
                      </div>
                      {food.description && food.description !== food.name && (
                        <div className="text-xs text-gray-500 mt-1">{food.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFood(index)}
                      className="ml-3 text-red-500 hover:text-red-700"
                      aria-label="Remove food"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition Totals */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Nutrition Totals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {editedAnalysis.totals.calories}
                </div>
                <div className="text-xs text-gray-600">Calories</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {editedAnalysis.totals.protein}g
                </div>
                <div className="text-xs text-gray-600">Protein</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {editedAnalysis.totals.carbs}g
                </div>
                <div className="text-xs text-gray-600">Carbs</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {editedAnalysis.totals.fat}g
                </div>
                <div className="text-xs text-gray-600">Fat</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Confirm & Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
