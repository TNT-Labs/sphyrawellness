import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import logger from '../utils/logger.js';
import { sendConsentNotificationEmail } from '../services/consentEmailService.js';
import type { ApiResponse, Customer, CustomerConsents, ConsentHistoryEntry } from '../types/index.js';

const router = Router();

// Zod schema for consent update validation
const consentUpdateSchema = z.object({
  consents: z.object({
    emailReminderConsent: z.boolean().optional(),
    emailReminderConsentDate: z.string().optional(),
    smsReminderConsent: z.boolean().optional(),
    smsReminderConsentDate: z.string().optional(),
    healthDataConsent: z.boolean().optional(),
    healthDataConsentDate: z.string().optional(),
    marketingConsent: z.boolean().optional(),
    marketingConsentDate: z.string().optional(),
    consentHistory: z.array(z.object({
      type: z.enum(['privacy', 'emailReminder', 'smsReminder', 'healthData', 'marketing']),
      action: z.enum(['granted', 'revoked', 'updated']),
      timestamp: z.string(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })).optional(),
  }),
});

/**
 * PUT /api/customers/:customerId/consents
 * Update customer consents and send email notifications for newly granted consents
 */
router.put('/:customerId/consents', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Validate request body
    const validationResult = consentUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      logger.warn(`Invalid consent update request: ${validationResult.error.message}`);
      const response: ApiResponse = {
        success: false,
        error: 'Invalid consent data: ' + validationResult.error.errors.map(e => e.message).join(', '),
      };
      return res.status(400).json(response);
    }

    const { consents } = validationResult.data;

    // Fetch customer from database
    let customer: Customer;
    try {
      customer = await db.customers.get(customerId);
    } catch (error) {
      logger.error(`Customer not found: ${customerId}`);
      const response: ApiResponse = {
        success: false,
        error: 'Customer not found',
      };
      return res.status(404).json(response);
    }

    // Track which consents were newly granted (changed from false to true)
    const newlyGrantedConsents: Array<{
      type: 'emailReminder' | 'smsReminder' | 'healthData' | 'marketing';
      label: string;
    }> = [];

    const currentConsents = customer.consents || {} as CustomerConsents;

    // Check for newly granted consents
    if (consents.emailReminderConsent && !currentConsents.emailReminderConsent) {
      newlyGrantedConsents.push({ type: 'emailReminder', label: 'Promemoria via Email' });
    }
    if (consents.smsReminderConsent && !currentConsents.smsReminderConsent) {
      newlyGrantedConsents.push({ type: 'smsReminder', label: 'Promemoria via SMS' });
    }
    if (consents.healthDataConsent && !currentConsents.healthDataConsent) {
      newlyGrantedConsents.push({ type: 'healthData', label: 'Trattamento Dati Sanitari' });
    }
    if (consents.marketingConsent && !currentConsents.marketingConsent) {
      newlyGrantedConsents.push({ type: 'marketing', label: 'Comunicazioni Marketing' });
    }

    // Merge consents
    const updatedConsents: CustomerConsents = {
      ...currentConsents,
      ...consents,
    };

    // Update customer in database
    const updatedCustomer: Customer = {
      ...customer,
      consents: updatedConsents,
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.customers.put(updatedCustomer);
      logger.info(`✅ Customer consents updated successfully: ${customerId}`);
    } catch (error: any) {
      logger.error(`Failed to update customer consents in database:`, error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update customer consents in database',
      };
      return res.status(500).json(response);
    }

    // Send email notification for newly granted consents
    if (newlyGrantedConsents.length > 0) {
      try {
        await sendConsentNotificationEmail(
          customer.email,
          customer.firstName,
          customer.lastName,
          newlyGrantedConsents,
          updatedConsents.privacyConsentVersion || '1.0'
        );
        logger.info(`📧 Consent notification email sent to ${customer.email}`);
      } catch (emailError: any) {
        // Log error but don't fail the request - consent update was successful
        logger.error(`Failed to send consent notification email to ${customer.email}:`, emailError);
        logger.error(`Email error details: ${emailError.message}`);
        // We continue - the consent was updated successfully even if email failed
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Consents updated successfully',
      data: {
        customerId,
        updatedConsents,
        emailSent: newlyGrantedConsents.length > 0,
        newlyGrantedConsents: newlyGrantedConsents.map(c => c.label),
      },
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error updating customer consents:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error',
    };
    res.status(500).json(response);
  }
});

export default router;
