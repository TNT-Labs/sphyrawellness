# Guida al Completamento Migrazione PostgreSQL + REST API

## 📊 Stato Attuale

### ✅ Completato (70%)

**Database & Schema**
- PostgreSQL setup con Docker Compose
- Schema Prisma completo (10 tabelle)
- Seed script funzionante
- Documentazione setup

**Backend Repository Layer (100%)**
- 8 repository Prisma completamente implementati
- CRUD operations per tutte le entità
- Query complesse (search, date ranges, statistics)
- Business logic (conflict detection, consents GDPR)

**Backend REST API (60%)**
- ✅ `/api/customers` - Completo
- ✅ `/api/services` + `/api/services/categories` - Completo
- ✅ `/api/appointments` - Completo
- ✅ `/api/auth` - Completo
- ❌ `/api/staff` + `/api/staff/roles` - Da creare
- ❌ `/api/payments` - Da creare
- ❌ `/api/reminders` - Da creare
- ❌ `/api/users` - Da creare
- ❌ `/api/settings` - Da creare
- ❌ `/api/public/*` - Da creare

**Documentazione (100%)**
- Piano migrazione completo
- API documentation completa
- Database setup guide
- Migration status tracking

---

## 🎯 Passi per Completare (30% Rimanente)

### STEP 1: Completa Backend REST API (1-2 ore)

#### 1.1 Crea endpoint Staff
**File:** `server/src/routes/staff.new.ts`

```typescript
import { Router } from 'express';
import { staffRepository, staffRoleRepository } from '../repositories/staffRepository.js';
// Segui pattern di customers.new.ts
```

**Endpoints da implementare:**
- `GET /api/staff` - Lista staff
- `GET /api/staff/:id` - Dettagli staff
- `POST /api/staff` - Crea staff
- `PUT /api/staff/:id` - Aggiorna staff
- `DELETE /api/staff/:id` - Elimina staff
- `GET /api/staff/roles/all` - Lista ruoli
- `POST /api/staff/roles` - Crea ruolo
- `PUT /api/staff/roles/:id` - Aggiorna ruolo
- `DELETE /api/staff/roles/:id` - Elimina ruolo

#### 1.2 Crea endpoint Payments
**File:** `server/src/routes/payments.new.ts`

**Endpoints da implementare:**
- `GET /api/payments` - Lista pagamenti
- `GET /api/payments/:id` - Dettagli pagamento
- `POST /api/payments` - Crea pagamento
- `PUT /api/payments/:id` - Aggiorna pagamento
- `DELETE /api/payments/:id` - Elimina pagamento
- `GET /api/payments/stats/revenue` - Statistiche fatturato

```typescript
router.get('/stats/revenue', async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const total = await paymentRepository.getTotalRevenue(
    new Date(startDate), new Date(endDate)
  );
  const byMethod = await paymentRepository.getRevenueByMethod(
    new Date(startDate), new Date(endDate)
  );
  res.json({ total, byMethod });
});
```

#### 1.3 Crea endpoint Reminders
**File:** `server/src/routes/reminders.new.ts`

**Endpoints da implementare:**
- `GET /api/reminders` - Lista reminders
- `GET /api/reminders/pending` - Reminders da inviare
- `POST /api/reminders/:id/send` - Invia reminder

#### 1.4 Crea endpoint Users
**File:** `server/src/routes/users.new.ts`

**Endpoints da implementare:**
- `GET /api/users` - Lista utenti
- `GET /api/users/:id` - Dettagli utente
- `POST /api/users` - Crea utente
- `PUT /api/users/:id` - Aggiorna utente
- `PATCH /api/users/:id/password` - Cambia password
- `DELETE /api/users/:id` - Elimina utente

#### 1.5 Crea endpoint Settings
**File:** `server/src/routes/settings.new.ts`

**Endpoints da implementare:**
- `GET /api/settings` - Tutte le impostazioni
- `PUT /api/settings` - Aggiorna impostazioni (bulk)
- `GET /api/settings/:key` - Singola impostazione
- `PUT /api/settings/:key` - Aggiorna singola impostazione

```typescript
router.get('/', async (req, res, next) => {
  const settings = await settingRepository.getAllAsObject();
  res.json(settings);
});

router.put('/', async (req, res, next) => {
  const settingsArray = Object.entries(req.body).map(([key, value]) => ({
    key,
    value,
  }));
  await settingRepository.bulkUpdate(settingsArray, req.user?.id);
  res.json({ success: true });
});
```

#### 1.6 Crea endpoint Public Booking
**File:** `server/src/routes/public.new.ts`

**Endpoints da implementare (NO AUTH):**
- `GET /api/public/services` - Servizi pubblici
- `GET /api/public/staff` - Staff disponibile
- `POST /api/public/appointments/availability` - Verifica disponibilità
- `POST /api/public/appointments` - Prenota appuntamento

#### 1.7 Integra tutti i router in app.ts
**File:** `server/src/app.ts`

```typescript
import customersRouter from './routes/customers.new.js';
import servicesRouter from './routes/services.new.js';
import appointmentsRouter from './routes/appointments.new.js';
import staffRouter from './routes/staff.new.js';
import paymentsRouter from './routes/payments.new.js';
import remindersRouter from './routes/reminders.new.js';
import authRouter from './routes/auth.new.js';
import usersRouter from './routes/users.new.ts';
import settingsRouter from './routes/settings.new.js';
import publicRouter from './routes/public.new.js';

// Public routes (no auth)
app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);

// Protected routes (require auth)
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/services', authenticate, servicesRouter);
app.use('/api/appointments', authenticate, appointmentsRouter);
app.use('/api/staff', authenticate, staffRouter);
app.use('/api/payments', authenticate, paymentsRouter);
app.use('/api/reminders', authenticate, remindersRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/settings', authenticate, settingsRouter);
```

#### 1.8 Crea middleware di autenticazione
**File:** `server/src/middleware/auth.ts`

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

---

### STEP 2: Test Backend (30 min)

```bash
# 1. Avvia PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# 2. Genera Prisma Client
cd server && npm run db:generate

# 3. Run migrations
npm run db:migrate

# 4. Seed database
npm run db:seed

# 5. Start server
npm run dev
```

**Test con curl/Postman:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get customers (con token)
curl -X GET http://localhost:3001/api/customers \
  -H "Authorization: Bearer <token>"
```

---

### STEP 3: Frontend API Client (2-3 ore)

#### 3.1 Installa dipendenze
```bash
npm install axios
```

#### 3.2 Crea API client base
**File:** `src/api/client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### 3.3 Crea API services
**File:** `src/api/customers.ts`

```typescript
import { apiClient } from './client';
import type { Customer } from '../types';

export const customersApi = {
  getAll: async (search?: string) => {
    const { data } = await apiClient.get<Customer[]>('/customers', {
      params: { search },
    });
    return data;
  },

  getById: async (id: string, includeAppointments = false) => {
    const { data } = await apiClient.get<Customer>(`/customers/${id}`, {
      params: { include: includeAppointments ? 'appointments' : undefined },
    });
    return data;
  },

  create: async (customer: Partial<Customer>) => {
    const { data } = await apiClient.post<Customer>('/customers', customer);
    return data;
  },

  update: async (id: string, customer: Partial<Customer>) => {
    const { data } = await apiClient.put<Customer>(`/customers/${id}`, customer);
    return data;
  },

  updateConsents: async (id: string, consents: any) => {
    const { data } = await apiClient.patch<Customer>(
      `/customers/${id}/consents`,
      consents
    );
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/customers/${id}`);
  },
};
```

**Crea file simili per:**
- `src/api/services.ts`
- `src/api/staff.ts`
- `src/api/appointments.ts`
- `src/api/payments.ts`
- `src/api/auth.ts`
- `src/api/settings.ts`

#### 3.4 Esporta tutto
**File:** `src/api/index.ts`

```typescript
export * from './client';
export * from './customers';
export * from './services';
export * from './staff';
export * from './appointments';
export * from './payments';
export * from './auth';
export * from './settings';
```

---

### STEP 4: Frontend Context Refactoring (3-4 ore)

#### 4.1 Update AuthContext
**File:** `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify existing token
    const verifyToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.verify();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user } = await authApi.login(username, password);
    localStorage.setItem('auth_token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 4.2 RISCRIVI AppContext COMPLETAMENTE
**File:** `src/contexts/AppContext.tsx`

**RIMUOVI TUTTO IL CODICE POUCHDB/INDEXEDDB!**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  customersApi,
  servicesApi,
  staffApi,
  appointmentsApi,
  paymentsApi,
  settingsApi,
} from '../api';
import type {
  Customer,
  Service,
  ServiceCategory,
  Staff,
  StaffRole,
  Appointment,
  Payment,
  Setting,
} from '../types';

interface AppContextType {
  // Data
  customers: Customer[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  staff: Staff[];
  staffRoles: StaffRole[];
  appointments: Appointment[];
  payments: Payment[];
  settings: Record<string, any>;

  // Loading states
  isLoading: boolean;

  // CRUD methods
  addCustomer: (customer: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  addService: (service: Partial<Service>) => Promise<Service>;
  updateService: (id: string, service: Partial<Service>) => Promise<Service>;
  deleteService: (id: string) => Promise<void>;

  addStaff: (staff: Partial<Staff>) => Promise<Staff>;
  updateStaff: (id: string, staff: Partial<Staff>) => Promise<Staff>;
  deleteStaff: (id: string) => Promise<void>;

  addAppointment: (appointment: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;

  addPayment: (payment: Partial<Payment>) => Promise<Payment>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;

  updateSettings: (settings: Record<string, any>) => Promise<void>;

  // Refresh data
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [
        customersData,
        servicesData,
        categoriesData,
        staffData,
        rolesData,
        appointmentsData,
        paymentsData,
        settingsData,
      ] = await Promise.all([
        customersApi.getAll(),
        servicesApi.getAll(),
        servicesApi.getCategories(),
        staffApi.getAll(),
        staffApi.getRoles(),
        appointmentsApi.getAll(),
        paymentsApi.getAll(),
        settingsApi.getAll(),
      ]);

      setCustomers(customersData);
      setServices(servicesData);
      setServiceCategories(categoriesData);
      setStaff(staffData);
      setStaffRoles(rolesData);
      setAppointments(appointmentsData);
      setPayments(paymentsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomer = async (customer: Partial<Customer>) => {
    const newCustomer = await customersApi.create(customer);
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    const updated = await customersApi.update(id, customer);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCustomer = async (id: string) => {
    await customersApi.delete(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Implementa metodi simili per services, staff, appointments, payments...

  return (
    <AppContext.Provider
      value={{
        customers,
        services,
        serviceCategories,
        staff,
        staffRoles,
        appointments,
        payments,
        settings,
        isLoading,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        // ... altri metodi
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
```

---

### STEP 5: Update Components (2-3 ore)

Aggiorna tutti i componenti che usano `useApp()`:

**Prima (con PouchDB):**
```typescript
const { customers, addCustomer } = useApp();
```

**Dopo (con API):**
```typescript
const { customers, addCustomer, isLoading } = useApp();

// Gestisci loading
if (isLoading) return <div>Loading...</div>;

// Usa gli stessi metodi (API sotto il hood)
await addCustomer({ firstName: 'Anna', ... });
```

**Aggiungi error handling:**
```typescript
const handleAddCustomer = async (customer: Partial<Customer>) => {
  try {
    await addCustomer(customer);
    toast.success('Cliente aggiunto!');
  } catch (error) {
    toast.error('Errore durante l\'aggiunta del cliente');
    console.error(error);
  }
};
```

---

### STEP 6: Cleanup (1 ora)

#### 6.1 Rimuovi file obsoleti
```bash
rm src/utils/db.ts
rm src/utils/indexedDB.ts
rm src/utils/dbBridge.ts
rm src/utils/pouchdbSync.ts
rm src/utils/syncQueueWorker.ts
rm src/utils/autoBackup.ts
rm src/contexts/DBContext.tsx
```

#### 6.2 Rimuovi dipendenze frontend
```bash
npm uninstall pouchdb-browser pouchdb-find idb
```

#### 6.3 Rimuovi dipendenze backend
```bash
cd server
npm uninstall pouchdb-node pouchdb-find
```

#### 6.4 Update App.tsx
Rimuovi `<DBProvider>`, mantieni solo:
```typescript
<AuthProvider>
  <AppProvider>
    <ToastProvider>
      {/* Your app */}
    </ToastProvider>
  </AppProvider>
</AuthProvider>
```

---

### STEP 7: Environment Variables

#### Backend `.env`
```env
DATABASE_URL="postgresql://sphyra_user:sphyra_dev_password_2024@localhost:5432/sphyra_wellness"
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
```

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:3001/api
```

---

### STEP 8: Deploy

#### Database Production
Opzioni:
1. **Neon** (Free tier): https://neon.tech
2. **Supabase**: https://supabase.com
3. **DigitalOcean** ($15/mese): https://digitalocean.com

#### Backend Deploy
Opzioni:
1. **Render** (Free tier): https://render.com
2. **Railway**: https://railway.app
3. **DigitalOcean App Platform**

#### Frontend Deploy
GitHub Pages (già configurato)

---

## ✅ Checklist Finale

### Backend
- [ ] Tutti gli endpoint REST creati
- [ ] Middleware autenticazione implementato
- [ ] Router integrati in app.ts
- [ ] Database migrations eseguite
- [ ] Seed data caricato
- [ ] Test API con Postman

### Frontend
- [ ] API client creato
- [ ] AuthContext aggiornato
- [ ] AppContext riscritto (NO PouchDB)
- [ ] Tutti i componenti aggiornati
- [ ] File obsoleti rimossi
- [ ] Dipendenze cleanup

### Testing
- [ ] Login funzionante
- [ ] CRUD customers funzionante
- [ ] CRUD services funzionante
- [ ] CRUD staff funzionante
- [ ] CRUD appointments funzionante
- [ ] CRUD payments funzionante

### Deploy
- [ ] Database production setup
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Environment variables configurate

---

## 🎉 Risultato Finale

Avrai un'applicazione moderna con:
- ✅ PostgreSQL database robusto
- ✅ API REST type-safe con Prisma
- ✅ Frontend React senza dipendenze PouchDB
- ✅ Autenticazione JWT
- ✅ Deploy scalabile
- ✅ Performance superiori

**Tempo stimato totale: 8-12 ore** (con esperienza)

---

## 🆘 Troubleshooting

### Database Connection Error
```bash
# Verifica PostgreSQL running
docker ps

# Check logs
docker logs sphyra-postgres

# Restart
docker compose -f docker-compose.postgres.yml restart
```

### Prisma Client Not Generated
```bash
cd server
npm run db:generate
```

### Frontend 401 Errors
Verifica token JWT:
```javascript
console.log(localStorage.getItem('auth_token'));
```

### CORS Errors
Aggiungi frontend URL in `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.com
```

---

## 📚 Risorse

- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [JWT Best Practices](https://jwt.io/introduction)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

**Buona migrazione! 🚀**
