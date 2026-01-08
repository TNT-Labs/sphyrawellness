import { Router } from 'express';
import { paymentRepository } from '../repositories/paymentRepository.js';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { logAuditEvent, AuditAction, AuditSeverity } from '../utils/auditLog.js';
import type { Payment } from '@prisma/client';

const router = Router();

/**
 * Serialize payment for JSON response
 * Converts Decimal fields to numbers
 */
function serializePayment(payment: Payment) {
  return {
    ...payment,
    amount: Number(payment.amount),
  };
}

/**
 * Serialize array of payments
 */
function serializePayments(payments: Payment[]) {
  return payments.map(serializePayment);
}

const createPaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'transfer', 'other']),
  date: z.string(),
  notes: z.string().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial();

const refundPaymentSchema = z.object({
  reason: z.string().min(1, 'Refund reason is required').max(500),
});

// GET /api/payments - Get all payments
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, appointmentId } = req.query;

    let payments;

    if (appointmentId) {
      payments = await paymentRepository.findByAppointment(appointmentId as string);
    } else if (startDate && endDate) {
      payments = await paymentRepository.findByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      payments = await paymentRepository.findAll();
    }

    res.json(serializePayments(payments));
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:id - Get payment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentRepository.findById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(serializePayment(payment));
  } catch (error) {
    next(error);
  }
});

// POST /api/payments - Create new payment
router.post('/', async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);

    const payment = await paymentRepository.create({
      appointment: { connect: { id: data.appointmentId } },
      amount: data.amount,
      method: data.method,
      date: new Date(data.date),
      notes: data.notes,
    });

    res.status(201).json(serializePayment(payment));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updatePaymentSchema.parse(req.body);

    const existing = await paymentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = await paymentRepository.update(id, {
      ...(data.appointmentId && { appointment: { connect: { id: data.appointmentId } } }),
      amount: data.amount,
      method: data.method,
      ...(data.date && { date: new Date(data.date) }),
      notes: data.notes,
    });

    res.json(serializePayment(payment));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// POST /api/payments/:id/refund - Refund/Storno payment
router.post('/:id/refund', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = refundPaymentSchema.parse(req.body);

    // Get existing payment
    const existing = await paymentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if already refunded
    if (existing.status === 'refunded') {
      return res.status(400).json({
        error: 'Payment already refunded',
        refundedAt: existing.refundedAt,
        refundReason: existing.refundReason,
      });
    }

    // Get user ID from auth token
    const userId = req.user?.id;

    // Update payment status to refunded
    const payment = await paymentRepository.update(id, {
      status: 'refunded',
      refundedAt: new Date(),
      refundReason: reason,
      refundedBy: userId,
    });

    // Log audit event
    logAuditEvent(AuditAction.PAYMENT_DELETED, req, {
      userId,
      resource: 'payment',
      resourceId: id,
      severity: AuditSeverity.WARNING,
      details: {
        amount: existing.amount.toString(),
        method: existing.method,
        appointmentId: existing.appointmentId,
        reason,
        action: 'refund',
      },
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      payment: serializePayment(payment),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/payments/:id - Delete payment (hard delete - use with caution, RESPONSABILE only)
router.delete('/:id', requireRole('RESPONSABILE'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existing = await paymentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Prevent deletion of paid payments - they should be refunded instead
    if (existing.status === 'paid') {
      return res.status(400).json({
        error: 'Cannot delete a paid payment. Use refund endpoint instead.',
        hint: 'POST /api/payments/:id/refund',
      });
    }

    await paymentRepository.delete(id);

    // Log audit event
    const userId = req.user?.id;
    logAuditEvent(AuditAction.PAYMENT_DELETED, req, {
      userId,
      resource: 'payment',
      resourceId: id,
      severity: AuditSeverity.WARNING,
      details: {
        amount: existing.amount.toString(),
        method: existing.method,
        status: existing.status,
        action: 'hard_delete',
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/stats/revenue - Get revenue statistics
router.get('/stats/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const [total, byMethod] = await Promise.all([
      paymentRepository.getTotalRevenue(start, end),
      paymentRepository.getRevenueByMethod(start, end),
    ]);

    res.json({
      total,
      byMethod: byMethod.map((item) => ({
        method: item.method,
        total: Number(item._sum.amount || 0),
        count: item._count.id,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
