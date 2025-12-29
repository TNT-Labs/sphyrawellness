#!/bin/bash

##############################################################
# Build APK Script - Sphyra SMS Reminder Mobile App
##############################################################

set -e  # Exit on error

echo "📱 Sphyra SMS Reminder - APK Build Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in mobile directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the mobile/ directory${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js version: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm version: $(npm --version)"

# Check Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}⚠ ANDROID_HOME not set${NC}"
    echo "Please set ANDROID_HOME environment variable"
    echo "Example: export ANDROID_HOME=\$HOME/Android/Sdk"
    exit 1
fi

echo -e "${GREEN}✓${NC} ANDROID_HOME: $ANDROID_HOME"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔨 Building APK..."
echo ""

# Navigate to Android directory
cd android

# Clean previous build
echo "🧹 Cleaning previous build..."
./gradlew clean

# Build release APK
echo "🏗️  Building release APK..."
./gradlew assembleRelease

# Check if APK was created
APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    echo ""
    echo -e "${GREEN}✅ APK built successfully!${NC}"
    echo ""
    echo "📍 APK Location:"
    echo "   $(pwd)/$APK_PATH"
    echo ""
    echo "📊 APK Size:"
    ls -lh "$APK_PATH" | awk '{print "   " $5}'
    echo ""
    echo "📲 Install on device:"
    echo "   adb install $APK_PATH"
    echo ""
    echo "📤 Or copy to device and install manually"
    echo ""
else
    echo -e "${RED}❌ Build failed. APK not found.${NC}"
    exit 1
fi

# Go back to mobile directory
cd ..

exit 0
