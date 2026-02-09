#!/usr/bin/env tsx

/**
 * Load benchmark dataset into the database
 * Usage: npx tsx scripts/load-benchmark.ts
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

async function loadBenchmark() {
  try {
    console.log('📊 Loading benchmark dataset...\n');

    // Read sample dataset
    const datasetPath = path.join(process.cwd(), 'benchmark', 'sample-dataset.json');
    const datasetContent = fs.readFileSync(datasetPath, 'utf-8');
    const dataset = JSON.parse(datasetContent);

    console.log(`Found ${dataset.length} benchmark items\n`);

    // Clear existing benchmark items
    const deleted = await prisma.benchmarkItem.deleteMany();
    console.log(`🗑️  Deleted ${deleted.count} existing benchmark items\n`);

    // Insert new items
    for (const item of dataset) {
      const created = await prisma.benchmarkItem.create({
        data: {
          imageUrl: item.imageUrl,
          groundTruth: JSON.stringify(item.groundTruth),
          metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        },
      });

      const metadata = item.metadata || {};
      console.log(`✅ Added: ${metadata.description || item.imageUrl}`);
      console.log(`   ID: ${created.id}`);
      console.log(`   Foods: ${item.groundTruth.foods.length}`);
      console.log(`   Total calories: ${item.groundTruth.totalCalories}\n`);
    }

    console.log(`\n🎉 Successfully loaded ${dataset.length} benchmark items!`);
    console.log('\n📝 Next steps:');
    console.log('   1. Run evaluation: curl -X POST http://localhost:3000/api/evaluation/run');
    console.log('   2. View results in the database or via API\n');
  } catch (error) {
    console.error('❌ Error loading benchmark:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

loadBenchmark();
