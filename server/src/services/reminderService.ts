import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import db from '../config/database.js';
import emailService from './emailService.js';
import type {
  Appointment,
  Customer,
  Service,
  Staff,
  Reminder,
  ReminderEmailData
} from '../types/index.js';

export class ReminderService {
  /**
   * Get appointments that need reminders (scheduled for tomorrow)
   */
  async getAppointmentsNeedingReminders(): Promise<Appointment[]> {
    try {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      const result = await db.appointments.find({
        selector: {
          date: tomorrow,
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
   */
  async sendReminderForAppointment(appointmentId: string): Promise<{
    success: boolean;
    reminderId?: string;
    error?: string;
  }> {
    try {
      // 1. Get appointment
      const doc = await db.appointments.get(appointmentId);
      const appointment = {
        ...doc,
        id: doc._id
      } as unknown as Appointment;

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      // 2. Get related data
      const customerDoc = await db.customers.get(appointment.customerId);
      const customer = { ...customerDoc, id: customerDoc._id } as unknown as Customer;

      const serviceDoc = await db.services.get(appointment.serviceId);
      const service = { ...serviceDoc, id: serviceDoc._id } as unknown as Service;

      const staffDoc = await db.staff.get(appointment.staffId);
      const staff = { ...staffDoc, id: staffDoc._id } as unknown as Staff;

      if (!customer || !service || !staff) {
        return { success: false, error: 'Related data not found' };
      }

      if (!customer.email) {
        return { success: false, error: 'Customer email not found' };
      }

      // 3. Generate confirmation token if not exists
      let confirmationToken = appointment.confirmationToken;
      if (!confirmationToken) {
        confirmationToken = uuidv4();

        // Update appointment with token
        await db.appointments.put({
          ...appointment,
          confirmationToken,
          updatedAt: new Date().toISOString()
        });
      }

      // 4. Prepare email data
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const confirmationUrl = `${frontendUrl}/confirm-appointment/${appointmentId}/${confirmationToken}`;

      const emailData: ReminderEmailData = {
        customerName: `${customer.firstName} ${customer.lastName}`,
        appointmentDate: format(parseISO(appointment.date), 'EEEE d MMMM yyyy', { locale: it }),
        appointmentTime: appointment.startTime,
        serviceName: service.name,
        staffName: `${staff.firstName} ${staff.lastName}`,
        confirmationUrl
      };

      // 5. Send email
      const emailResult = await emailService.sendReminderEmail(customer.email, emailData);

      if (!emailResult.success) {
        // Create failed reminder record
        const failedReminder: Reminder = {
          id: uuidv4(),
          appointmentId,
          type: 'email',
          scheduledFor: new Date().toISOString(),
          sent: false,
          error: emailResult.error,
          createdAt: new Date().toISOString()
        };

        await db.reminders.put(failedReminder);

        return {
          success: false,
          reminderId: failedReminder.id,
          error: emailResult.error
        };
      }

      // 6. Create successful reminder record
      const reminder: Reminder = {
        id: uuidv4(),
        appointmentId,
        type: 'email',
        scheduledFor: new Date().toISOString(),
        sent: true,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await db.reminders.put(reminder);

      // 7. Update appointment reminderSent flag
      await db.appointments.put({
        ...appointment,
        reminderSent: true,
        confirmationToken,
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Reminder sent for appointment ${appointmentId}`);

      return {
        success: true,
        reminderId: reminder.id
      };
    } catch (error: any) {
      console.error('❌ Error sending reminder:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Send reminders for all appointments needing them
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

      const results = [];
      let sent = 0;
      let failed = 0;

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
   */
  async confirmAppointment(appointmentId: string, token: string): Promise<{
    success: boolean;
    appointment?: Appointment;
    error?: string;
  }> {
    try {
      const doc = await db.appointments.get(appointmentId);
      const appointment = {
        ...doc,
        id: doc._id
      } as unknown as Appointment;

      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      if (appointment.confirmationToken !== token) {
        return { success: false, error: 'Invalid confirmation token' };
      }

      if (appointment.status === 'confirmed') {
        return { success: true, appointment }; // Already confirmed
      }

      // Update appointment status to confirmed
      const updatedAppointment = {
        ...appointment,
        status: 'confirmed' as const,
        updatedAt: new Date().toISOString()
      };

      await db.appointments.put(updatedAppointment);

      console.log(`✅ Appointment ${appointmentId} confirmed by customer`);

      return {
        success: true,
        appointment: updatedAppointment
      };
    } catch (error: any) {
      console.error('❌ Error confirming appointment:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }
}

export default new ReminderService();
