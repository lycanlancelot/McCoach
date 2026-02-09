# AI Evaluation & Benchmarking System

This document explains how to use the evaluation system to measure and improve AI performance.

## Overview

The evaluation system allows you to:
1. **Create benchmark datasets** with ground truth data
2. **Run evaluations** to measure AI accuracy
3. **Track improvements** over time as you update prompts or models
4. **Compare results** across different model versions

---

## Quick Start

### 1. Load Sample Benchmark Dataset

```bash
# Load the sample dataset (3 items: salad, pancakes, burger)
npx tsx scripts/load-benchmark.ts
```

### 2. Run Evaluation

```bash
# Run evaluation on all benchmark items
curl -X POST http://localhost:3000/api/evaluation/run | python3 -m json.tool
```

### 3. View Results

The response will include:
- **Aggregated metrics** (overall performance)
- **Individual results** (per-image analysis)

---

## Metrics Explained

### Food Detection Metrics

- **Precision**: Of the foods AI detected, what % were correct?
  - `TP / (TP + FP)`
  - Higher is better (fewer false alarms)

- **Recall**: Of all actual foods, what % did AI detect?
  - `TP / (TP + FN)`
  - Higher is better (fewer missed foods)

- **F1 Score**: Harmonic mean of precision and recall
  - `2 × (precision × recall) / (precision + recall)`
  - Balanced measure of detection quality

- **Food Detection Accuracy**: % of actual foods correctly identified

### Quantity Metrics

- **Quantity Accuracy**: 1 - average % error in portion sizes
  - Example: If actual is 6 oz and AI says 7.5 oz, error = 25%
  - Accuracy = 75%

### Nutrition Metrics

- **Calorie Accuracy**: 1 - % error in total calories
- **Protein/Carbs/Fat Accuracy**: Same as calories

### Overall Score

Weighted average:
- 40% Food detection (F1 score)
- 30% Quantity accuracy
- 30% Calorie accuracy

---

## Creating Your Own Benchmark

### Option 1: Manual JSON File

Create `benchmark/my-dataset.json`:

```json
[
  {
    "imageUrl": "https://example.com/meal1.jpg",
    "groundTruth": {
      "foods": [
        {
          "name": "grilled chicken breast",
          "quantity": 6,
          "unit": "oz",
          "calories": 280,
          "protein": 53,
          "carbs": 0,
          "fat": 6
        },
        {
          "name": "brown rice",
          "quantity": 1,
          "unit": "cup",
          "calories": 216,
          "protein": 5,
          "carbs": 45,
          "fat": 2
        }
      ],
      "totalCalories": 496,
      "totalProtein": 58,
      "totalCarbs": 45,
      "totalFat": 8
    },
    "metadata": {
      "mealType": "lunch",
      "complexity": "simple",
      "description": "Grilled chicken with rice"
    }
  }
]
```

Then load it:

```bash
# Modify scripts/load-benchmark.ts to use your file
# Then run:
npx tsx scripts/load-benchmark.ts
```

### Option 2: Via API

```bash
curl -X POST http://localhost:3000/api/evaluation/benchmark \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/meal.jpg",
    "groundTruth": {
      "foods": [...],
      "totalCalories": 500,
      ...
    },
    "metadata": {
      "mealType": "lunch"
    }
  }'
```

---

## The EUR Loop (Evaluation-Update-Re-evaluate)

### Step 1: Baseline Evaluation

```bash
# Run initial evaluation
curl -X POST http://localhost:3000/api/evaluation/run
```

Record the results:
```json
{
  "aggregated": {
    "f1Score": 0.75,
    "quantityAccuracy": 0.60,
    "calorieAccuracy": 0.70,
    "overallScore": 0.68
  }
}
```

### Step 2: Identify Issues

Look at individual results to find patterns:

```json
{
  "results": [
    {
      "imageUrl": "...",
      "groundTruth": {
        "foods": [{"name": "brown rice", ...}]
      },
      "aiResult": {
        "foods": [{"name": "quinoa", ...}]  // Misidentified!
      }
    }
  ]
}
```

Common issues:
- Rice vs quinoa confusion
- Portion size overestimation
- Missing small items (sauces, garnishes)

### Step 3: Update Prompts

Edit `src/lib/claude-vision-client.ts`:

```typescript
const IMPROVED_PROMPT = `...

SPECIFIC GUIDELINES:
- Rice appears white/brown and grainy. Quinoa is smaller with visible "tails"
- For portions, use visual references:
  * Chicken breast: size of deck of cards (~6 oz)
  * Rice/grains: baseball = 1 cup
- Don't forget small items like butter, sauces, dressings

...`;
```

Update prompt version in evaluation endpoint:

```typescript
// src/app/api/evaluation/run/route.ts
promptVersion: '1.1', // Increment when you update prompts
```

### Step 4: Re-evaluate

```bash
# Run evaluation again
curl -X POST http://localhost:3000/api/evaluation/run
```

Compare results:
```json
{
  "aggregated": {
    "f1Score": 0.82,        // +0.07
    "quantityAccuracy": 0.68, // +0.08
    "calorieAccuracy": 0.78,  // +0.08
    "overallScore": 0.76      // +0.08 🎉
  }
}
```

### Step 5: Track Over Time

```bash
# Get evaluation history
curl http://localhost:3000/api/evaluation/run

# Returns last 10 runs with timestamps and metrics
```

---

## Best Practices

### Creating Good Benchmarks

1. **Diverse meals**: Include breakfast, lunch, dinner, snacks
2. **Various complexities**: Simple (1-2 items) to complex (5+ items)
3. **Different cuisines**: American, Asian, Mediterranean, etc.
4. **Clear photos**: Good lighting, visible foods
5. **Accurate ground truth**: Weigh foods if possible

### Measuring Ground Truth

```bash
# Example workflow:
1. Take photo of meal
2. Weigh each component (digital kitchen scale)
3. Look up nutrition in USDA database
4. Calculate totals
5. Add to benchmark dataset
```

### Iteration Tips

- Run evaluation after each prompt change
- Keep prompt versions documented
- Test on at least 10-20 images for reliable metrics
- Focus on fixing one issue at a time

---

## API Reference

### POST /api/evaluation/run

Run evaluation on benchmark dataset.

**Request:**
```json
{
  "benchmarkIds": ["id1", "id2"]  // Optional: specific items
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "runId": "...",
    "aggregated": {
      "precision": 0.85,
      "recall": 0.80,
      "f1Score": 0.82,
      "foodDetectionAccuracy": 0.80,
      "quantityAccuracy": 0.68,
      "calorieAccuracy": 0.78,
      "overallScore": 0.76,
      "totalItems": 3,
      "averageConfidence": 0.85
    },
    "results": [...]
  }
}
```

### GET /api/evaluation/run

Get evaluation run history.

**Response:**
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": "...",
        "modelVersion": "claude-sonnet-4-20250514",
        "promptVersion": "1.0",
        "metrics": {...},
        "timestamp": "2026-02-09T..."
      }
    ]
  }
}
```

### POST /api/evaluation/benchmark

Add benchmark item.

### GET /api/evaluation/benchmark

Get all benchmark items.

### DELETE /api/evaluation/benchmark?id=xxx

Delete benchmark item.

---

## Database Schema

```sql
-- Benchmark items (ground truth)
BenchmarkItem {
  id           String
  imageUrl     String
  groundTruth  Text (JSON)
  metadata     Text (JSON)
  createdAt    DateTime
}

-- Evaluation runs (results)
EvaluationRun {
  id            String
  modelVersion  String
  promptVersion String
  metrics       Text (JSON)
  results       Text (JSON)
  timestamp     DateTime
}
```

---

## Troubleshooting

### "No benchmark items found"

Run the load script:
```bash
npx tsx scripts/load-benchmark.ts
```

### Low accuracy scores

- Check if ground truth is accurate
- Verify image URLs are accessible
- Review individual results to identify patterns

### Evaluation takes too long

- Limit benchmark items (default: 20 max per run)
- Use `benchmarkIds` parameter to test specific items

---

**Next Steps:**

1. Load sample dataset
2. Run first evaluation
3. Analyze results
4. Update prompts
5. Re-evaluate and compare!

Happy evaluating! 🎯
