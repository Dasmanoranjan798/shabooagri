cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/public/downloads/shabooagri-v0.7.3.apk
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/dist/downloads/shabooagri-v0.7.3.apk
sed -i 's/v0.7.2/v0.7.3/g' platform-backend/src/app.ts
