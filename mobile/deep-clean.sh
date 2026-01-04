#!/bin/bash
set -e

echo "🧹 PULIZIA PROFONDA - Come prima build (mantenendo patches)"
echo "============================================================"
echo ""

# Salva la cartella patches se esiste
if [ -d "patches" ]; then
    echo "💾 Backup cartella patches..."
    cp -r patches /tmp/patches-backup
    echo "✅ Patches salvati in /tmp/patches-backup"
fi

echo ""
echo "🗑️  Rimuovendo node_modules..."
rm -rf node_modules

echo "🗑️  Rimuovendo package-lock.json e yarn.lock..."
rm -f package-lock.json yarn.lock

echo "🗑️  Rimuovendo cache Metro Bundler..."
rm -rf $TMPDIR/metro-* $TMPDIR/react-* $TMPDIR/haste-* 2>/dev/null || true

echo "🗑️  Rimuovendo cache React Native..."
rm -rf ~/.cache/react-native 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo "🗑️  Rimuovendo build Android..."
rm -rf android/.gradle
rm -rf android/build
rm -rf android/app/build

echo "🗑️  Rimuovendo cache Gradle globale..."
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/wrapper

echo "🗑️  Rimuovendo .gradle locale..."
rm -rf .gradle

echo ""
echo "📦 Reinstallando node_modules..."
npm install

# Ripristina patches se esisteva
if [ -d "/tmp/patches-backup" ]; then
    echo "♻️  Ripristino cartella patches..."
    cp -r /tmp/patches-backup patches
    rm -rf /tmp/patches-backup
    echo "✅ Patches ripristinati"
fi

echo ""
echo "✅ PULIZIA COMPLETA TERMINATA!"
echo ""
echo "📋 Stato finale:"
ls -lah | grep -E "node_modules|android|patches" || echo "Tutto pulito"
echo ""
echo "🚀 Pronto per build APK! Esegui:"
echo "   cd android && ./gradlew assembleRelease"
echo ""

