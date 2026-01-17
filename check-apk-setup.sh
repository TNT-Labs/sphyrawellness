#!/bin/bash

echo "=== Checking APK Repository Setup ==="
echo ""

# Function to run commands in container
run_in_backend() {
    docker compose -f docker-compose.duckdns.yml exec backend "$@"
}

run_in_db() {
    docker compose -f docker-compose.duckdns.yml exec postgres "$@"
}

echo "1️⃣  Checking if apk_files table exists in database..."
run_in_db psql -U sphyra_user -d sphyra_wellness -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'apk_files');" 2>&1

echo ""
echo "2️⃣  Checking Prisma migrations status..."
run_in_backend npx prisma migrate status 2>&1 | head -20

echo ""
echo "3️⃣  Checking if Prisma Client has ApkFile model..."
run_in_backend node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('ApkFile model exists:', typeof prisma.apkFile !== 'undefined');" 2>&1

echo ""
echo "4️⃣  Checking uploads/apk directory..."
run_in_backend ls -la /app/uploads/apk 2>&1

echo ""
echo "5️⃣  Checking backend logs for errors..."
docker compose -f docker-compose.duckdns.yml logs backend --tail=50 2>&1 | grep -i "error\|apk" | tail -20

echo ""
echo "6️⃣  Testing if backend can access ApkFile model..."
run_in_backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const count = await prisma.apkFile.count();
    console.log('✅ ApkFile model is accessible. Current count:', count);
  } catch (error) {
    console.log('❌ Error accessing ApkFile model:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

test();
" 2>&1

echo ""
echo "=== Check Complete ==="
echo ""
echo "If you see errors above, please share them so I can help fix the issue."
