import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { getExtensionFromMimeType } from './image-validator';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const MEALS_DIR = path.join(UPLOAD_DIR, 'meals');

/**
 * Ensure upload directories exist
 */
async function ensureUploadDirectories() {
  try {
    if (!existsSync(MEALS_DIR)) {
      await mkdir(MEALS_DIR, { recursive: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to create upload directories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate unique filename with random hash
 */
function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now();
  const randomHash = randomBytes(8).toString('hex');
  return `${timestamp}-${randomHash}${extension}`;
}

/**
 * Save uploaded image file to filesystem
 * Returns the public URL path to the saved image
 */
export async function saveMealImage(file: File): Promise<string> {
  try {
    await ensureUploadDirectories();

    // Get file extension from MIME type
    const extension = getExtensionFromMimeType(file.type);
    const filename = generateUniqueFilename(extension);
    const filePath = path.join(MEALS_DIR, filename);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return public URL (relative to /public)
    const publicUrl = `/uploads/meals/${filename}`;
    return publicUrl;
  } catch (error) {
    throw new Error(
      `Failed to save meal image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Save base64 image to filesystem
 * Returns the public URL path to the saved image
 */
export async function saveBase64Image(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  try {
    await ensureUploadDirectories();

    // Remove data URL prefix if present
    const base64Pattern = /^data:image\/[a-z]+;base64,/;
    const cleanBase64 = base64Data.replace(base64Pattern, '');

    // Get file extension
    const extension = getExtensionFromMimeType(mimeType);
    const filename = generateUniqueFilename(extension);
    const filePath = path.join(MEALS_DIR, filename);

    // Convert base64 to Buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/meals/${filename}`;
    return publicUrl;
  } catch (error) {
    throw new Error(
      `Failed to save base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get full filesystem path from public URL
 */
export function getFullPath(publicUrl: string): string {
  // Remove leading slash and /public prefix
  const relativePath = publicUrl.replace(/^\//, '');
  return path.join(process.cwd(), 'public', relativePath);
}

/**
 * Check if file exists at public URL
 */
export function fileExists(publicUrl: string): boolean {
  try {
    const fullPath = getFullPath(publicUrl);
    return existsSync(fullPath);
  } catch {
    return false;
  }
}

/**
 * Delete file at public URL
 */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const fullPath = getFullPath(publicUrl);
    if (existsSync(fullPath)) {
      const { unlink } = await import('fs/promises');
      await unlink(fullPath);
    }
  } catch (error) {
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
