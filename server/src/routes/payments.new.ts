import { Router } from 'express';
import { paymentRepository } from '../repositories/paymentRepository.js';
import { z } from 'zod';

const router = Router();

const createPaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'transfer', 'other']),
  date: z.string(),
  notes: z.string().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial();

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

    res.json(payments);
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

    res.json(payment);
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

    res.status(201).json(payment);
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

    res.json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await paymentRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await paymentRepository.delete(id);

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
