import { NextResponse } from 'next/server';

/**
 * Standardized API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, meta?: ApiResponse['meta']) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  } satisfies ApiResponse<T>);
}

/**
 * Create an error API response
 */
export function errorResponse(error: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
    } satisfies ApiResponse,
    { status }
  );
}

/**
 * Handle API errors and return formatted response
 */
export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('An unknown error occurred', 500);
}
