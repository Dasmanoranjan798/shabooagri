#!/bin/bash
set -e

# Builds the production (release-signed) Android APK and publishes it to the
# SaaS download path. Requires mobile-app/android/key.properties + the release
# keystore to be present (gitignored, host-only) for a production-signed build;
# without them the build falls back to debug signing (NOT production).
#
# Before running: bump `version:` in mobile-app/pubspec.yaml and the
# /api/app-version values in platform-backend/src/app.ts, and update the
# version string below.

APK_VERSION="v0.8.1"

echo "Building mobile app (release)..."
cd mobile-app
/home/ubuntu/flutter/bin/flutter build apk --release
cd ..

echo "Copying APK to platform-frontend..."
mkdir -p platform-frontend/public/downloads
mkdir -p platform-frontend/dist/downloads
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/public/downloads/shabooagri-${APK_VERSION}.apk
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/dist/downloads/shabooagri-${APK_VERSION}.apk

echo "Building platform-frontend..."
cd platform-frontend
npm run build
cd ..

echo "Done. Remember: the download page + /api/app-version must reference ${APK_VERSION}."
