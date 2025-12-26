#!/bin/bash
# cleanup-obsolete.sh
# Script per eliminare tutti i file obsoleti dopo migrazione PostgreSQL

echo "🧹 Cleanup file obsoleti post-migrazione PostgreSQL..."
echo ""

# Frontend - Contexts
echo "📁 Eliminazione contexts vecchi..."
rm -fv src/contexts/AppContext.old.tsx
rm -fv src/contexts/AuthContext.old.tsx
rm -fv src/contexts/DBContext.tsx
echo ""

# Frontend - Utils PouchDB
echo "📁 Eliminazione utils PouchDB/IndexedDB..."
rm -fv src/utils/db.ts
rm -fv src/utils/dbBridge.ts
rm -fv src/utils/pouchdbSync.ts
rm -fv src/utils/syncQueueWorker.ts
rm -fv src/utils/migration.ts
rm -fv src/utils/*.backup
echo ""

# Backend - App vecchio
echo "📁 Eliminazione backend obsoleto..."
rm -fv server/src/app.old.ts
rm -fv server/src/config/database.ts
echo ""

# Backend - Routes vecchie
echo "📁 Eliminazione routes vecchie..."
rm -fv server/src/routes/appointments.ts
rm -fv server/src/routes/auth.ts
rm -fv server/src/routes/customers.ts
rm -fv server/src/routes/public.ts
rm -fv server/src/routes/reminders.ts
rm -fv server/src/routes/settings.ts
echo ""

# Scripts CouchDB
echo "📁 Eliminazione scripts CouchDB..."
rm -fv scripts/configure-couchdb-cors.cjs
rm -fv scripts/reset-couchdb.cjs
rm -fv scripts/setup-couchdb.cjs
rm -fv scripts/verify-db-sync.cjs
rm -fv scripts/verify-sync-config.cjs
rm -fv scripts/test-sync-integrity.js
echo ""

echo "✅ Cleanup completato!"
echo "📊 Verifica i file eliminati con: git status"
echo "💡 Per committare: git add -A && git commit -m 'chore: Remove obsolete PouchDB files'"
