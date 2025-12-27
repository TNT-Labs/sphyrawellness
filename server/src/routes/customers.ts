import { Router } from 'express';
import { customerRepository } from '../repositories/customerRepository.js';
import { z } from 'zod';
import type { Customer } from '@prisma/client';

const router = Router();

/**
 * Transform Prisma Customer to include consents object for frontend compatibility
 * Frontend expects both direct fields (emailReminderConsent) and consents object
 */
function transformCustomerWithConsents(customer: Customer): any {
  const {
    privacyConsent,
    privacyConsentDate,
    privacyConsentVersion,
    emailReminderConsent,
    emailReminderConsentDate,
    smsReminderConsent,
    smsReminderConsentDate,
    healthDataConsent,
    healthDataConsentDate,
    marketingConsent,
    consentHistory,
    ...baseCustomer
  } = customer;

  // Only create consents object if at least one consent field has a value
  const hasConsents =
    privacyConsent ||
    emailReminderConsent ||
    smsReminderConsent ||
    healthDataConsent ||
    marketingConsent;

  return {
    ...baseCustomer,
    // Keep direct fields for backward compatibility
    emailReminderConsent,
    // Add consents object if any consent exists
    ...(hasConsents && {
      consents: {
        privacyConsent,
        privacyConsentDate: privacyConsentDate?.toISOString(),
        privacyConsentVersion: privacyConsentVersion || '1.0',
        emailReminderConsent,
        emailReminderConsentDate: emailReminderConsentDate?.toISOString(),
        smsReminderConsent,
        smsReminderConsentDate: smsReminderConsentDate?.toISOString(),
        healthDataConsent,
        healthDataConsentDate: healthDataConsentDate?.toISOString(),
        marketingConsent,
        marketingConsentDate: undefined, // Not in schema yet
        consentHistory: consentHistory ? JSON.parse(JSON.stringify(consentHistory)) : [],
      }
    })
  };
}

// Validation schemas
const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(20).optional(),
  dateOfBirth: z.string().nullish(),
  notes: z.string().nullish(),
  allergies: z.string().nullish(),

  // GDPR Consents
  privacyConsent: z.boolean(),
  privacyConsentVersion: z.string().optional(),
  emailReminderConsent: z.boolean().optional(),
  smsReminderConsent: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
});

const updateCustomerSchema = createCustomerSchema
  .partial()
  .passthrough(); // Allow extra fields (like consents) but ignore them

const updateConsentsSchema = z.object({
  privacyConsent: z.boolean().optional(),
  emailReminderConsent: z.boolean().optional(),
  smsReminderConsent: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
});

// GET /api/customers - Get all customers
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;

    let customers;
    if (search && typeof search === 'string') {
      customers = await customerRepository.search(search);
    } else {
      customers = await customerRepository.findAll();
    }

    // Transform customers to include consents object
    const transformedCustomers = customers.map(transformCustomerWithConsents);
    res.json(transformedCustomers);
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { include } = req.query;

    let customer;
    if (include === 'appointments') {
      customer = await customerRepository.findByIdWithAppointments(id);
    } else {
      customer = await customerRepository.findById(id);
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Transform customer to include consents object
    const transformedCustomer = transformCustomerWithConsents(customer);
    res.json(transformedCustomer);
  } catch (error) {
    next(error);
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res, next) => {
  try {
    const data = createCustomerSchema.parse(req.body);

    // Check if email or phone already exists
    if (data.email) {
      const existingByEmail = await customerRepository.findByEmail(data.email);
      if (existingByEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    if (data.phone) {
      const existingByPhone = await customerRepository.findByPhone(data.phone);
      if (existingByPhone) {
        return res.status(409).json({ error: 'Phone already exists' });
      }
    }

    const customer = await customerRepository.create({
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      privacyConsentDate: data.privacyConsent ? new Date() : undefined,
      privacyConsentVersion: data.privacyConsentVersion || '1.0',
      emailReminderConsentDate: data.emailReminderConsent ? new Date() : undefined,
      smsReminderConsentDate: data.smsReminderConsent ? new Date() : undefined,
      healthDataConsentDate: data.healthDataConsent ? new Date() : undefined,
    });

    // Transform customer to include consents object
    const transformedCustomer = transformCustomerWithConsents(customer);
    res.status(201).json(transformedCustomer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);

    // Check if customer exists
    const existing = await customerRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check email uniqueness
    if (data.email && data.email !== existing.email) {
      const existingByEmail = await customerRepository.findByEmail(data.email);
      if (existingByEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Check phone uniqueness
    if (data.phone && data.phone !== existing.phone) {
      const existingByPhone = await customerRepository.findByPhone(data.phone);
      if (existingByPhone) {
        return res.status(409).json({ error: 'Phone already exists' });
      }
    }

    // Prepare update data with consent dates
    // IMPORTANT: Set consent dates when consent is granted (GDPR compliance)
    const now = new Date();
    const updateData: any = {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    };

    // Update consent dates only when consent is being granted (true) and was previously false/undefined
    if (data.privacyConsent !== undefined && data.privacyConsent && !existing.privacyConsent) {
      updateData.privacyConsentDate = now;
      updateData.privacyConsentVersion = data.privacyConsentVersion || '1.0';
    }

    if (data.emailReminderConsent !== undefined && data.emailReminderConsent && !existing.emailReminderConsent) {
      updateData.emailReminderConsentDate = now;
    }

    if (data.smsReminderConsent !== undefined && data.smsReminderConsent && !existing.smsReminderConsent) {
      updateData.smsReminderConsentDate = now;
    }

    if (data.healthDataConsent !== undefined && data.healthDataConsent && !existing.healthDataConsent) {
      updateData.healthDataConsentDate = now;
    }

    const customer = await customerRepository.update(id, updateData);

    // Transform customer to include consents object
    const transformedCustomer = transformCustomerWithConsents(customer);
    res.json(transformedCustomer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PATCH /api/customers/:id/consents - Update customer consents
router.patch('/:id/consents', async (req, res, next) => {
  try {
    const { id } = req.params;
    const consents = updateConsentsSchema.parse(req.body);

    // Check if customer exists
    const existing = await customerRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await customerRepository.updateConsents(id, consents);

    // Transform customer to include consents object
    const transformedCustomer = transformCustomerWithConsents(customer);
    res.json(transformedCustomer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existing = await customerRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer can be deleted
    const canDelete = await customerRepository.canDelete(id);
    if (!canDelete) {
      return res.status(409).json({
        error: 'Cannot delete customer with future appointments',
      });
    }

    await customerRepository.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
