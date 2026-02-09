'use client';

import { useState, useEffect } from 'react';
import {
  analyzeMealImage,
  createMeal,
  getMeals,
  deleteMeal,
  type Meal,
  type MealAnalysisResult,
} from '@/lib/api-client';
import MealAnalysisModal from '@/components/MealAnalysisModal';
import MealCard from '@/components/MealCard';
import NutritionSummary from '@/components/NutritionSummary';

interface ProgressPhoto {
  id: string;
  image: string;
  date: Date;
  weight?: number;
  notes?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'meals' | 'progress' | 'suggestions'>('meals');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch meals on mount
  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      setIsLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await getMeals({
        startDate: today,
        limit: 50,
      });

      setMeals(result.meals);
    } catch (err) {
      console.error('Failed to load meals:', err);
      setError('Failed to load meals. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze the meal image with AI
      const analysis = await analyzeMealImage(file);
      setAnalysisResult(analysis);
      setShowAnalysisModal(true);
    } catch (err) {
      console.error('Failed to analyze meal:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze meal. Please check your API keys and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAnalysis = async (analysis: MealAnalysisResult) => {
    try {
      // Create meal in database
      const meal = await createMeal({
        imageUrl: analysis.imageUrl,
        description: analysis.aiAnalysis.notes || 'Analyzed meal',
        aiAnalysis: analysis.aiAnalysis,
        confidence: analysis.aiAnalysis.confidence,
        calories: analysis.totals.calories,
        protein: analysis.totals.protein,
        carbs: analysis.totals.carbs,
        fat: analysis.totals.fat,
        fiber: analysis.totals.fiber,
        sugar: analysis.totals.sugar,
        sodium: analysis.totals.sodium,
        foodItems: analysis.foodItems,
      });

      // Add to local state
      setMeals([meal, ...meals]);
      setShowAnalysisModal(false);
      setAnalysisResult(null);
    } catch (err) {
      console.error('Failed to save meal:', err);
      setError('Failed to save meal. Please try again.');
    }
  };

  const handleCancelAnalysis = () => {
    setShowAnalysisModal(false);
    setAnalysisResult(null);
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await deleteMeal(id);
      setMeals(meals.filter((meal) => meal.id !== id));
    } catch (err) {
      console.error('Failed to delete meal:', err);
      setError('Failed to delete meal. Please try again.');
    }
  };

  const handleProgressImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        const newProgress: ProgressPhoto = {
          id: Date.now().toString(),
          image: imageUrl,
          date: new Date(),
          notes: 'Progress photo',
        };
        setProgressPhotos([newProgress, ...progressPhotos]);
      };
      reader.readAsDataURL(file);
    }
  };

  const suggestions = [
    {
      title: '💪 Protein Boost',
      description: 'Add more lean protein to support muscle growth. Try chicken, fish, or legumes.',
      type: 'nutrition',
    },
    {
      title: '🏃 Cardio Day',
      description: '30 minutes of moderate cardio can burn 200-400 calories and improve heart health.',
      type: 'workout',
    },
    {
      title: '🥗 Veggie Power',
      description: 'Aim for 5 servings of vegetables today for optimal micronutrients.',
      type: 'nutrition',
    },
    {
      title: '🏋️ Strength Training',
      description: 'Focus on compound movements: squats, deadlifts, bench press for maximum gains.',
      type: 'workout',
    },
    {
      title: '💧 Stay Hydrated',
      description: 'Drink at least 8 glasses of water. Proper hydration boosts metabolism.',
      type: 'health',
    },
    {
      title: '😴 Rest & Recovery',
      description: 'Aim for 7-9 hours of sleep. Muscles grow during rest!',
      type: 'health',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-green-600">🌿 Healthy App</h1>
          <p className="text-gray-600 mt-1">Track your nutrition & fitness journey with AI</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'meals', label: '🍽️ Meals', icon: '🍽️' },
              { id: 'progress', label: '📸 Progress', icon: '📸' },
              { id: 'suggestions', label: '💡 Tips', icon: '💡' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Meals Tab */}
        {activeTab === 'meals' && (
          <div className="space-y-6">
            {/* Nutrition Summary */}
            <NutritionSummary meals={meals} />

            {/* Upload Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isAnalyzing
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-green-300 bg-green-50 hover:bg-green-100'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-2"></div>
                      <p className="text-sm text-gray-600">Analyzing your meal with AI...</p>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl mb-2">📷</span>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-green-600">Click to upload</span> your
                        meal photo
                      </p>
                      <p className="text-xs text-gray-500 mt-1">AI will identify foods & nutrition</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleMealImageUpload}
                  disabled={isAnalyzing}
                />
              </label>
            </div>

            {/* Meal List */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} />
                ))}
              </div>
            )}

            {!isLoading && meals.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No meals logged yet. Upload your first meal photo! 🍽️
              </p>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Upload Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-4xl mb-2">💪</span>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">Click to upload</span> your
                    progress photo
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProgressImageUpload}
                />
              </label>
            </div>

            {/* Progress Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {progressPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => setSelectedImage(photo.image)}
                >
                  <img src={photo.image} alt="Progress" className="w-full h-48 object-cover" />
                  <div className="p-3">
                    <p className="text-sm text-gray-600">{photo.date.toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
            {progressPhotos.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No progress photos yet. Start documenting your journey! 📸
              </p>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Personalized Tips for You</h2>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 ${
                  suggestion.type === 'nutrition'
                    ? 'border-green-500'
                    : suggestion.type === 'workout'
                      ? 'border-blue-500'
                      : 'border-purple-500'
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-800">{suggestion.title}</h3>
                <p className="text-gray-600 mt-2">{suggestion.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Analysis Modal */}
      {analysisResult && (
        <MealAnalysisModal
          analysis={analysisResult}
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          onConfirm={handleConfirmAnalysis}
          onCancel={handleCancelAnalysis}
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          🌿 Healthy App - AI-Powered Nutrition Tracking • Built with ❤️
        </div>
      </footer>
    </div>
  );
}
