#!/usr/bin/env tsx

/**
 * Download benchmark dataset from Hugging Face
 * Uses the Food Nutrients dataset (Nutrition5k derivative)
 *
 * Usage: npx tsx scripts/download-benchmark-dataset.ts [--count=10]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

interface FoodNutrient {
  name: string;
  grams: number;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
}

interface Nutrition5kSample {
  image?: {
    path?: string;
    bytes?: Buffer;
  };
  dish_id?: string;
  total_calories?: number;
  total_mass?: number;
  total_fat?: number;
  total_carbs?: number;
  total_protein?: number;
  ingredients?: FoodNutrient[];
}

interface BenchmarkItem {
  imageUrl: string;
  groundTruth: {
    foods: Array<{
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  metadata: {
    source: string;
    dishId?: string;
    totalMass?: number;
  };
}

// Parse command line arguments
const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const sampleCount = countArg ? parseInt(countArg.split('=')[1]) : 10;

const BENCHMARK_DIR = path.join(process.cwd(), 'benchmark');
const IMAGES_DIR = path.join(BENCHMARK_DIR, 'images');
const OUTPUT_FILE = path.join(BENCHMARK_DIR, 'nutrition5k-dataset.json');

// Create directories
if (!fs.existsSync(BENCHMARK_DIR)) {
  fs.mkdirSync(BENCHMARK_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download image from URL
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        if (response.headers.location) {
          downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Save image buffer to file
 */
function saveImageBuffer(buffer: Buffer, filepath: string): void {
  fs.writeFileSync(filepath, buffer);
}

/**
 * Convert Nutrition5k sample to our benchmark format
 */
function convertToBenchmarkItem(
  sample: Nutrition5kSample,
  imageFilename: string
): BenchmarkItem {
  const foods = (sample.ingredients || []).map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.grams,
    unit: 'g',
    calories: ingredient.calories,
    protein: ingredient.protein,
    carbs: ingredient.carbs,
    fat: ingredient.fat,
  }));

  return {
    imageUrl: `/benchmark/images/${imageFilename}`,
    groundTruth: {
      foods,
      totalCalories: sample.total_calories || 0,
      totalProtein: sample.total_protein || 0,
      totalCarbs: sample.total_carbs || 0,
      totalFat: sample.total_fat || 0,
    },
    metadata: {
      source: 'nutrition5k',
      dishId: sample.dish_id,
      totalMass: sample.total_mass,
    },
  };
}

/**
 * Main function - fetch and process dataset
 */
async function main() {
  console.log('📥 Downloading benchmark dataset from Hugging Face...\n');
  console.log(`Fetching ${sampleCount} samples from Food Nutrients dataset\n`);

  try {
    // Note: This requires the datasets library to be installed
    // We'll use a Python script to fetch the data
    const pythonScript = `
import json
import sys
from datasets import load_dataset

# Load dataset
dataset = load_dataset("mmathys/food-nutrients", split="test")

# Get samples
samples = []
for i in range(min(${sampleCount}, len(dataset))):
    item = dataset[i]

    # Convert image to base64 if available
    image_data = None
    if 'image' in item and item['image'] is not None:
        import io
        from PIL import Image

        img = item['image']
        # Save image bytes
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        image_data = buf.getvalue().hex()

    samples.append({
        'dish_id': item.get('dish_id', f'dish_{i}'),
        'total_calories': float(item.get('total_calories', 0)),
        'total_mass': float(item.get('total_mass', 0)),
        'total_fat': float(item.get('total_fat', 0)),
        'total_carbs': float(item.get('total_carb', 0)),  # Note: dataset uses 'total_carb'
        'total_protein': float(item.get('total_protein', 0)),
        'ingredients': [
            {
                'name': ing.get('name', 'unknown'),
                'grams': float(ing.get('grams', 0)),
                'calories': float(ing.get('calories', 0)),
                'fat': float(ing.get('fat', 0)),
                'carbs': float(ing.get('carb', 0)),  # Note: dataset uses 'carb'
                'protein': float(ing.get('protein', 0)),
            }
            for ing in item.get('ingredients', [])
        ],
        'image_data': image_data
    })

print(json.dumps(samples))
`;

    // Write Python script to temp file
    const tempScriptPath = path.join(process.cwd(), 'temp_download.py');
    fs.writeFileSync(tempScriptPath, pythonScript);

    console.log('Running Python script to fetch data...');
    console.log('(This requires: pip install datasets pillow)\n');

    // Execute Python script
    const { execSync } = require('child_process');
    let output: string;

    try {
      output = execSync(`python3 ${tempScriptPath}`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });
    } catch (error) {
      console.error('❌ Failed to run Python script.');
      console.error('Make sure you have installed: pip install datasets pillow');
      throw error;
    } finally {
      // Clean up temp file
      fs.unlinkSync(tempScriptPath);
    }

    const samples: Array<Nutrition5kSample & { image_data?: string }> = JSON.parse(output);
    console.log(`✅ Fetched ${samples.length} samples\n`);

    // Convert to benchmark format and save images
    const benchmarkItems: BenchmarkItem[] = [];

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const imageFilename = `${sample.dish_id || `dish_${i}`}.jpg`;
      const imagePath = path.join(IMAGES_DIR, imageFilename);

      // Save image
      if (sample.image_data) {
        const imageBuffer = Buffer.from(sample.image_data, 'hex');
        saveImageBuffer(imageBuffer, imagePath);
        console.log(`✅ Saved image: ${imageFilename}`);
      } else {
        console.warn(`⚠️  No image data for sample ${i}`);
        continue;
      }

      // Convert to benchmark format
      const benchmarkItem = convertToBenchmarkItem(sample, imageFilename);
      benchmarkItems.push(benchmarkItem);

      // Log details
      console.log(`   Dish ID: ${sample.dish_id}`);
      console.log(`   Total Calories: ${sample.total_calories}`);
      console.log(`   Ingredients: ${sample.ingredients?.length || 0}`);
      console.log('');
    }

    // Save benchmark dataset
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(benchmarkItems, null, 2));
    console.log(`\n🎉 Successfully created benchmark dataset!`);
    console.log(`   Images: ${IMAGES_DIR}`);
    console.log(`   Dataset: ${OUTPUT_FILE}`);
    console.log(`   Total items: ${benchmarkItems.length}\n`);

    console.log('📝 Next steps:');
    console.log('   1. Load into database: DATABASE_URL=... npx tsx scripts/load-benchmark.ts');
    console.log('   2. Run evaluation: curl -X POST http://localhost:3000/api/evaluation/run\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
