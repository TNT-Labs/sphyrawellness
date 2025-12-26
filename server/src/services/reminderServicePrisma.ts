import { v4 as uuidv4 } from 'uuid';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import emailService from './emailService.js';
import smsService from './smsService.js';
import calendarService from './calendarService.js';
import { getErrorMessage } from '../utils/response.js';
import type { Appointment, Customer, Service, Staff, Reminder, AppointmentStatus } from '@prisma/client';

const SALT_ROUNDS = 12; // bcrypt salt rounds
const TOKEN_EXPIRY_HOURS = 48; // Token valid for 48 hours

// Types for email and SMS data
interface ReminderEmailData {
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  icsContent: string;
  confirmationLink: string;
}

interface ReminderSMSData {
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  staffName: string;
  confirmationLink: string;
}

type AppointmentWithRelations = Appointment & {
  customer: Customer;
  service: Service;
  staff: Staff;
};

export class ReminderServicePrisma {
  /**
   * Get appointments that need reminders (scheduled for N days from now)
   */
  async getAppointmentsNeedingReminders(): Promise<AppointmentWithRelations[]> {
    try {
      // Get settings to determine how many days before to send reminders
      let daysBefore = 1; // Default
      try {
        const settings = await prisma.setting.findUnique({
          where: { key: 'reminderDaysBefore' }
        });
        if (settings && typeof settings.value === 'number') {
          daysBefore = settings.value;
        }
      } catch (error) {
        console.log('⚠️ Could not load reminder settings, using default (1 day before)');
      }

      const targetDate = addDays(new Date(), daysBefore);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      console.log(`📅 Looking for appointments on ${targetDateStr} (${daysBefore} days from now)`);

      const appointments = await prisma.appointment.findMany({
        where: {
          date: new Date(targetDateStr),
          status: {
            in: ['scheduled', 'confirmed'] as AppointmentStatus[]
          },
          reminderSent: false
        },
        include: {
          customer: true,
          service: true,
          staff: true
        }
      });

      return appointments as AppointmentWithRelations[];
    } catch (error) {
      console.error('❌ Error fetching appointments needing reminders:', error);
      throw error;
    }
  }

  /**
   * Send reminder for a specific appointment
   * @param appointmentId - ID of the appointment
   * @param type - Type of reminder: 'email' or 'sms'
   */
  async sendReminderForAppointment(
    appointmentId: string,
    type: 'email' | 'sms' = 'email'
  ): Promise<{
    success: boolean;
    reminderId?: string;
    error?: string;
  }> {
    try {
      // 1. Get appointment with all relations
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: true,
          service: true,
          staff: true
        }
      });

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      const { customer, service, staff } = appointment;

      // GDPR COMPLIANCE & VALIDATION: Check based on reminder type
      if (type === 'email') {
        if (!customer.email) {
          console.error(`Customer ${customer.id} has no email address`);
          return { success: false, error: `Customer email not found (${customer.firstName} ${customer.lastName})` };
        }

        if (!customer.emailReminderConsent) {
          console.warn(`⚠️ Customer ${customer.firstName} ${customer.lastName} (${customer.email}) has not consented to email reminders - skipping`);
          return {
            success: false,
            error: `Customer has not consented to email reminders (GDPR)`
          };
        }

        console.log(`✓ Related data fetched: Customer=${customer.email}, Service=${service.name}, Staff=${staff.firstName} ${staff.lastName}`);
      } else if (type === 'sms') {
        if (!customer.phone) {
          console.error(`Customer ${customer.id} has no phone number`);
          return { success: false, error: `Customer phone not found (${customer.firstName} ${customer.lastName})` };
        }

        if (!customer.smsReminderConsent) {
          console.warn(`⚠️ Customer ${customer.firstName} ${customer.lastName} (${customer.phone}) has not consented to SMS reminders - skipping`);
          return {
            success: false,
            error: `Customer has not consented to SMS reminders (GDPR)`
          };
        }

        console.log(`✓ Related data fetched: Customer=${customer.phone}, Service=${service.name}, Staff=${staff.firstName} ${staff.lastName}`);
      }

      // 2. Generate confirmation token if not exists or if expired
      let confirmationToken = '';
      const needsNewToken = !appointment.confirmationTokenHash ||
        !appointment.tokenExpiresAt ||
        new Date() > appointment.tokenExpiresAt;

      if (needsNewToken) {
        // Generate a longer, more secure token (32 bytes = 256 bits)
        confirmationToken = uuidv4() + uuidv4(); // 2 UUIDs concatenated

        // Hash the token before storing
        const confirmationTokenHash = await bcrypt.hash(confirmationToken, SALT_ROUNDS);

        // Calculate expiration time (48 hours from now)
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

        // Update appointment with hashed token
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            confirmationTokenHash,
            tokenExpiresAt
          }
        });
      } else {
        // Token exists but we can't retrieve the plain text (only hash is stored)
        // This should not happen in normal flow, but if it does, generate new token
        confirmationToken = uuidv4() + uuidv4();
        const confirmationTokenHash = await bcrypt.hash(confirmationToken, SALT_ROUNDS);
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            confirmationTokenHash,
            tokenExpiresAt
          }
        });
      }

      // 3. Prepare reminder data (common for both email and SMS)
      const appointmentDateStr = format(appointment.date, 'yyyy-MM-dd');
      const commonData = {
        customerName: `${customer.firstName} ${customer.lastName}`,
        appointmentDate: format(new Date(appointmentDateStr), 'EEEE d MMMM yyyy', { locale: it }),
        appointmentTime: format(appointment.startTime, 'HH:mm'),
        serviceName: service.name,
        staffName: `${staff.firstName} ${staff.lastName}`
      };

      // 4. Generate confirmation link
      const confirmationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-appointment/${appointmentId}/${confirmationToken}`;

      // 5. Send reminder based on type
      let sendResult: { success: boolean; messageId?: string; error?: string };

      if (type === 'email') {
        // Generate .ics file content for calendar attachment (email only)
        const icsContent = calendarService.generateICS({
          appointment,
          customer,
          service,
          staff
        });

        const emailData: ReminderEmailData = {
          ...commonData,
          icsContent,
          confirmationLink
        };

        console.log(`Sending reminder email to ${customer.email} for appointment on ${commonData.appointmentDate}...`);
        sendResult = await emailService.sendReminderEmail(customer.email!, emailData);
      } else if (type === 'sms') {
        // Prepare SMS data with confirmation link
        const smsData: ReminderSMSData = {
          ...commonData,
          confirmationLink
        };

        console.log(`Sending reminder SMS to ${customer.phone} for appointment on ${commonData.appointmentDate}...`);
        sendResult = await smsService.sendReminderSMS(customer.phone!, smsData);
      } else {
        return {
          success: false,
          error: `Unsupported reminder type: ${type}`
        };
      }

      // 6. Handle send failure
      if (!sendResult.success) {
        const recipient = type === 'email' ? customer.email : customer.phone;
        console.error(`Failed to send reminder ${type} to ${recipient}:`, sendResult.error);

        // Create failed reminder record
        const failedReminder = await prisma.reminder.create({
          data: {
            appointmentId,
            type,
            scheduledFor: new Date(),
            sent: false,
            errorMessage: sendResult.error
          }
        });

        return {
          success: false,
          reminderId: failedReminder.id,
          error: sendResult.error
        };
      }

      // 7. Create successful reminder record
      const reminder = await prisma.reminder.create({
        data: {
          appointmentId,
          type,
          scheduledFor: new Date(),
          sent: true,
          sentAt: new Date()
        }
      });

      // 8. Update appointment reminderSent flag
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          reminderSent: true
        }
      });

      console.log(`✅ Reminder ${type} sent for appointment ${appointmentId}`);

      return {
        success: true,
        reminderId: reminder.id
      };
    } catch (error) {
      console.error('❌ Error sending reminder for appointment:', appointmentId, error);

      const errorMessage = getErrorMessage(error);
      console.error('Final error:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send reminders for all appointments needing them
   * OPTIMIZED: Uses Prisma's include to eagerly load related data
   */
  async sendAllDueReminders(): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ appointmentId: string; success: boolean; error?: string }>;
  }> {
    try {
      const appointments = await this.getAppointmentsNeedingReminders();

      console.log(`📧 Found ${appointments.length} appointments needing reminders`);

      if (appointments.length === 0) {
        return { total: 0, sent: 0, failed: 0, results: [] };
      }

      const results = [];
      let sent = 0;
      let failed = 0;

      // Process reminders sequentially to avoid overwhelming email service
      for (const appointment of appointments) {
        const result = await this.sendReminderForAppointment(appointment.id);

        results.push({
          appointmentId: appointment.id,
          success: result.success,
          error: result.error
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }

      console.log(`✅ Reminders sent: ${sent} successful, ${failed} failed`);

      return {
        total: appointments.length,
        sent,
        failed,
        results
      };
    } catch (error) {
      console.error('❌ Error sending due reminders:', error);
      throw error;
    }
  }

  /**
   * Confirm appointment using token
   * Now uses hashed token comparison and checks expiration
   */
  async confirmAppointment(appointmentId: string, token: string): Promise<{
    success: boolean;
    appointment?: Appointment;
    message?: string;
    error?: string;
  }> {
    try {
      // Validate token format (should be 2 UUIDs)
      if (!token || token.length < 64) {
        return {
          success: false,
          error: 'Invalid confirmation token format'
        };
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      // Check if token hash exists
      if (!appointment.confirmationTokenHash) {
        return {
          success: false,
          error: 'No confirmation token found for this appointment'
        };
      }

      // Check token expiration
      if (appointment.tokenExpiresAt) {
        if (new Date() > appointment.tokenExpiresAt) {
          return {
            success: false,
            error: 'Confirmation token has expired. Please contact us.'
          };
        }
      }

      // Compare provided token with stored hash
      const isValidToken = await bcrypt.compare(token, appointment.confirmationTokenHash);

      if (!isValidToken) {
        return {
          success: false,
          error: 'Invalid confirmation token. Please check the link.'
        };
      }

      // Check if already confirmed
      if (appointment.status === 'confirmed') {
        return {
          success: true,
          appointment,
          message: 'Appointment already confirmed'
        };
      }

      // Update appointment status to confirmed and invalidate token (one-time use)
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'confirmed',
          confirmationTokenHash: null,
          tokenExpiresAt: null,
          confirmedAt: new Date()
        }
      });

      console.log(`✅ Appointment ${appointmentId} confirmed by customer`);

      return {
        success: true,
        appointment: updatedAppointment,
        message: 'Appointment confirmed successfully'
      };
    } catch (error) {
      console.error('❌ Error confirming appointment:', error);
      return {
        success: false,
        error: getErrorMessage(error)
      };
    }
  }
}

export default new ReminderServicePrisma();
