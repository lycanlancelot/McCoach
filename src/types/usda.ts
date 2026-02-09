// USDA FoodData Central API Types
// API Documentation: https://fdc.nal.usda.gov/api-guide.html

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
  rank?: number;
  indentLevel?: number;
  foodNutrientId?: number;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: USDAFoodNutrient[];
}

export interface USDASearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList?: number[];
  foods: USDAFood[];
  foodSearchCriteria?: {
    query: string;
    dataType?: string[];
    pageSize: number;
    pageNumber: number;
    sortBy?: string;
    sortOrder?: string;
  };
}

export interface USDAFoodDetails extends USDAFood {
  foodClass?: string;
  modifiedDate?: string;
  availableDate?: string;
  foodCategory?: {
    id: number;
    code: string;
    description: string;
  };
  foodComponents?: Array<{
    id: number;
    name: string;
    dataPoints: number;
    gramWeight: number;
    isRefuse: boolean;
    minYearAcquired: number;
    percentWeight: number;
  }>;
  foodNutrients: USDAFoodNutrient[];
  nutrientConversionFactors?: Array<{
    type: string;
    value: number;
  }>;
}

// Normalized nutrition data structure (our internal format)
export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// Search parameters
export interface USDASearchParams {
  query: string;
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  brandOwner?: string;
}

// API Error response
export interface USDAError {
  error: {
    code: string;
    message: string;
  };
}

// Nutrient IDs from USDA database (standardized)
export const USDA_NUTRIENT_IDS = {
  ENERGY: 1008, // Energy (kcal)
  PROTEIN: 1003, // Protein (g)
  CARBOHYDRATE: 1005, // Carbohydrate, by difference (g)
  FAT: 1004, // Total lipid (fat) (g)
  FIBER: 1079, // Fiber, total dietary (g)
  SUGAR: 2000, // Sugars, total including NLEA (g)
  SODIUM: 1093, // Sodium, Na (mg)
} as const;
