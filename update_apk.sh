#!/bin/bash
set -e

echo "Building mobile app..."
cd mobile-app
/home/ubuntu/flutter/bin/flutter build apk --release
cd ..

echo "Copying APK to platform-frontend..."
mkdir -p platform-frontend/public/downloads
mkdir -p platform-frontend/dist/downloads
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/public/downloads/shabooagri-v0.8.0.apk
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/dist/downloads/shabooagri-v0.8.0.apk

echo "Updating React download page..."
sed -i 's/v0.7.3/v0.8.0/g' platform-frontend/src/features/marketing/DownloadAppPage.tsx

echo "Building platform-frontend..."
cd platform-frontend
npm run build
cd ..

echo "Done."
