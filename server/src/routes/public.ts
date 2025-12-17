import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import reminderService from '../services/reminderService.js';
import type { ApiResponse, Service, Staff, Appointment, Customer } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/public/services
 * Get all active services with their categories
 * Public: No authentication required
 */
router.get('/services', async (req, res) => {
  try {
    // Fetch all services
    const servicesResult = await db.services.allDocs({
      include_docs: true
    });

    const services: Service[] = servicesResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/'))
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Service[];

    // Fetch all categories
    const categoriesResult = await db.services.allDocs({
      include_docs: true
    });

    // Note: Categories might be in a separate collection or embedded
    // For now, we'll return an empty array or fetch from a dedicated collection
    const categories: any[] = [];

    const response: ApiResponse = {
      success: true,
      data: {
        services,
        categories
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching services:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch services'
    };
    res.status(500).json(response);
  }
});

/**
 * Helper function to check if a staff member is available at a given time slot
 */
function isStaffAvailable(
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  appointments: Appointment[]
): boolean {
  const appointmentsForStaff = appointments.filter(
    apt => apt.staffId === staffId && apt.date === date && apt.status !== 'cancelled'
  );

  for (const apt of appointmentsForStaff) {
    // Check if there's any overlap
    if (
      (startTime >= apt.startTime && startTime < apt.endTime) ||
      (endTime > apt.startTime && endTime <= apt.endTime) ||
      (startTime <= apt.startTime && endTime >= apt.endTime)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Helper function to add minutes to a time string
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * GET /api/public/available-slots
 * Get available time slots for a service on a specific date
 * Query params: serviceId, date (YYYY-MM-DD)
 * Public: No authentication required
 */
router.get('/available-slots', async (req, res) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      const response: ApiResponse = {
        success: false,
        error: 'serviceId and date are required'
      };
      return res.status(400).json(response);
    }

    // Fetch the service to get duration
    const serviceDoc = await db.services.get(serviceId as string);
    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    // Fetch all staff
    const staffResult = await db.staff.allDocs({
      include_docs: true
    });

    const allStaff: Staff[] = staffResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/'))
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Staff[];

    // Filter staff that can perform this service (have the service category in specializations)
    const qualifiedStaff = allStaff.filter(
      staff =>
        staff.specializations &&
        service.category &&
        staff.specializations.includes(service.category)
    );

    if (qualifiedStaff.length === 0) {
      const response: ApiResponse = {
        success: true,
        data: { slots: [] },
        message: 'No staff available for this service'
      };
      return res.json(response);
    }

    // Fetch all appointments for the given date
    const appointmentsResult = await db.appointments.find({
      selector: {
        date: date as string,
        status: { $in: ['scheduled', 'confirmed'] }
      }
    });

    const appointments: Appointment[] = appointmentsResult.docs.map(doc => ({
      ...doc,
      id: doc._id
    })) as any;

    // Generate time slots (9:00 - 19:00, every 30 minutes)
    const slots = [];
    const workDayStart = '09:00';
    const workDayEnd = '19:00';
    const slotInterval = 30; // minutes

    let currentTime = workDayStart;

    while (currentTime < workDayEnd) {
      const endTime = addMinutesToTime(currentTime, service.duration);

      // Check if slot end time is within work hours
      if (endTime <= workDayEnd) {
        // Check if any staff member is available for this slot
        const availableStaff = qualifiedStaff.find(staff =>
          isStaffAvailable(staff.id, date as string, currentTime, endTime, appointments)
        );

        slots.push({
          time: currentTime,
          available: !!availableStaff,
          staffId: availableStaff?.id
        });
      }

      currentTime = addMinutesToTime(currentTime, slotInterval);
    }

    const response: ApiResponse = {
      success: true,
      data: { slots }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to fetch available slots'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/public/bookings
 * Create a new booking from public interface
 * Public: No authentication required
 */
router.post('/bookings', async (req, res) => {
  try {
    const {
      serviceId,
      date,
      startTime,
      firstName,
      lastName,
      email,
      phone,
      notes
    } = req.body;

    // Validation
    if (!serviceId || !date || !startTime || !firstName || !lastName || !email || !phone) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email format'
      };
      return res.status(400).json(response);
    }

    // Fetch the service
    const serviceDoc = await db.services.get(serviceId);
    const service: Service = {
      ...serviceDoc,
      id: serviceDoc._id
    } as any;

    // Calculate end time
    const endTime = addMinutesToTime(startTime, service.duration);

    // Fetch all staff qualified for this service
    const staffResult = await db.staff.allDocs({
      include_docs: true
    });

    const allStaff: Staff[] = staffResult.rows
      .filter(row => row.doc && !row.id.startsWith('_design/'))
      .map(row => ({
        ...row.doc,
        id: row.id
      })) as Staff[];

    const qualifiedStaff = allStaff.filter(
      staff =>
        staff.specializations &&
        service.category &&
        staff.specializations.includes(service.category)
    );

    if (qualifiedStaff.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No staff available for this service'
      };
      return res.status(400).json(response);
    }

    // Fetch all appointments for the given date
    const appointmentsResult = await db.appointments.find({
      selector: {
        date: date,
        status: { $in: ['scheduled', 'confirmed'] }
      }
    });

    const existingAppointments: Appointment[] = appointmentsResult.docs.map(doc => ({
      ...doc,
      id: doc._id
    })) as any;

    // Find an available staff member for the requested slot
    const availableStaff = qualifiedStaff.find(staff =>
      isStaffAvailable(staff.id, date, startTime, endTime, existingAppointments)
    );

    if (!availableStaff) {
      const response: ApiResponse = {
        success: false,
        error: 'The selected time slot is no longer available. Please choose another time.'
      };
      return res.status(400).json(response);
    }

    // Check if customer already exists by email
    let customer: Customer | null = null;
    try {
      const customersResult = await db.customers.allDocs({
        include_docs: true
      });

      const existingCustomer = customersResult.rows.find(
        row => row.doc && (row.doc as any).email === email
      );

      if (existingCustomer && existingCustomer.doc) {
        customer = {
          ...existingCustomer.doc,
          id: existingCustomer.id
        } as any;
      }
    } catch (error) {
      console.log('No existing customer found');
    }

    // Create new customer if doesn't exist
    if (!customer) {
      const customerId = uuidv4();
      const newCustomer: Customer = {
        id: customerId,
        firstName,
        lastName,
        email,
        phone,
        notes: notes || '',
        createdAt: new Date().toISOString()
      };

      await db.customers.put({
        _id: customerId,
        ...newCustomer
      } as any);

      customer = newCustomer;
    } else {
      // Update customer info if it changed
      const updatedCustomer = {
        ...customer,
        firstName,
        lastName,
        phone,
        notes: notes ? `${customer.notes || ''}\n${notes}`.trim() : customer.notes,
        updatedAt: new Date().toISOString()
      };

      await db.customers.put({
        _id: customer.id,
        _rev: (await db.customers.get(customer.id))._rev,
        ...updatedCustomer
      } as any);

      customer = updatedCustomer;
    }

    // Create the appointment
    const appointmentId = uuidv4();
    const appointment: Appointment = {
      id: appointmentId,
      customerId: customer.id,
      serviceId: service.id,
      staffId: availableStaff.id,
      date,
      startTime,
      endTime,
      status: 'scheduled',
      notes: notes || '',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };

    await db.appointments.put({
      _id: appointmentId,
      ...appointment
    } as any);

    // Send confirmation email with reminder
    try {
      await reminderService.sendReminderForAppointment(appointmentId);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    const response: ApiResponse = {
      success: true,
      data: {
        appointment,
        customer
      },
      message: 'Booking created successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error creating booking:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Failed to create booking'
    };
    res.status(500).json(response);
  }
});

export default router;
