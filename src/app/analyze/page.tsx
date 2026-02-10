'use client';

import { useState } from 'react';
import { analyzeMealImage, type MealAnalysisResult } from '@/lib/api-client';
import NavBar from '@/components/NavBar';

export default function AnalyzePage() {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setImageFile(null);
    setImagePreview(e.target.value);
  };

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    if (!imageUrl && !imageFile) {
      setError('Please provide an image URL or upload a file');
      return;
    }

    try {
      setIsAnalyzing(true);

      let analysisResult: MealAnalysisResult;

      if (imageFile) {
        // Upload file and analyze
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadResponse = await fetch('/api/meals/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to analyze image');
        }

        const data = await uploadResponse.json();
        analysisResult = data.data;
      } else {
        // Analyze from URL
        analysisResult = await analyzeMealImage({ imageUrl });
      }

      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatNutrient = (value: number, unit: string) => {
    return `${Math.round(value)}${unit}`;
  };

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🍽️ Meal Analyzer
          </h1>
          <p className="text-gray-600">
            Upload a photo or provide a URL to analyze your meal's nutrition
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={handleUrlChange}
                placeholder="https://example.com/meal.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isAnalyzing || !!imageFile}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-500 text-sm">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isAnalyzing || !!imageUrl}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                />
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!imageUrl && !imageFile)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                '🔍 Analyze Meal'
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* AI Confidence */}
            {result.aiAnalysis?.confidence && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    AI Confidence
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        style={{ width: `${result.aiAnalysis.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {Math.round(result.aiAnalysis.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition Totals */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                📊 Nutrition Summary
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-orange-600 text-sm font-medium mb-1">
                    Calories
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    {formatNutrient(result.totals.calories, '')}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">kcal</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-blue-600 text-sm font-medium mb-1">
                    Protein
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {formatNutrient(result.totals.protein, '')}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">grams</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-green-600 text-sm font-medium mb-1">
                    Carbs
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    {formatNutrient(result.totals.carbs, '')}
                  </div>
                  <div className="text-xs text-green-600 mt-1">grams</div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <div className="text-yellow-600 text-sm font-medium mb-1">
                    Fat
                  </div>
                  <div className="text-3xl font-bold text-yellow-900">
                    {formatNutrient(result.totals.fat, '')}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">grams</div>
                </div>
              </div>
            </div>

            {/* Detected Foods */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🍴 Detected Foods
              </h2>

              <div className="space-y-3">
                {result.foodItems.map((food, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {food.name}
                        </h3>
                        {food.confidence && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {Math.round(food.confidence * 100)}% sure
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {food.quantity} {food.unit}
                      </div>

                      {food.nutrition && (
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="text-orange-600 font-medium">
                            {Math.round(food.nutrition.calories)} cal
                          </span>
                          <span className="text-blue-600">
                            {Math.round(food.nutrition.protein)}g protein
                          </span>
                          <span className="text-green-600">
                            {Math.round(food.nutrition.carbs)}g carbs
                          </span>
                          <span className="text-yellow-600">
                            {Math.round(food.nutrition.fat)}g fat
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Notes */}
            {result.aiAnalysis?.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  💭 AI Notes
                </h3>
                <p className="text-blue-800">{result.aiAnalysis.notes}</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
