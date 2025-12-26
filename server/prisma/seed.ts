import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.reminder.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.staffRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.setting.deleteMany();
  }

  // ============================================================================
  // 1. STAFF ROLES
  // ============================================================================
  console.log('👥 Creating staff roles...');

  const roles = await Promise.all([
    prisma.staffRole.create({
      data: {
        name: 'Fisioterapista',
        isActive: true,
      },
    }),
    prisma.staffRole.create({
      data: {
        name: 'Massaggiatore',
        isActive: true,
      },
    }),
    prisma.staffRole.create({
      data: {
        name: 'Osteopata',
        isActive: true,
      },
    }),
    prisma.staffRole.create({
      data: {
        name: 'Receptionist',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${roles.length} staff roles`);

  // ============================================================================
  // 2. SERVICE CATEGORIES
  // ============================================================================
  console.log('📦 Creating service categories...');

  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Fisioterapia',
        color: '#3B82F6',
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Massaggi',
        color: '#10B981',
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Osteopatia',
        color: '#F59E0B',
        isActive: true,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Riabilitazione',
        color: '#8B5CF6',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} service categories`);

  // ============================================================================
  // 3. SERVICES
  // ============================================================================
  console.log('💆 Creating services...');

  const services = await Promise.all([
    // Fisioterapia
    prisma.service.create({
      data: {
        name: 'Seduta Fisioterapica',
        description: 'Trattamento fisioterapico completo per recupero funzionale',
        duration: 60,
        price: 50.00,
        categoryId: categories[0].id,
        color: '#3B82F6',
      },
    }),
    prisma.service.create({
      data: {
        name: 'Terapia Manuale',
        description: 'Manipolazioni e mobilizzazioni articolari',
        duration: 45,
        price: 45.00,
        categoryId: categories[0].id,
        color: '#3B82F6',
      },
    }),

    // Massaggi
    prisma.service.create({
      data: {
        name: 'Massaggio Decontratturante',
        description: 'Massaggio profondo per sciogliere le tensioni muscolari',
        duration: 60,
        price: 55.00,
        categoryId: categories[1].id,
        color: '#10B981',
      },
    }),
    prisma.service.create({
      data: {
        name: 'Massaggio Rilassante',
        description: 'Massaggio dolce per rilassamento generale',
        duration: 60,
        price: 50.00,
        categoryId: categories[1].id,
        color: '#10B981',
      },
    }),

    // Osteopatia
    prisma.service.create({
      data: {
        name: 'Trattamento Osteopatico',
        description: 'Valutazione e trattamento osteopatico completo',
        duration: 60,
        price: 70.00,
        categoryId: categories[2].id,
        color: '#F59E0B',
      },
    }),

    // Riabilitazione
    prisma.service.create({
      data: {
        name: 'Riabilitazione Post-Operatoria',
        description: 'Programma riabilitativo personalizzato post-intervento',
        duration: 60,
        price: 60.00,
        categoryId: categories[3].id,
        color: '#8B5CF6',
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // ============================================================================
  // 4. STAFF
  // ============================================================================
  console.log('👨‍⚕️ Creating staff...');

  const staff = await Promise.all([
    prisma.staff.create({
      data: {
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@sphyrawellness.com',
        phone: '+393331234567',
        roleId: roles[0].id, // Fisioterapista
        specializations: ['Fisioterapia Sportiva', 'Terapia Manuale'],
        color: '#EF4444',
        isActive: true,
      },
    }),
    prisma.staff.create({
      data: {
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'laura.bianchi@sphyrawellness.com',
        phone: '+393337654321',
        roleId: roles[1].id, // Massaggiatore
        specializations: ['Massaggio Sportivo', 'Linfodrenaggio'],
        color: '#10B981',
        isActive: true,
      },
    }),
    prisma.staff.create({
      data: {
        firstName: 'Giuseppe',
        lastName: 'Verdi',
        email: 'giuseppe.verdi@sphyrawellness.com',
        phone: '+393339876543',
        roleId: roles[2].id, // Osteopata
        specializations: ['Osteopatia Strutturale', 'Craniosacrale'],
        color: '#F59E0B',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${staff.length} staff members`);

  // ============================================================================
  // 5. CUSTOMERS
  // ============================================================================
  console.log('👥 Creating customers...');

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'Anna',
        lastName: 'Ferrari',
        email: 'anna.ferrari@email.com',
        phone: '+393331111111',
        dateOfBirth: new Date('1985-05-15'),
        notes: 'Cliente abituale, preferisce appuntamenti mattutini',
        privacyConsent: true,
        privacyConsentDate: new Date(),
        privacyConsentVersion: '1.0',
        emailReminderConsent: true,
        emailReminderConsentDate: new Date(),
        healthDataConsent: true,
        healthDataConsentDate: new Date(),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Marco',
        lastName: 'Colombo',
        email: 'marco.colombo@email.com',
        phone: '+393332222222',
        dateOfBirth: new Date('1990-08-22'),
        allergies: 'Lattice',
        privacyConsent: true,
        privacyConsentDate: new Date(),
        privacyConsentVersion: '1.0',
        smsReminderConsent: true,
        smsReminderConsentDate: new Date(),
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'Giulia',
        lastName: 'Russo',
        email: 'giulia.russo@email.com',
        phone: '+393333333333',
        dateOfBirth: new Date('1978-12-03'),
        privacyConsent: true,
        privacyConsentDate: new Date(),
        privacyConsentVersion: '1.0',
        emailReminderConsent: true,
        emailReminderConsentDate: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // ============================================================================
  // 6. APPOINTMENTS
  // ============================================================================
  console.log('📅 Creating appointments...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await Promise.all([
    prisma.appointment.create({
      data: {
        customerId: customers[0].id,
        serviceId: services[0].id,
        staffId: staff[0].id,
        date: tomorrow,
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T10:00:00'),
        status: 'scheduled',
        notes: 'Prima seduta',
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[1].id,
        serviceId: services[2].id,
        staffId: staff[1].id,
        date: tomorrow,
        startTime: new Date('2024-01-01T10:30:00'),
        endTime: new Date('2024-01-01T11:30:00'),
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[2].id,
        serviceId: services[4].id,
        staffId: staff[2].id,
        date: nextWeek,
        startTime: new Date('2024-01-01T14:00:00'),
        endTime: new Date('2024-01-01T15:00:00'),
        status: 'scheduled',
      },
    }),
  ]);

  console.log(`✅ Created ${appointments.length} appointments`);

  // ============================================================================
  // 7. USERS (Authentication)
  // ============================================================================
  console.log('🔐 Creating users...');

  const passwordHash = await bcrypt.hash('admin123', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        role: 'RESPONSABILE',
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@sphyrawellness.com',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'user',
        passwordHash: await bcrypt.hash('user123', 12),
        role: 'UTENTE',
        firstName: 'User',
        lastName: 'Demo',
        email: 'user@sphyrawellness.com',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);
  console.log('   📝 Admin credentials: admin / admin123');
  console.log('   📝 User credentials: user / user123');

  // ============================================================================
  // 8. SETTINGS
  // ============================================================================
  console.log('⚙️  Creating settings...');

  const settings = await Promise.all([
    prisma.setting.create({
      data: {
        key: 'reminder_send_hour',
        value: 10,
      },
    }),
    prisma.setting.create({
      data: {
        key: 'reminder_send_minute',
        value: 0,
      },
    }),
    prisma.setting.create({
      data: {
        key: 'enable_auto_reminders',
        value: true,
      },
    }),
    prisma.setting.create({
      data: {
        key: 'reminder_days_before',
        value: 1,
      },
    }),
  ]);

  console.log(`✅ Created ${settings.length} settings`);

  console.log('\n✨ Database seeded successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
