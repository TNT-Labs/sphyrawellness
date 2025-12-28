import express from 'express';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadServiceImage, uploadStaffImage, deleteImageFile, validateUploadedImage } from '../middleware/upload.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';

const router = express.Router();

// All upload routes require authentication
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

export default router;
