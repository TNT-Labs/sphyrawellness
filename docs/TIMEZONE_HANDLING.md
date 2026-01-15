# Timezone Handling Guide

## Overview

**Storage Strategy**: All dates and times are stored in **UTC** in the database.
**Display Strategy**: Convert to local timezone **only for display** in the frontend.

## Backend (Server)

### ✅ DO: Use Standard Utilities

Always use the utilities from `server/src/utils/dateTimeUtils.ts`:

```typescript
import {
  parseDateToUTC,
  parseTimeToUTC,
  combineDateTimeUTC,
  formatDateToString,
  formatTimeToString
} from '../utils/dateTimeUtils.js';

// Parse appointment date
const appointmentDate = parseDateToUTC('2024-03-15'); // 2024-03-15T12:00:00.000Z

// Parse appointment time
const startTime = parseTimeToUTC('14:30'); // 1970-01-01T14:30:00.000Z

// Combine for full timestamp
const fullDateTime = combineDateTimeUTC('2024-03-15', '14:30'); // 2024-03-15T14:30:00.000Z
```

### ❌ DON'T: Use Raw Date Constructors

```typescript
// ❌ BAD: Browser uses local timezone!
const date = new Date('2024-03-15'); // Depends on server's timezone

// ❌ BAD: Ambiguous timezone
const date = new Date(dateString); // What timezone is this?

// ✅ GOOD: Explicit UTC
const date = parseDateToUTC('2024-03-15'); // Always UTC
```

### Database Schema

Prisma schema uses UTC-based types:

```prisma
model Appointment {
  date      DateTime @db.Date    // Stores date part only, UTC
  startTime DateTime @db.Time    // Stores time part only, UTC
  endTime   DateTime @db.Time    // Stores time part only, UTC
}
```

## Frontend (Client)

### Receiving Data from Backend

Backend always sends UTC timestamps:

```typescript
// Backend response
{
  "date": "2024-03-15T12:00:00.000Z",    // UTC
  "startTime": "1970-01-01T14:30:00.000Z" // UTC
}
```

### ✅ DO: Convert to Local for Display

```typescript
// Parse UTC date from backend
const utcDate = new Date(appointment.date); // "2024-03-15T12:00:00.000Z"

// Display in user's local timezone
const localDateString = utcDate.toLocaleDateString('it-IT', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
});
// Output: "venerdì 15 marzo 2024"

// Display time in user's local timezone
const utcTime = new Date(appointment.startTime); // "1970-01-01T14:30:00.000Z"
const localTimeString = utcTime.toLocaleTimeString('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit'
});
// Output: "14:30" (if UTC+0) or "15:30" (if UTC+1 DST)
```

### Using date-fns (Recommended)

```typescript
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Backend sends UTC, convert to user's timezone for display
const utcDate = parseISO(appointment.date); // "2024-03-15T12:00:00.000Z"
const userTimezone = 'Europe/Rome';
const localDate = utcToZonedTime(utcDate, userTimezone);

// Display formatted
const formatted = format(localDate, 'PPPppp', { locale: it });
// Output: "15 marzo 2024 alle 14:30"
```

### Sending Data to Backend

Always convert user input to UTC before sending:

```typescript
// User selects date/time in their local timezone
const userDate = '2024-03-15'; // From date picker
const userTime = '14:30';       // From time picker

// Convert to UTC for backend
import { zonedTimeToUtc } from 'date-fns-tz';

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const localDateTime = new Date(`${userDate}T${userTime}`);
const utcDateTime = zonedTimeToUtc(localDateTime, userTimezone);

// Send to backend
await api.post('/api/appointments', {
  date: utcDateTime.toISOString().split('T')[0], // "2024-03-15"
  startTime: format(utcDateTime, 'HH:mm'),        // "13:30" (if UTC+1)
});
```

### React Component Example

```typescript
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { it } from 'date-fns/locale';

function AppointmentForm() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Combine date and time
    const localDateTime = new Date(`${date}T${time}`);

    // Convert to UTC
    const utcDateTime = zonedTimeToUtc(localDateTime, userTimezone);

    // Send to backend (in UTC)
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: format(utcDateTime, 'yyyy-MM-dd'),
        startTime: format(utcDateTime, 'HH:mm'),
        // ... other fields
      })
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit">Prenota</button>
    </form>
  );
}
```

### Display Appointment Example

```typescript
interface Appointment {
  date: string;      // UTC ISO string from backend
  startTime: string; // UTC ISO string from backend
  endTime: string;   // UTC ISO string from backend
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Parse UTC dates from backend
  const utcDate = parseISO(appointment.date);
  const utcStart = parseISO(appointment.startTime);
  const utcEnd = parseISO(appointment.endTime);

  // Convert to user's local timezone
  const localDate = utcToZonedTime(utcDate, userTimezone);
  const localStart = utcToZonedTime(utcStart, userTimezone);
  const localEnd = utcToZonedTime(utcEnd, userTimezone);

  // Format for display
  const dateDisplay = format(localDate, 'EEEE d MMMM yyyy', { locale: it });
  const timeDisplay = `${format(localStart, 'HH:mm')} - ${format(localEnd, 'HH:mm')}`;

  return (
    <div>
      <h3>{dateDisplay}</h3>
      <p>{timeDisplay}</p>
    </div>
  );
}
```

## Common Scenarios

### Scenario 1: User in Italy Books Appointment

1. User sees time picker in **local time** (Europe/Rome, UTC+1 or UTC+2 with DST)
2. User selects: **2024-03-15 14:30** local time
3. Frontend converts to UTC: **2024-03-15 13:30** (if UTC+1)
4. Backend stores: **2024-03-15** date, **13:30** time (UTC)
5. Next time user views: Backend sends UTC, frontend converts back to **14:30** local

### Scenario 2: DST (Daylight Saving Time) Transition

**Problem**: Appointments should not "shift" during DST transitions.

**Solution**: Store in UTC (unaffected by DST), convert to local on display.

```typescript
// March 27, 2024: Clocks move forward (UTC+1 → UTC+2)

// Before DST (UTC+1)
User books: 14:30 local → Stored: 13:30 UTC → Displays: 14:30 local ✅

// After DST (UTC+2)
Same appointment → Stored: 13:30 UTC → Displays: 15:30 local ❌ WRONG!

// CORRECT APPROACH: Don't convert times, only dates
// Appointments are scheduled in "local time" that doesn't shift
// So we need to store the INTENDED local time, not UTC!
```

**⚠️ IMPORTANT REALIZATION**: For appointments, we might want to store LOCAL time, not UTC!

### Revised Strategy for Appointments

For **appointments** specifically (not logs or timestamps):

```typescript
// Backend receives from frontend:
{
  date: "2024-03-15",  // Date in local context
  startTime: "14:30",  // Time in local context
  timezone: "Europe/Rome" // User's timezone
}

// Backend stores:
// - date: as-is (2024-03-15)
// - startTime: as-is (14:30)
// - timezone: "Europe/Rome" (for future reference)

// WHY: The appointment is at "2:30 PM local time", regardless of DST.
// Storing UTC would cause the appointment to shift by 1 hour during DST.
```

## Migration Plan

### Phase 1: Add Utilities (✅ Done)
- Created `server/src/utils/dateTimeUtils.ts`
- Created this documentation

### Phase 2: Update New Code
- Use utilities for ALL new features
- Document timezone assumptions

### Phase 3: Gradual Refactor
- File-by-file migration of existing code
- Extensive testing after each file
- Monitor for bugs in production

### Phase 4: Frontend Updates
- Implement date-fns-tz throughout
- Add timezone selector for users (future)
- Test across multiple timezones

## Testing

### Manual Test Checklist

- [ ] Create appointment in different timezone
- [ ] View appointment after DST transition
- [ ] Edit appointment time
- [ ] Filter appointments by date range
- [ ] Export appointments (check times)
- [ ] Email reminders (check times)

### Automated Tests

```typescript
import { parseDateToUTC, parseTimeToUTC } from './dateTimeUtils';

describe('Timezone Handling', () => {
  test('parseDateToUTC creates UTC noon', () => {
    const date = parseDateToUTC('2024-03-15');
    expect(date.toISOString()).toBe('2024-03-15T12:00:00.000Z');
  });

  test('parseTimeToUTC uses epoch date', () => {
    const time = parseTimeToUTC('14:30');
    expect(time.toISOString()).toBe('1970-01-01T14:30:00.000Z');
  });

  // Add more tests...
});
```

## Troubleshooting

### Problem: Appointments show wrong time

**Symptom**: User booked for 2:30 PM but sees 3:30 PM

**Cause**: Backend sent UTC, frontend didn't convert to local

**Fix**: Use `utcToZonedTime()` before displaying

### Problem: Appointments shift during DST

**Symptom**: Appointment moves 1 hour forward/backward after DST

**Cause**: Storing UTC instead of local time for appointments

**Fix**: Consider storing local time + timezone for appointments

### Problem: Date is off by one day

**Symptom**: User booked March 15, but see March 14 or 16

**Cause**: Timezone conversion of date-only values

**Fix**: Use `parseDateToUTC()` which sets to noon to avoid edge cases

## Resources

- [MDN: Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [ISO 8601 Format](https://en.wikipedia.org/wiki/ISO_8601)
- [Moment Timezone](https://momentjs.com/timezone/) (legacy reference)

## Questions?

If unsure about timezone handling:

1. **Read this doc** 📖
2. **Check existing code** using dateTimeUtils.ts
3. **Ask in code review** 🔍
4. **Test in multiple timezones** 🌍
5. **Document your assumptions** 📝

---

**Remember**: Timezone bugs are subtle and appear only in specific conditions. Always test thoroughly!

**Last updated**: 2026-01-15
