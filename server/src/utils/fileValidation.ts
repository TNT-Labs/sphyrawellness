/**
 * File Validation Utilities
 * Validates file types by checking magic bytes (file signatures)
 * to prevent MIME type spoofing attacks
 */

import fs from 'fs';

/**
 * Magic bytes signatures for common image formats
 * First bytes of the file that identify the file type
 */
const IMAGE_SIGNATURES = {
  // JPEG files start with FF D8 FF
  jpeg: [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG with ICC color profile
    [0xFF, 0xD8, 0xFF, 0xE8], // JPEG with SPIFF
    [0xFF, 0xD8, 0xFF, 0xDB], // JPEG raw
  ],
  // PNG files start with 89 50 4E 47 0D 0A 1A 0A
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  // GIF files start with 47 49 46 38
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP files start with RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  webp: [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  ],
};

/**
 * Read the first bytes of a file to check its signature
 */
function readFileSignature(filePath: string, bytesToRead: number = 12): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: bytesToRead - 1 });
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Check if file signature matches expected signature
 * null in signature means "any byte" (wildcard)
 */
function matchesSignature(fileBytes: Buffer, signature: (number | null)[]): boolean {
  if (fileBytes.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    // null means wildcard - accept any byte
    if (signature[i] === null) {
      continue;
    }

    if (fileBytes[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validate image file by checking magic bytes
 * Returns the detected file type or null if invalid
 */
export async function validateImageFile(filePath: string): Promise<string | null> {
  try {
    // Read first 12 bytes (enough for all our signatures)
    const fileBytes = await readFileSignature(filePath, 12);

    // Check against all known image signatures
    for (const [fileType, signatures] of Object.entries(IMAGE_SIGNATURES)) {
      for (const signature of signatures) {
        if (matchesSignature(fileBytes, signature)) {
          return fileType;
        }
      }
    }

    // No matching signature found
    return null;
  } catch (error) {
    console.error('Error validating file:', error);
    return null;
  }
}

/**
 * Validate that uploaded file is actually an image
 * Checks both MIME type and magic bytes
 */
export async function isValidImage(
  filePath: string,
  mimeType: string
): Promise<{ valid: boolean; error?: string; detectedType?: string }> {
  // Check MIME type first (fast check)
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid MIME type. Only JPEG, PNG, GIF and WebP images are allowed.',
    };
  }

  // Check magic bytes (security check)
  const detectedType = await validateImageFile(filePath);

  if (!detectedType) {
    return {
      valid: false,
      error: 'File signature does not match an image file. Possible MIME type spoofing detected.',
    };
  }

  // Verify MIME type matches detected type
  const mimeTypeMap: Record<string, string[]> = {
    jpeg: ['image/jpeg', 'image/jpg'],
    png: ['image/png'],
    gif: ['image/gif'],
    webp: ['image/webp'],
  };

  const expectedMimeTypes = mimeTypeMap[detectedType] || [];

  if (!expectedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type mismatch. File appears to be ${detectedType} but MIME type is ${mimeType}`,
      detectedType,
    };
  }

  return {
    valid: true,
    detectedType,
  };
}

/**
 * Get human-readable file type description
 */
export function getFileTypeDescription(fileType: string): string {
  const descriptions: Record<string, string> = {
    jpeg: 'JPEG Image',
    png: 'PNG Image',
    gif: 'GIF Image',
    webp: 'WebP Image',
  };

  return descriptions[fileType] || 'Unknown';
}
