import express from 'express';
import path from 'path';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadServiceImage, uploadStaffImage, deleteImageFile } from '../middleware/upload.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import type { ApiResponse, Service, Staff } from '../types/index.js';

const router = express.Router();

// All upload routes require authentication
router.use(authenticateToken);

/**
 * POST /api/upload/service/:serviceId
 * Upload image for a service
 */
router.post('/service/:serviceId', (req, res) => {
  uploadServiceImage(req, res, async (err) => {
    try {
      if (err) {
        return sendError(res, err.message || 'Upload failed', 400);
      }

      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const { serviceId } = req.params;

      // Get the service from database
      const serviceDoc: any = await db.services.get(serviceId);

      // Delete old image if exists
      if (serviceDoc.imageUrl) {
        deleteImageFile(serviceDoc.imageUrl);
      }

      // Update service with new image URL
      const imageUrl = `/uploads/services/${req.file.filename}`;
      serviceDoc.imageUrl = imageUrl;
      serviceDoc.updatedAt = new Date().toISOString();

      // Save to database
      await db.services.put(serviceDoc);

      // Convert to API format (remove _id and _rev)
      const service: Service = {
        id: serviceDoc._id,
        name: serviceDoc.name,
        description: serviceDoc.description,
        duration: serviceDoc.duration,
        price: serviceDoc.price,
        category: serviceDoc.category,
        imageUrl: serviceDoc.imageUrl,
        createdAt: serviceDoc.createdAt,
        updatedAt: serviceDoc.updatedAt
      };

      sendSuccess(res, { service, imageUrl }, 'Image uploaded successfully');
    } catch (error: any) {
      handleRouteError(res, error, 'Failed to upload service image');
    }
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
    const serviceDoc: any = await db.services.get(serviceId);

    // Delete image file if exists
    if (serviceDoc.imageUrl) {
      deleteImageFile(serviceDoc.imageUrl);
      serviceDoc.imageUrl = undefined;
      serviceDoc.updatedAt = new Date().toISOString();

      // Save to database
      await db.services.put(serviceDoc);
    }

    // Convert to API format
    const service: Service = {
      id: serviceDoc._id,
      name: serviceDoc.name,
      description: serviceDoc.description,
      duration: serviceDoc.duration,
      price: serviceDoc.price,
      category: serviceDoc.category,
      imageUrl: serviceDoc.imageUrl,
      createdAt: serviceDoc.createdAt,
      updatedAt: serviceDoc.updatedAt
    };

    sendSuccess(res, { service }, 'Image deleted successfully');
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to delete service image');
  }
});

/**
 * POST /api/upload/staff/:staffId
 * Upload profile image for a staff member
 */
router.post('/staff/:staffId', (req, res) => {
  uploadStaffImage(req, res, async (err) => {
    try {
      if (err) {
        return sendError(res, err.message || 'Upload failed', 400);
      }

      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const { staffId } = req.params;

      // Get the staff from database
      const staffDoc: any = await db.staff.get(staffId);

      // Delete old image if exists
      if (staffDoc.profileImageUrl) {
        deleteImageFile(staffDoc.profileImageUrl);
      }

      // Update staff with new image URL
      const imageUrl = `/uploads/staff/${req.file.filename}`;
      staffDoc.profileImageUrl = imageUrl;
      staffDoc.updatedAt = new Date().toISOString();

      // Save to database
      await db.staff.put(staffDoc);

      // Convert to API format (remove _id and _rev)
      const staff: Staff = {
        id: staffDoc._id,
        firstName: staffDoc.firstName,
        lastName: staffDoc.lastName,
        email: staffDoc.email,
        phone: staffDoc.phone,
        role: staffDoc.role,
        specializations: staffDoc.specializations,
        color: staffDoc.color,
        isActive: staffDoc.isActive,
        profileImageUrl: staffDoc.profileImageUrl,
        createdAt: staffDoc.createdAt,
        updatedAt: staffDoc.updatedAt
      };

      sendSuccess(res, { staff, imageUrl }, 'Profile image uploaded successfully');
    } catch (error: any) {
      handleRouteError(res, error, 'Failed to upload staff profile image');
    }
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
    const staffDoc: any = await db.staff.get(staffId);

    // Delete image file if exists
    if (staffDoc.profileImageUrl) {
      deleteImageFile(staffDoc.profileImageUrl);
      staffDoc.profileImageUrl = undefined;
      staffDoc.updatedAt = new Date().toISOString();

      // Save to database
      await db.staff.put(staffDoc);
    }

    // Convert to API format
    const staff: Staff = {
      id: staffDoc._id,
      firstName: staffDoc.firstName,
      lastName: staffDoc.lastName,
      email: staffDoc.email,
      phone: staffDoc.phone,
      role: staffDoc.role,
      specializations: staffDoc.specializations,
      color: staffDoc.color,
      isActive: staffDoc.isActive,
      profileImageUrl: staffDoc.profileImageUrl,
      createdAt: staffDoc.createdAt,
      updatedAt: staffDoc.updatedAt
    };

    sendSuccess(res, { staff }, 'Profile image deleted successfully');
  } catch (error: any) {
    handleRouteError(res, error, 'Failed to delete staff profile image');
  }
});

export default router;
