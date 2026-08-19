# ShabooAgri Architecture

ShabooAgri is built with a single, unified codebase that operates across all platforms, backed by a central PostgreSQL database and API.

## Core Flow
```
SaaS Platform (React / Express)
    ↓
License / Provisioning
    ↓
ONE Flutter Operational Application (Android, iOS, Windows, macOS, Web)
    ↓
ONE Operational API (Express / Node.js)
    ↓
ONE PostgreSQL Database
```

## Flutter Operational Application
The mobile app (`/mobile-app`) is built using Flutter and supports Android, iOS, Windows, macOS, Web, and Linux from exactly **ONE CODEBASE**.
- **Responsive Design**: Uses Flutter's flexible layout system to seamlessly adapt UI constraints.
- **Offline Sync Architecture**: Uses `drift` (SQLite) wrapped by `sqlite3_flutter_libs` to cache operational state locally. A single `SyncQueue` architecture handles offline data consistency, regardless of OS. No separate database implementations exist for iOS/Windows/Android.
- **State Management**: Handled universally via Riverpod.
- **API Configuration**: Uses Dio pointing to `https://{slug}.shabooagri.com` pointing dynamically to the Operational Backend API. No local IP addresses or hardcoded development paths are included in release builds.
- **Platform-Specific Needs**: Any file picking/sharing requirements are isolated into pure Dart abstractions via standard Flutter packages (`share_plus`, `image_picker`, `path_provider`).

## Build & Release Process
1. **Android**: `flutter build apk --release` (or `appbundle`) outputs a standard Android build, deployed directly to `platform-frontend/dist/downloads/`.
2. **iOS**: Requires an Xcode/macOS build host environment. Run `flutter build ipa`. Do not attempt to fake an IPA. Once built, sign and distribute via TestFlight.
3. **Windows**: Requires a Windows build host environment. Run `flutter build windows`. Package the resulting `Release` folder into an `.msix` or `.exe` installer.
4. **macOS**: Requires a macOS build host environment. Run `flutter build macos`.

## Legacy Frontend
The repository contains a `frontend/` React operational frontend. **This frontend is deprecated and serves only as a reference.** The Flutter app is the sole recipient of all new operational feature development to ensure total feature parity across all platforms without duplicate business logic.
