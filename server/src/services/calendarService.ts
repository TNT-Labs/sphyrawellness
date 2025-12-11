import type { Appointment, Customer, Service, Staff } from '../types/index.js';

interface CalendarEventData {
  appointment: Appointment;
  customer: Customer;
  service: Service;
  staff: Staff;
}

export class CalendarService {
  /**
   * Generate an iCalendar (.ics) file content for an appointment
   */
  generateICS(data: CalendarEventData): string {
    const { appointment, customer, service, staff } = data;

    // Parse date and time
    const appointmentDate = appointment.date; // YYYY-MM-DD
    const startTime = appointment.startTime; // HH:mm
    const endTime = appointment.endTime; // HH:mm

    // Create start and end datetime in iCalendar format (UTC)
    const dtStart = this.formatDateTimeForICS(appointmentDate, startTime);
    const dtEnd = this.formatDateTimeForICS(appointmentDate, endTime);
    const dtStamp = this.formatCurrentDateTimeForICS();

    // Generate unique ID for the event
    const uid = `${appointment.id}@sphyrawellness.com`;

    // Escape text for iCalendar format
    const summary = this.escapeICSText(service.name);
    const description = this.escapeICSText(
      `Appuntamento presso Sphyra Wellness\n` +
      `Servizio: ${service.name}\n` +
      `Operatore: ${staff.firstName} ${staff.lastName}\n` +
      `Durata: ${service.duration} minuti\n\n` +
      `Per qualsiasi informazione contattaci direttamente.`
    );

    const organizerEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@sphyrawellness.com';
    const attendeeEmail = customer.email;
    const attendeeName = `${customer.firstName} ${customer.lastName}`;

    // Build iCalendar content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sphyra Wellness//Appointment Reminder//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Sphyra Wellness',
      `ORGANIZER;CN=Sphyra Wellness:mailto:${organizerEmail}`,
      `ATTENDEE;CN=${this.escapeICSText(attendeeName)};RSVP=TRUE:mailto:${attendeeEmail}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Promemoria: Appuntamento tra 1 ora',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  /**
   * Format date and time for iCalendar format (YYYYMMDDTHHmmss)
   * Converts to Europe/Rome timezone
   */
  private formatDateTimeForICS(date: string, time: string): string {
    // date: YYYY-MM-DD, time: HH:mm
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');

    // Format as YYYYMMDDTHHMMSS (local time in Europe/Rome)
    const formatted = `${year}${month}${day}T${hours}${minutes}00`;

    return formatted;
  }

  /**
   * Format current datetime for DTSTAMP field
   */
  private formatCurrentDateTimeForICS(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape special characters for iCalendar text fields
   */
  private escapeICSText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')  // Backslash
      .replace(/;/g, '\\;')     // Semicolon
      .replace(/,/g, '\\,')     // Comma
      .replace(/\n/g, '\\n');   // Newline
  }
}

export default new CalendarService();
