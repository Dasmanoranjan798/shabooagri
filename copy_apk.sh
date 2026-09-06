cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/public/downloads/shabooagri-v0.8.20.apk
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/dist/downloads/shabooagri-v0.8.20.apk
sed -i 's/v0.8.17/v0.8.20/g' platform-backend/src/app.ts
