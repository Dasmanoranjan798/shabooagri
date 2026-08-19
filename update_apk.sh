cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/public/downloads/shabooagri-v0.8.0.apk
cp mobile-app/build/app/outputs/flutter-apk/app-release.apk platform-frontend/dist/downloads/shabooagri-v0.8.0.apk
sed -i 's/v0.7.3/v0.8.0/g' platform-frontend/src/features/marketing/DownloadAppPage.tsx
cd platform-frontend && npm run build
