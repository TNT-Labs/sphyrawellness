import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { isValidImage } from '../utils/fileValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
// Use path relative to compiled code location: /app/dist/middleware/
// ../../uploads resolves to /app/uploads (Docker volume mount)
const uploadsDir = path.join(__dirname, '../../uploads');
const servicesDir = path.join(uploadsDir, 'services');
const staffDir = path.join(uploadsDir, 'staff');

[uploadsDir, servicesDir, staffDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for services
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, servicesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// Configure storage for staff
const staffStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staffDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const imageFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'));
  }
};

// Multer upload middleware for services
export const uploadServiceImage = multer({
  storage: serviceStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
}).single('image');

// Multer upload middleware for staff
export const uploadStaffImage = multer({
  storage: staffStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
}).single('image');

// Helper function to delete old image file
export const deleteImageFile = (imageUrl: string) => {
  try {
    // Extract relative path from URL (e.g., /uploads/services/image.jpg -> uploads/services/image.jpg)
    const relativePath = imageUrl.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, relativePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};

/**
 * Middleware wrapper that validates file magic bytes after upload
 * Provides additional security beyond MIME type checking
 */
export const validateUploadedImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return next();
  }

  try {
    // Validate file using magic bytes
    const validation = await isValidImage(req.file.path, req.file.mimetype);

    if (!validation.valid) {
      // Delete the invalid file
      fs.unlinkSync(req.file.path);

      // Return error
      return res.status(400).json({
        success: false,
        error: validation.error || 'Invalid image file',
      });
    }

    // File is valid, log for audit
    console.log(`✅ Image validated: ${req.file.filename} (${validation.detectedType})`);

    next();
  } catch (error) {
    // If validation fails, delete the file
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Error validating uploaded image:', error);
    return res.status(500).json({
      success: false,
      error: 'Error validating uploaded file',
    });
  }
};
