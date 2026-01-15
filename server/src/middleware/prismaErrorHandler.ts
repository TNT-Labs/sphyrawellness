import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Prisma-specific error handling middleware
 */
export const prismaErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Unique constraint violation',
        field: error.meta?.target,
      });
      return;
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      res.status(400).json({
        error: 'Foreign key constraint violation',
        field: error.meta?.field_name,
      });
      return;
    }

    // Record not found
    if (error.code === 'P2025') {
      res.status(404).json({
        error: 'Record not found',
      });
      return;
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Validation error',
      message: error.message,
    });
    return;
  }

  // Pass to next error handler if not a Prisma error
  next(error);
};
