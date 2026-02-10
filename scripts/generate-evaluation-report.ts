#!/usr/bin/env tsx

/**
 * Generate visual HTML report from evaluation results
 * Usage: npx tsx scripts/generate-evaluation-report.ts [evaluation-run-id]
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Parse command line arguments
const args = process.argv.slice(2);
const runId = args[0];

interface EvaluationResult {
  imageUrl: string;
  aiResult: any;
  groundTruth: any;
  metrics: any;
  errors?: string[];
}

interface AggregatedMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  foodDetectionAccuracy: number;
  quantityAccuracy: number;
  avgQuantityError: number;
  calorieAccuracy: number;
  proteinAccuracy: number;
  carbsAccuracy: number;
  fatAccuracy: number;
  overallScore: number;
  totalItems: number;
  averageConfidence: number;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return '#10b981'; // Green
  if (score >= 0.6) return '#f59e0b'; // Orange
  if (score >= 0.4) return '#ef4444'; // Red
  return '#991b1b'; // Dark red
}

function getScoreEmoji(score: number): string {
  if (score >= 0.8) return '🟢';
  if (score >= 0.6) return '🟡';
  if (score >= 0.4) return '🟠';
  return '🔴';
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function generateMetricCard(label: string, value: number, subtitle?: string): string {
  const color = getScoreColor(value);
  const emoji = getScoreEmoji(value);

  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value" style="color: ${color}">
        ${emoji} ${formatPercentage(value)}
      </div>
      ${subtitle ? `<div class="metric-subtitle">${subtitle}</div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${value * 100}%; background: ${color}"></div>
      </div>
    </div>
  `;
}

function generateFoodComparison(aiResult: any, groundTruth: any): string {
  const aiFoods = aiResult?.foods || [];
  const gtFoods = groundTruth?.foods || [];

  let html = `
    <div class="food-comparison">
      <div class="comparison-column">
        <h3>🤖 AI Detected (${aiFoods.length} items)</h3>
        <ul class="food-list ai-foods">
  `;

  aiFoods.forEach((food: any) => {
    const confidence = food.confidence || 0;
    const confColor = getScoreColor(confidence);
    html += `
      <li>
        <span class="food-name">${food.name}</span>
        <span class="food-quantity">${food.quantity} ${food.unit}</span>
        <span class="food-confidence" style="color: ${confColor}">
          ${formatPercentage(confidence)}
        </span>
      </li>
    `;
  });

  html += `
        </ul>
      </div>
      <div class="comparison-column">
        <h3>✅ Ground Truth (${gtFoods.length} items)</h3>
        <ul class="food-list ground-truth-foods">
  `;

  gtFoods.forEach((food: any) => {
    html += `
      <li>
        <span class="food-name">${food.name}</span>
        <span class="food-quantity">${food.quantity} ${food.unit}</span>
      </li>
    `;
  });

  html += `
        </ul>
      </div>
    </div>
  `;

  return html;
}

function generateNutritionComparison(aiResult: any, groundTruth: any): string {
  const aiTotals = aiResult?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const gtTotals = {
    calories: groundTruth?.totalCalories || 0,
    protein: groundTruth?.totalProtein || 0,
    carbs: groundTruth?.totalCarbs || 0,
    fat: groundTruth?.totalFat || 0,
  };

  const nutrients = [
    { name: 'Calories', ai: aiTotals.calories, gt: gtTotals.calories, unit: 'kcal' },
    { name: 'Protein', ai: aiTotals.protein, gt: gtTotals.protein, unit: 'g' },
    { name: 'Carbs', ai: aiTotals.carbs, gt: gtTotals.carbs, unit: 'g' },
    { name: 'Fat', ai: aiTotals.fat, gt: gtTotals.fat, unit: 'g' },
  ];

  let html = `
    <div class="nutrition-comparison">
      <table class="nutrition-table">
        <thead>
          <tr>
            <th>Nutrient</th>
            <th>AI Detected</th>
            <th>Ground Truth</th>
            <th>Difference</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
  `;

  nutrients.forEach(({ name, ai, gt, unit }) => {
    const diff = ai - gt;
    const diffPercent = gt > 0 ? Math.abs(diff) / gt : 0;
    const accuracy = Math.max(0, 1 - diffPercent);
    const color = getScoreColor(accuracy);
    const emoji = getScoreEmoji(accuracy);

    html += `
      <tr>
        <td><strong>${name}</strong></td>
        <td>${ai.toFixed(1)} ${unit}</td>
        <td>${gt.toFixed(1)} ${unit}</td>
        <td class="${diff > 0 ? 'diff-over' : 'diff-under'}">
          ${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit}
        </td>
        <td style="color: ${color}">
          ${emoji} ${formatPercentage(accuracy)}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

function generateResultCard(result: EvaluationResult, index: number): string {
  const metrics = result.metrics;
  const overallColor = getScoreColor(metrics.overallScore);

  return `
    <div class="result-card">
      <div class="result-header">
        <h2>Meal #${index + 1}</h2>
        <div class="overall-score" style="background: ${overallColor}">
          ${getScoreEmoji(metrics.overallScore)} Overall: ${formatPercentage(metrics.overallScore)}
        </div>
      </div>

      <div class="result-content">
        <div class="image-section">
          <img src="${result.imageUrl}" alt="Meal ${index + 1}" class="meal-image" />
          ${result.aiResult?.notes ? `
            <div class="ai-notes">
              <strong>AI Notes:</strong> ${result.aiResult.notes}
            </div>
          ` : ''}
        </div>

        <div class="metrics-grid">
          ${generateMetricCard('Food Detection (F1)', metrics.f1Score, 'Precision & Recall')}
          ${generateMetricCard('Quantity Accuracy', metrics.quantityAccuracy, `Avg Error: ${formatPercentage(metrics.avgQuantityError)}`)}
          ${generateMetricCard('Calorie Accuracy', metrics.calorieAccuracy)}
          ${generateMetricCard('Protein Accuracy', metrics.proteinAccuracy)}
          ${generateMetricCard('Carbs Accuracy', metrics.carbsAccuracy)}
          ${generateMetricCard('Fat Accuracy', metrics.fatAccuracy)}
        </div>

        <div class="detailed-section">
          <h3>🍽️ Food Items Detected</h3>
          ${generateFoodComparison(result.aiResult, result.groundTruth)}
        </div>

        <div class="detailed-section">
          <h3>📊 Nutrition Breakdown</h3>
          ${generateNutritionComparison(result.aiResult, result.groundTruth)}
        </div>

        ${result.errors && result.errors.length > 0 ? `
          <div class="error-section">
            <h3>⚠️ Errors</h3>
            <ul>
              ${result.errors.map(err => `<li>${err}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function generateSummarySection(aggregated: AggregatedMetrics): string {
  return `
    <div class="summary-section">
      <h2>📈 Overall Performance Summary</h2>
      <p class="summary-subtitle">
        Evaluated ${aggregated.totalItems} meals with average AI confidence of ${formatPercentage(aggregated.averageConfidence)}
      </p>

      <div class="summary-grid">
        ${generateMetricCard('Overall Score', aggregated.overallScore, 'Weighted average across all metrics')}
        ${generateMetricCard('Food Detection (F1)', aggregated.f1Score, `Precision: ${formatPercentage(aggregated.precision)}, Recall: ${formatPercentage(aggregated.recall)}`)}
        ${generateMetricCard('Quantity Accuracy', aggregated.quantityAccuracy, `Avg Error: ${formatPercentage(aggregated.avgQuantityError)}`)}
        ${generateMetricCard('Calorie Accuracy', aggregated.calorieAccuracy)}
        ${generateMetricCard('Protein Accuracy', aggregated.proteinAccuracy)}
        ${generateMetricCard('Carbs Accuracy', aggregated.carbsAccuracy)}
        ${generateMetricCard('Fat Accuracy', aggregated.fatAccuracy)}
        ${generateMetricCard('Detection Accuracy', aggregated.foodDetectionAccuracy, '% of actual foods found')}
      </div>
    </div>
  `;
}

function generateHTML(
  results: EvaluationResult[],
  aggregated: AggregatedMetrics,
  runInfo: { modelVersion: string; timestamp: Date }
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nutrition AI Evaluation Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: #1f2937;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .header-info {
      color: #6b7280;
      margin-top: 1rem;
    }

    .summary-section {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .summary-section h2 {
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }

    .summary-subtitle {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .summary-grid, .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .metric-card {
      background: #f9fafb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      border: 2px solid #e5e7eb;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .metric-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    .metric-subtitle {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 0.75rem;
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.75rem;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .result-card {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .result-header h2 {
      font-size: 1.75rem;
    }

    .overall-score {
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      color: white;
      font-weight: bold;
      font-size: 1.1rem;
    }

    .result-content {
      display: grid;
      gap: 2rem;
    }

    .image-section {
      text-align: center;
    }

    .meal-image {
      max-width: 100%;
      height: auto;
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 1rem;
    }

    .ai-notes {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: left;
      margin-top: 1rem;
    }

    .detailed-section {
      margin-top: 1.5rem;
    }

    .detailed-section h3 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #374151;
    }

    .food-comparison {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .comparison-column h3 {
      font-size: 1.1rem;
      margin-bottom: 0.75rem;
    }

    .food-list {
      list-style: none;
      background: #f9fafb;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .food-list li {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .food-list li:last-child {
      border-bottom: none;
    }

    .food-name {
      font-weight: 600;
      flex: 1;
    }

    .food-quantity {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .food-confidence {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .nutrition-table {
      width: 100%;
      border-collapse: collapse;
      background: #f9fafb;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .nutrition-table th {
      background: #374151;
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
    }

    .nutrition-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .nutrition-table tr:last-child td {
      border-bottom: none;
    }

    .diff-over {
      color: #dc2626;
    }

    .diff-under {
      color: #2563eb;
    }

    .error-section {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1.5rem;
    }

    .error-section h3 {
      color: #dc2626;
      margin-bottom: 0.5rem;
    }

    .error-section ul {
      margin-left: 1.5rem;
      color: #991b1b;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .result-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍽️ Nutrition AI Evaluation Report</h1>
      <div class="header-info">
        <p><strong>Model:</strong> ${runInfo.modelVersion}</p>
        <p><strong>Generated:</strong> ${new Date(runInfo.timestamp).toLocaleString()}</p>
      </div>
    </div>

    ${generateSummarySection(aggregated)}

    <h2 style="color: white; margin: 2rem 0 1rem; font-size: 1.8rem;">📸 Individual Meal Evaluations</h2>

    ${results.map((result, index) => generateResultCard(result, index)).join('\n')}
  </div>
</body>
</html>
  `;
}

async function main() {
  try {
    console.log('📊 Generating evaluation report...\n');

    // Fetch the latest (or specified) evaluation run
    let evaluationRun;

    if (runId) {
      evaluationRun = await prisma.evaluationRun.findUnique({
        where: { id: runId },
      });

      if (!evaluationRun) {
        console.error(`❌ Evaluation run not found: ${runId}`);
        process.exit(1);
      }
    } else {
      evaluationRun = await prisma.evaluationRun.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      if (!evaluationRun) {
        console.error('❌ No evaluation runs found. Please run an evaluation first.');
        process.exit(1);
      }
    }

    console.log(`✅ Found evaluation run: ${evaluationRun.id}`);
    console.log(`   Model: ${evaluationRun.modelVersion}`);
    console.log(`   Timestamp: ${evaluationRun.timestamp.toLocaleString()}\n`);

    // Parse the results
    const metrics = JSON.parse(evaluationRun.metrics);
    const results: EvaluationResult[] = JSON.parse(evaluationRun.results);

    console.log(`📈 Aggregated metrics:`);
    console.log(`   Overall Score: ${formatPercentage(metrics.overallScore)}`);
    console.log(`   F1 Score: ${formatPercentage(metrics.f1Score)}`);
    console.log(`   Calorie Accuracy: ${formatPercentage(metrics.calorieAccuracy)}`);
    console.log(`   Total Items: ${metrics.totalItems}\n`);

    // Generate HTML
    const html = generateHTML(
      results,
      metrics,
      {
        modelVersion: evaluationRun.modelVersion,
        timestamp: evaluationRun.timestamp,
      }
    );

    // Save to file
    const outputDir = path.join(process.cwd(), 'benchmark', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputPath = path.join(outputDir, `evaluation-report-${timestamp}.html`);

    fs.writeFileSync(outputPath, html);

    console.log(`✅ Report generated successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Open the report in your browser: file://${outputPath}`);
    console.log(`   2. Or serve it locally: npx serve benchmark/reports\n`);

  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
