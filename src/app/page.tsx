'use client';

import { useState } from 'react';

interface MealEntry {
  id: string;
  image: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
}

interface ProgressPhoto {
  id: string;
  image: string;
  date: Date;
  weight?: number;
  notes?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'meals' | 'progress' | 'suggestions'>('meals');
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'meal' | 'progress') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (type === 'meal') {
          const newMeal: MealEntry = {
            id: Date.now().toString(),
            image: imageUrl,
            description: 'Uploaded meal',
            calories: Math.floor(Math.random() * 500) + 200,
            protein: Math.floor(Math.random() * 30) + 10,
            carbs: Math.floor(Math.random() * 50) + 20,
            fat: Math.floor(Math.random() * 20) + 5,
            timestamp: new Date(),
          };
          setMeals([newMeal, ...meals]);
        } else {
          const newProgress: ProgressPhoto = {
            id: Date.now().toString(),
            image: imageUrl,
            date: new Date(),
            notes: 'Progress photo',
          };
          setProgressPhotos([newProgress, ...progressPhotos]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

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
          <p className="text-gray-600 mt-1">Track your nutrition & fitness journey</p>
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
        {/* Meals Tab */}
        {activeTab === 'meals' && (
          <div className="space-y-6">
            {/* Daily Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Nutrition</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <p className="text-2xl font-bold text-orange-600">{totalCalories}</p>
                  <p className="text-sm text-gray-600">Calories</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">{totalProtein}g</p>
                  <p className="text-sm text-gray-600">Protein</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-600">{totalCarbs}g</p>
                  <p className="text-sm text-gray-600">Carbs</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600">{totalFat}g</p>
                  <p className="text-sm text-gray-600">Fat</p>
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-300 rounded-xl cursor-pointer bg-green-50 hover:bg-green-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-4xl mb-2">📷</span>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-green-600">Click to upload</span> your meal photo
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'meal')}
                />
              </label>
            </div>

            {/* Meal List */}
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="bg-white rounded-2xl shadow-lg p-4 flex gap-4">
                  <img
                    src={meal.image}
                    alt="Meal"
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{meal.description}</p>
                    <p className="text-sm text-gray-500">
                      {meal.timestamp.toLocaleTimeString()}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-orange-600">{meal.calories} cal</span>
                      <span className="text-red-600">{meal.protein}g protein</span>
                      <span className="text-yellow-600">{meal.carbs}g carbs</span>
                      <span className="text-purple-600">{meal.fat}g fat</span>
                    </div>
                  </div>
                </div>
              ))}
              {meals.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No meals logged yet. Upload your first meal photo! 🍽️
                </p>
              )}
            </div>
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
                    <span className="font-semibold text-blue-600">Click to upload</span> your progress photo
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'progress')}
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
                  <img
                    src={photo.image}
                    alt="Progress"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm text-gray-600">
                      {photo.date.toLocaleDateString()}
                    </p>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Personalized Tips for You
            </h2>
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
                <h3 className="text-lg font-semibold text-gray-800">
                  {suggestion.title}
                </h3>
                <p className="text-gray-600 mt-2">{suggestion.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          🌿 Healthy App - Ava's Idea • Built with ❤️
        </div>
      </footer>
    </div>
  );
}
