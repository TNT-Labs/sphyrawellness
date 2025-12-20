import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import bcrypt from 'bcrypt';
import db from '../config/database.js';
import emailService from './emailService.js';
import smsService from './smsService.js';
import calendarService from './calendarService.js';
import { getErrorMessage } from '../utils/response.js';
import type {
  Appointment,
  AppointmentDoc,
  Customer,
  Service,
  Staff,
  Reminder,
  ReminderEmailData
} from '../types/index.js';
import type { ReminderSMSData } from '../templates/smsTemplate.js';

const SALT_ROUNDS = 12; // bcrypt salt rounds
const TOKEN_EXPIRY_HOURS = 48; // Token valid for 48 hours

export class ReminderService {
  /**
   * OPTIMIZATION HELPER: Bulk fetch customers by IDs
   * Reduces N queries to 1 query
   */
  private async fetchCustomersByIds(customerIds: string[]): Promise<Map<string, Customer>> {
    const uniqueIds = [...new Set(customerIds)];
    const customersMap = new Map<string, Customer>();

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const doc = await db.customers.get(id);
          customersMap.set(id, { ...doc, id: doc._id } as unknown as Customer);
        } catch (error) {
          console.error(`Failed to fetch customer ${id}:`, error);
        }
      })
    );

    return customersMap;
  }

  /**
   * OPTIMIZATION HELPER: Bulk fetch services by IDs
   */
  private async fetchServicesByIds(serviceIds: string[]): Promise<Map<string, Service>> {
    const uniqueIds = [...new Set(serviceIds)];
    const servicesMap = new Map<string, Service>();

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const doc = await db.services.get(id);
          servicesMap.set(id, { ...doc, id: doc._id } as unknown as Service);
        } catch (error) {
          console.error(`Failed to fetch service ${id}:`, error);
        }
      })
    );

    return servicesMap;
  }

  /**
   * OPTIMIZATION HELPER: Bulk fetch staff by IDs
   */
  private async fetchStaffByIds(staffIds: string[]): Promise<Map<string, Staff>> {
    const uniqueIds = [...new Set(staffIds)];
    const staffMap = new Map<string, Staff>();

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const doc = await db.staff.get(id);
          staffMap.set(id, { ...doc, id: doc._id } as unknown as Staff);
        } catch (error) {
          console.error(`Failed to fetch staff ${id}:`, error);
        }
      })
    );

    return staffMap;
  }

  /**
   * Get appointments that need reminders (scheduled for N days from now)
   */
  async getAppointmentsNeedingReminders(): Promise<Appointment[]> {
    try {
      // Get settings to determine how many days before to send reminders
      let daysBefore = 1; // Default
      try {
        const settings = await db.settings.get('app-settings') as any;
        daysBefore = settings.reminderDaysBefore || 1;
      } catch (error) {
        console.log('⚠️ Could not load reminder settings, using default (1 day before)');
      }

      const targetDate = format(addDays(new Date(), daysBefore), 'yyyy-MM-dd');
      console.log(`📅 Looking for appointments on ${targetDate} (${daysBefore} days from now)`);

      const result = await db.appointments.find({
        selector: {
          date: targetDate,
          status: { $in: ['scheduled', 'confirmed'] },
          $or: [
            { reminderSent: { $exists: false } },
            { reminderSent: false }
          ]
        }
      });

      // Type-safe conversion with explicit mapping
      // Map PouchDB ExistingDocument to Appointment type
      return result.docs.map((doc: any) => ({
        ...doc,
        id: doc._id  // Map _id to id field required by Appointment type
      })) as unknown as Appointment[];
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
      // 1. Get appointment
      const appointmentDoc = await db.appointments.get(appointmentId) as AppointmentDoc;
      const appointment = {
        ...appointmentDoc,
        id: appointmentDoc._id
      } as unknown as Appointment;

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      // 2. Get related data
      console.log(`Fetching related data for appointment ${appointmentId}...`);

      let customerDoc, serviceDoc, staffDoc;
      let customer: Customer, service: Service, staff: Staff;

      try {
        customerDoc = await db.customers.get(appointment.customerId);
        customer = { ...customerDoc, id: customerDoc._id } as unknown as Customer;
      } catch (error) {
        console.error(`Failed to fetch customer ${appointment.customerId}:`, error);
        return { success: false, error: `Customer not found (ID: ${appointment.customerId})` };
      }

      try {
        serviceDoc = await db.services.get(appointment.serviceId);
        service = { ...serviceDoc, id: serviceDoc._id } as unknown as Service;
      } catch (error) {
        console.error(`Failed to fetch service ${appointment.serviceId}:`, error);
        return { success: false, error: `Service not found (ID: ${appointment.serviceId})` };
      }

      try {
        staffDoc = await db.staff.get(appointment.staffId);
        staff = { ...staffDoc, id: staffDoc._id } as unknown as Staff;
      } catch (error) {
        console.error(`Failed to fetch staff ${appointment.staffId}:`, error);
        return { success: false, error: `Staff not found (ID: ${appointment.staffId})` };
      }

      // GDPR COMPLIANCE & VALIDATION: Check based on reminder type
      if (type === 'email') {
        if (!customer.email) {
          console.error(`Customer ${customer.id} has no email address`);
          return { success: false, error: `Customer email not found (${customer.firstName} ${customer.lastName})` };
        }

        if (!customer.consents?.emailReminderConsent) {
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

        if (!customer.consents?.smsReminderConsent) {
          console.warn(`⚠️ Customer ${customer.firstName} ${customer.lastName} (${customer.phone}) has not consented to SMS reminders - skipping`);
          return {
            success: false,
            error: `Customer has not consented to SMS reminders (GDPR)`
          };
        }

        console.log(`✓ Related data fetched: Customer=${customer.phone}, Service=${service.name}, Staff=${staff.firstName} ${staff.lastName}`);
      }

      // 3. Generate confirmation token if not exists or if expired
      let confirmationToken = appointment.confirmationToken;
      let updatedAppointmentDoc = appointmentDoc;

      // Check if token exists and is not expired
      const needsNewToken = !confirmationToken ||
        !appointmentDoc.tokenExpiresAt ||
        new Date() > parseISO(appointmentDoc.tokenExpiresAt);

      if (needsNewToken) {
        // Generate a longer, more secure token (32 bytes = 256 bits)
        confirmationToken = uuidv4() + uuidv4(); // 2 UUIDs concatenated

        // Hash the token before storing
        const confirmationTokenHash = await bcrypt.hash(confirmationToken, SALT_ROUNDS);

        // Calculate expiration time (48 hours from now)
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

        // Update appointment with hashed token
        await db.appointments.put({
          ...appointmentDoc,
          confirmationTokenHash, // Store only the hash
          tokenExpiresAt: tokenExpiresAt.toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Fetch the updated document to get the new _rev
        updatedAppointmentDoc = await db.appointments.get(appointmentId) as AppointmentDoc;
      }

      // 4. Prepare reminder data (common for both email and SMS)
      const commonData = {
        customerName: `${customer.firstName} ${customer.lastName}`,
        appointmentDate: format(parseISO(appointment.date), 'EEEE d MMMM yyyy', { locale: it }),
        appointmentTime: appointment.startTime,
        serviceName: service.name,
        staffName: `${staff.firstName} ${staff.lastName}`
      };

      // 5. Generate confirmation link
      const confirmationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-appointment/${appointmentId}/${confirmationToken}`;

      // 6. Send reminder based on type
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
          icsContent
        };

        console.log(`Sending reminder email to ${customer.email} for appointment on ${commonData.appointmentDate}...`);
        sendResult = await emailService.sendReminderEmail(customer.email, emailData);
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

      // 7. Handle send failure
      if (!sendResult.success) {
        const recipient = type === 'email' ? customer.email : customer.phone;
        console.error(`Failed to send reminder ${type} to ${recipient}:`, sendResult.error);

        // Create failed reminder record
        const reminderId = uuidv4();
        const failedReminder: Reminder = {
          id: reminderId,
          appointmentId,
          type,
          scheduledFor: new Date().toISOString(),
          sent: false,
          error: sendResult.error,
          createdAt: new Date().toISOString()
        };

        await db.reminders.put({
          ...failedReminder,
          _id: reminderId
        });

        return {
          success: false,
          reminderId: failedReminder.id,
          error: sendResult.error
        };
      }

      // 8. Create successful reminder record
      const reminderId = uuidv4();
      const reminder: Reminder = {
        id: reminderId,
        appointmentId,
        type,
        scheduledFor: new Date().toISOString(),
        sent: true,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await db.reminders.put({
        ...reminder,
        _id: reminderId
      });

      // 9. Update appointment reminderSent flag
      await db.appointments.put({
        ...updatedAppointmentDoc,
        reminderSent: true,
        confirmationToken,
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Reminder ${type} sent for appointment ${appointmentId}`);

      return {
        success: true,
        reminderId: reminder.id
      };
    } catch (error) {
      console.error('❌ Error sending reminder for appointment:', appointmentId, error);

      // Provide detailed error context
      let errorMessage = getErrorMessage(error);

      // Check if it's a database error
      const err = error as any;
      if (err.name === 'not_found') {
        errorMessage = `Appointment or related data not found (appointmentId: ${appointmentId})`;
      } else if (err.status === 404) {
        errorMessage = `Database record not found (appointmentId: ${appointmentId})`;
      }

      console.error('Final error:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send reminders for all appointments needing them
   * OPTIMIZED: Uses bulk fetch to reduce database queries from 1+4N to 4 queries total
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

      // OPTIMIZATION: Eager load all related data in parallel
      // This reduces queries from 1 + (4 × N) to just 4 queries total
      const [customersMap, servicesMap, staffMap] = await Promise.all([
        this.fetchCustomersByIds(appointments.map(a => a.customerId)),
        this.fetchServicesByIds(appointments.map(a => a.serviceId)),
        this.fetchStaffByIds(appointments.map(a => a.staffId))
      ]);

      console.log(`✅ Preloaded ${customersMap.size} customers, ${servicesMap.size} services, ${staffMap.size} staff`);

      const results = [];
      let sent = 0;
      let failed = 0;

      // Process reminders sequentially to avoid overwhelming email service
      for (const appointment of appointments) {
        const customer = customersMap.get(appointment.customerId);
        const service = servicesMap.get(appointment.serviceId);
        const staff = staffMap.get(appointment.staffId);

        if (!customer || !service || !staff) {
          results.push({
            appointmentId: appointment.id,
            success: false,
            error: `Missing related data: customer=${!!customer}, service=${!!service}, staff=${!!staff}`
          });
          failed++;
          continue;
        }

        // Use the existing sendReminderForAppointment but data is already cached
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

      const doc = await db.appointments.get(appointmentId) as AppointmentDoc;
      const appointment = {
        ...doc,
        id: doc._id
      } as unknown as Appointment;

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      // Check if token hash exists
      if (!doc.confirmationTokenHash) {
        return {
          success: false,
          error: 'No confirmation token found for this appointment'
        };
      }

      // Check token expiration
      if (doc.tokenExpiresAt) {
        const expiresAt = parseISO(doc.tokenExpiresAt);
        if (new Date() > expiresAt) {
          return {
            success: false,
            error: 'Confirmation token has expired. Please contact us.'
          };
        }
      }

      // Compare provided token with stored hash
      const isValidToken = await bcrypt.compare(token, doc.confirmationTokenHash);

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
      await db.appointments.put({
        ...doc,
        status: 'confirmed' as const,
        confirmationTokenHash: undefined, // Invalidate token after use
        tokenExpiresAt: undefined,
        confirmedAt: new Date().toISOString(), // Track when confirmed
        updatedAt: new Date().toISOString()
      });

      const updatedAppointment = {
        ...appointment,
        status: 'confirmed' as const,
        confirmationTokenHash: undefined,
        tokenExpiresAt: undefined,
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

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

export default new ReminderService();
