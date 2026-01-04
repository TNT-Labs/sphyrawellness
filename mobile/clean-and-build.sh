#!/bin/bash
set -e

echo "🧹 Pulizia completa cache Android e React Native..."

# 1. Pulisci cache Metro Bundler
echo "📦 Pulendo cache Metro Bundler..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# 2. Pulisci cache React Native
echo "⚛️  Pulendo cache React Native..."
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Pulisci build Android
echo "🤖 Pulendo build folder Android..."
cd android
rm -rf .gradle
rm -rf build
rm -rf app/build
./gradlew clean

# 4. Pulisci cache Gradle globale
echo "🗑️  Pulendo cache Gradle globale..."
rm -rf ~/.gradle/caches/

# 5. Torna alla root del progetto mobile
cd ..

echo ""
echo "✅ Cache pulita! Ora puoi fare il build con:"
echo "   cd android && ./gradlew assembleRelease"
echo ""

