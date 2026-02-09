/**
 * TypeScript types for OpenAI Vision API integration
 */

/**
 * Detected food item from AI image analysis
 */
export interface DetectedFood {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
}

/**
 * Complete AI analysis result
 */
export interface AIAnalysisResult {
  foods: DetectedFood[];
  confidence: number;
  notes?: string;
}

/**
 * OpenAI Vision API request parameters
 */
export interface VisionAnalysisParams {
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Parsed response from OpenAI structured output
 */
export interface ParsedFoodResponse {
  foods: DetectedFood[];
  overall_confidence: number;
  notes?: string;
}
