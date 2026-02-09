/**
 * Image validation utilities for meal photo uploads
 */

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface ValidationError {
  field: string;
  message: string;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: ValidationError[];
  file?: File;
}

/**
 * Validate image file for upload
 * Checks file type, size, and extension
 */
export function validateImageFile(file: File): ImageValidationResult {
  const errors: ValidationError[] = [];

  // Check if file exists
  if (!file) {
    return {
      valid: false,
      errors: [{ field: 'file', message: 'No file provided' }],
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    errors.push({
      field: 'size',
      message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    });
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push({
      field: 'type',
      message: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    });
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push({
      field: 'extension',
      message: `Invalid file extension: ${extension}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    });
  }

  // Check file name length
  if (file.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'File name is too long (maximum 255 characters)',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    file: errors.length === 0 ? file : undefined,
  };
}

/**
 * Validate base64 image string
 * Checks format and estimated size
 */
export function validateBase64Image(base64: string): ImageValidationResult {
  const errors: ValidationError[] = [];

  // Check if base64 string exists
  if (!base64) {
    return {
      valid: false,
      errors: [{ field: 'base64', message: 'No base64 string provided' }],
    };
  }

  // Check base64 format
  const base64Pattern = /^data:image\/(jpeg|jpg|png|webp);base64,/;
  if (!base64Pattern.test(base64)) {
    errors.push({
      field: 'format',
      message: 'Invalid base64 format. Must start with "data:image/{jpeg|png|webp};base64,"',
    });
  }

  // Estimate size (base64 is ~33% larger than original)
  const estimatedSize = (base64.length * 3) / 4;
  if (estimatedSize > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
    const estimatedSizeMB = (estimatedSize / 1024 / 1024).toFixed(2);
    errors.push({
      field: 'size',
      message: `Estimated image size (${estimatedSizeMB}MB) exceeds maximum (${maxSizeMB}MB)`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  return mimeMap[mimeType] || '.jpg';
}

/**
 * Convert File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Extract base64 data without data URL prefix
 */
export function extractBase64Data(dataUrl: string): string {
  const base64Pattern = /^data:image\/[a-z]+;base64,/;
  return dataUrl.replace(base64Pattern, '');
}
