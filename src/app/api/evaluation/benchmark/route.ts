import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import type { BenchmarkItem } from '@/types/evaluation';

/**
 * POST /api/evaluation/benchmark
 * Add a new benchmark item to the dataset
 *
 * Request body: BenchmarkItem
 */
export async function POST(request: NextRequest) {
  try {
    const body: BenchmarkItem = await request.json();

    const { imageUrl, groundTruth, metadata } = body;

    if (!imageUrl || !groundTruth) {
      return errorResponse('imageUrl and groundTruth are required', 400);
    }

    const benchmarkItem = await prisma.benchmarkItem.create({
      data: {
        imageUrl,
        groundTruth: JSON.stringify(groundTruth),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return successResponse({ id: benchmarkItem.id });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/evaluation/benchmark
 * Get all benchmark items
 */
export async function GET() {
  try {
    const items = await prisma.benchmarkItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const parsedItems = items.map((item: typeof items[number]) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      groundTruth: JSON.parse(item.groundTruth),
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
      createdAt: item.createdAt,
    }));

    return successResponse({ items: parsedItems });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/evaluation/benchmark
 * Delete a benchmark item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('id parameter is required', 400);
    }

    await prisma.benchmarkItem.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
