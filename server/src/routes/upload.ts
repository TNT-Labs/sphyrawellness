import express from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadServiceImage, uploadStaffImage, uploadApk, deleteImageFile, deleteApkFile, validateUploadedImage } from '../middleware/upload.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';

const router = express.Router();

// All upload routes require authentication (JWT only, no CSRF)
// CSRF is not enforced for multipart/form-data uploads as it's complex to implement
// JWT authentication provides sufficient protection for file uploads
router.use(authenticateToken);

/**
 * POST /api/upload/service/:serviceId
 * Upload image for a service
 */
router.post('/service/:serviceId', (req, res, next) => {
  // Step 1: Upload file with multer
  uploadServiceImage(req, res, (err) => {
    if (err) {
      return sendError(res, err.message || 'Upload failed', 400);
    }

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Step 2: Validate file magic bytes
    validateUploadedImage(req, res, async () => {
      try {
        const { serviceId } = req.params;

        // Get the service from database
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        });

        if (!service) {
          // Delete uploaded file if service not found
          if (req.file) {
            deleteImageFile(`/uploads/services/${req.file.filename}`);
          }
          return sendError(res, 'Service not found', 404);
        }

        // Delete old image if exists
        if (service.imageUrl) {
          deleteImageFile(service.imageUrl);
        }

        // Update service with new image URL
        const imageUrl = `/uploads/services/${req.file!.filename}`;
        const updatedService = await prisma.service.update({
          where: { id: serviceId },
          data: {
            imageUrl
          }
        });

        sendSuccess(res, { service: updatedService, imageUrl }, 'Image uploaded successfully');
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          deleteImageFile(`/uploads/services/${req.file.filename}`);
        }
        handleRouteError(res, error, 'Failed to upload service image');
      }
    });
  });
});

/**
 * DELETE /api/upload/service/:serviceId
 * Delete image for a service
 */
router.delete('/service/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Get the service from database
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    // Delete image file if exists
    if (service.imageUrl) {
      deleteImageFile(service.imageUrl);

      // Update service to remove image URL
      const updatedService = await prisma.service.update({
        where: { id: serviceId },
        data: {
          imageUrl: null
        }
      });

      sendSuccess(res, { service: updatedService }, 'Image deleted successfully');
    } else {
      sendSuccess(res, { service }, 'No image to delete');
    }
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to delete service image');
  }
});

/**
 * POST /api/upload/staff/:staffId
 * Upload profile image for a staff member
 */
router.post('/staff/:staffId', (req, res, next) => {
  // Step 1: Upload file with multer
  uploadStaffImage(req, res, (err) => {
    if (err) {
      return sendError(res, err.message || 'Upload failed', 400);
    }

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Step 2: Validate file magic bytes
    validateUploadedImage(req, res, async () => {
      try {
        const { staffId } = req.params;

        // Get the staff from database
        const staff = await prisma.staff.findUnique({
          where: { id: staffId }
        });

        if (!staff) {
          // Delete uploaded file if staff not found
          if (req.file) {
            deleteImageFile(`/uploads/staff/${req.file.filename}`);
          }
          return sendError(res, 'Staff member not found', 404);
        }

        // Delete old image if exists
        if (staff.profileImageUrl) {
          deleteImageFile(staff.profileImageUrl);
        }

        // Update staff with new image URL
        const imageUrl = `/uploads/staff/${req.file!.filename}`;
        const updatedStaff = await prisma.staff.update({
          where: { id: staffId },
          data: {
            profileImageUrl: imageUrl
          }
        });

        sendSuccess(res, { staff: updatedStaff, imageUrl }, 'Profile image uploaded successfully');
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          deleteImageFile(`/uploads/staff/${req.file.filename}`);
        }
        handleRouteError(res, error, 'Failed to upload staff profile image');
      }
    });
  });
});

/**
 * DELETE /api/upload/staff/:staffId
 * Delete profile image for a staff member
 */
router.delete('/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;

    // Get the staff from database
    const staff = await prisma.staff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      return sendError(res, 'Staff member not found', 404);
    }

    // Delete image file if exists
    if (staff.profileImageUrl) {
      deleteImageFile(staff.profileImageUrl);

      // Update staff to remove image URL
      const updatedStaff = await prisma.staff.update({
        where: { id: staffId },
        data: {
          profileImageUrl: null
        }
      });

      sendSuccess(res, { staff: updatedStaff }, 'Profile image deleted successfully');
    } else {
      sendSuccess(res, { staff }, 'No image to delete');
    }
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to delete staff profile image');
  }
});

// ============================================================================
// APK REPOSITORY ROUTES - Only for RESPONSABILE role
// ============================================================================

/**
 * POST /api/upload/apk
 * Upload APK file (RESPONSABILE only)
 */
router.post('/apk', requireRole('RESPONSABILE'), (req, res) => {
  uploadApk(req, res, async (err) => {
    if (err) {
      return sendError(res, err.message || 'Upload failed', 400);
    }

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    try {
      const userId = (req as any).user?.id;
      const filePath = `/uploads/apk/${req.file.filename}`;
      const fileSize = req.file.size;
      const fileName = req.file.originalname;

      // Delete old APK files and database records
      const oldApks = await prisma.apkFile.findMany();
      for (const oldApk of oldApks) {
        deleteApkFile(oldApk.filePath);
        await prisma.apkFile.delete({ where: { id: oldApk.id } });
      }

      // Save new APK metadata to database
      const apkFile = await prisma.apkFile.create({
        data: {
          fileName,
          filePath,
          fileSize: BigInt(fileSize),
          uploadedBy: userId || 'unknown',
          version: null, // Can be extracted from APK if needed
        }
      });

      // Convert BigInt to string for JSON serialization
      const apkFileResponse = {
        ...apkFile,
        fileSize: apkFile.fileSize.toString(),
      };

      sendSuccess(res, { apk: apkFileResponse }, 'APK uploaded successfully');
    } catch (error: any) {
      // Clean up uploaded file on error
      if (req.file) {
        deleteApkFile(`/uploads/apk/${req.file.filename}`);
      }
      handleRouteError(res, error, 'Failed to upload APK');
    }
  });
});

/**
 * GET /api/upload/apk/info
 * Get current APK info (authenticated users only)
 */
router.get('/apk/info', async (req, res) => {
  try {
    // Get the most recent APK from database
    const apk = await prisma.apkFile.findFirst({
      orderBy: { uploadedAt: 'desc' }
    });

    if (!apk) {
      return sendSuccess(res, { apk: null }, 'No APK available');
    }

    // Convert BigInt to string for JSON serialization
    const apkResponse = {
      ...apk,
      fileSize: apk.fileSize.toString(),
    };

    sendSuccess(res, { apk: apkResponse }, 'APK info retrieved successfully');
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to get APK info');
  }
});

/**
 * GET /api/upload/apk/download
 * Download current APK file (authenticated users only)
 */
router.get('/apk/download', async (req, res) => {
  try {
    // Get the most recent APK from database
    const apk = await prisma.apkFile.findFirst({
      orderBy: { uploadedAt: 'desc' }
    });

    if (!apk) {
      return sendError(res, 'No APK available for download', 404);
    }

    // Construct full file path
    const relativePath = apk.filePath.replace('/uploads/', '');
    const uploadsDir = path.join(path.dirname(new URL(import.meta.url).pathname), '../../uploads');
    const filePath = path.join(uploadsDir, relativePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'APK file not found on server', 404);
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${apk.fileName}"`);
    res.setHeader('Content-Length', apk.fileSize.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to download APK');
  }
});

/**
 * DELETE /api/upload/apk
 * Delete APK file (RESPONSABILE only)
 */
router.delete('/apk', requireRole('RESPONSABILE'), async (req, res) => {
  try {
    // Get all APK files from database
    const apks = await prisma.apkFile.findMany();

    if (apks.length === 0) {
      return sendSuccess(res, {}, 'No APK to delete');
    }

    // Delete all APK files and records
    for (const apk of apks) {
      deleteApkFile(apk.filePath);
      await prisma.apkFile.delete({ where: { id: apk.id } });
    }

    sendSuccess(res, {}, 'APK deleted successfully');
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to delete APK');
  }
});

export default router;
