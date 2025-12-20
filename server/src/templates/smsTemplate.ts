/**
 * SMS Templates for Reminder Messages
 * Keep messages concise - standard SMS is 160 chars, but we can use up to 1600 for concatenated SMS
 */

export interface ReminderSMSData {
  customerName: string;
  appointmentDate: string; // e.g., "Giovedì 21 Dicembre"
  appointmentTime: string; // e.g., "14:30"
  serviceName: string;
  staffName: string;
  confirmationLink?: string; // Optional short link for confirmation
}

/**
 * Generate SMS text for appointment reminder
 * Format: ~280 characters (2 SMS)
 */
export function generateReminderSMSText(data: ReminderSMSData): string {
  const { customerName, appointmentDate, appointmentTime, serviceName, staffName, confirmationLink } = data;

  // Extract first name only for brevity
  const firstName = customerName.split(' ')[0];

  let message = `Ciao ${firstName}!\n\n`;
  message += `Promemoria appuntamento:\n`;
  message += `📅 ${appointmentDate}\n`;
  message += `🕐 Ore ${appointmentTime}\n`;
  message += `✨ ${serviceName}\n`;
  message += `👤 Con ${staffName}\n\n`;

  if (confirmationLink) {
    message += `Conferma qui: ${confirmationLink}\n\n`;
  }

  message += `Sphyra Wellness Lab`;

  return message;
}

/**
 * Generate SMS text for appointment confirmation
 */
export function generateConfirmationSMSText(data: Omit<ReminderSMSData, 'confirmationLink'>): string {
  const { customerName, appointmentDate, appointmentTime, serviceName } = data;
  const firstName = customerName.split(' ')[0];

  let message = `Ciao ${firstName}!\n\n`;
  message += `✅ Appuntamento confermato:\n`;
  message += `📅 ${appointmentDate} - ${appointmentTime}\n`;
  message += `✨ ${serviceName}\n\n`;
  message += `Ti aspettiamo!\n`;
  message += `Sphyra Wellness Lab`;

  return message;
}

/**
 * Generate SMS text for appointment cancellation
 */
export function generateCancellationSMSText(data: Omit<ReminderSMSData, 'confirmationLink' | 'staffName'>): string {
  const { customerName, appointmentDate, appointmentTime, serviceName } = data;
  const firstName = customerName.split(' ')[0];

  let message = `Ciao ${firstName},\n\n`;
  message += `Il tuo appuntamento del ${appointmentDate} alle ${appointmentTime} (${serviceName}) è stato cancellato.\n\n`;
  message += `Per prenotare nuovamente, contattaci.\n`;
  message += `Sphyra Wellness Lab`;

  return message;
}

export default {
  generateReminderSMSText,
  generateConfirmationSMSText,
  generateCancellationSMSText
};
