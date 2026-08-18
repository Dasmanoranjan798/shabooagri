# shabooagri_mobile

ShabooAgri's Flutter mobile app — offline-first (Drift/SQLite local
storage + background sync queue), talking to the operational backend's
existing REST API. See the root project docs for backend/role context.

## Building

```
flutter build apk --release --split-per-abi
```

**Always use `--split-per-abi` for a release build**, not plain
`flutter build apk --release`. Without it, every build bundles native
libraries (Flutter engine, SQLite) for all four supported CPU
architectures into one "universal" APK, most of which a given phone
never uses. `--split-per-abi` produces one APK per architecture
instead:

| Variant | Real device relevance |
|---|---|
| `app-arm64-v8a-release.apk` | Virtually every Android phone sold since ~2017 — this is the one to hand to a real tester |
| `app-armeabi-v7a-release.apk` | Older 32-bit devices only |
| `app-x86_64-release.apk` | Emulators/rare x86 tablets — never a real phone |

A debug build (`flutter build apk --debug`, e.g. via `flutter run`)
also always bundles all four architectures — that's normal for local
development, not a bug — but should never be the artifact handed to a
real user; use a split release build for that.

The release `buildTypes` block in `android/app/build.gradle.kts` is
still signed with the debug keystore (`signingConfig =
signingConfigs.getByName("debug")`) — fine for sideloaded testing, but
needs a real release signing config before any wider distribution
(e.g. Play Store).
