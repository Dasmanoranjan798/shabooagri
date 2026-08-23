# ShabooAgri — Client Distribution (Windows & iOS)

Scope of this document: how the Windows desktop app and the iOS app are
packaged and delivered to end users. Android (APK), macOS, React web, and the
backend are covered elsewhere; this file exists for the two platforms addressed
in milestone **P2-4**.

The one Flutter codebase (`mobile-app/`) builds every platform — there is no
platform-specific application/business logic. Distribution differs per OS; the
app code does not.

---

## Windows

### What ships
A single user-facing installer: **`ShabooAgri-Setup-x64.exe`**, built by CI
(`.github/workflows/flutter_ci_cd.yml`, `build_windows` job) from the Flutter
Windows release output using **Inno Setup 6**
(`mobile-app/installer/windows/shabooagri.iss`).

This replaces the previous distribution, which was a raw
`build\windows\x64\runner\Release` folder zipped up — that required the user to
unzip loose files and, on a clean machine, failed to launch because of a
missing runtime (see below). The zip is no longer produced.

### Runtime dependency (the "missing component" a clean machine prompts for)
- **Microsoft Visual C++ 2015–2022 Redistributable (x64): REQUIRED.** Flutter
  Windows apps are compiled with MSVC and dynamically link the VC++ runtime
  (`VCRUNTIME140.dll`, `MSVCP140.dll`, `VCRUNTIME140_1.dll`). These are **not**
  bundled in the raw build output, so on a clean Windows machine
  `shabooagri_mobile.exe` fails to start until the redistributable is present.
  This is the extra component Windows was requesting.
- **Visual Studio IDE: NOT required** by end users. Visual Studio / the C++
  build tools are only needed to *build* the app (on the CI runner), never to
  *run* it.
- **WebView2 Runtime: NOT required.** The app embeds no web view (verified: no
  `webview2`/`WebView2Loader.dll` in the build, no webview dependency in
  `pubspec.yaml`).

### How the installer handles the dependency
The installer **bundles the official `vc_redist.x64.exe`** (downloaded from
`https://aka.ms/vs/17/release/vc_redist.x64.exe` during the CI build) and runs
it **silently and only if the runtime is not already installed** (registry
check on `HKLM\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64\Installed`).
The redistributable is Microsoft-redistributable by license.

### End-user experience
1. Download `ShabooAgri-Setup-x64.exe` from the website.
2. Run it (accept the Windows admin/UAC prompt — admin is needed to install
   into Program Files and to install the VC++ runtime).
3. The installer installs the app, ensures the VC++ runtime, and creates Start
   Menu (and optional desktop) shortcuts.
4. Launch **ShabooAgri** from the Start Menu.

No Flutter, Dart, Visual Studio, SDKs, compilers, or manual DLL steps are
required. Uninstall is via **Settings → Apps** / Add-Remove Programs (Inno
Setup registers a standard uninstaller).

### API configuration
Unchanged by P2-4. The desktop app resolves its backend the same way as every
other client — per the app's existing config (`https://{slug}.shabooagri.com`);
packaging does not alter API endpoints.

### Rebuilding the installer
Handled automatically by the `build_windows` CI job on push to `master`/`main`.
To build manually on a Windows host: `flutter build windows --release`, then
run Inno Setup's `ISCC.exe` on `installer/windows/shabooagri.iss` passing
`/DMyAppVersion=<pubspec version> /DSourceDir=<...Release> /DVcRedistPath=<vc_redist.x64.exe>`.

---

## iOS

### Supported distribution: TestFlight only
iOS apps cannot be side-loaded/direct-installed for normal users. The **only**
supported path for ShabooAgri on iOS is **Apple TestFlight** (and, later, the
App Store). Unsigned builds are **not** installable on real devices and must
not be handed to users.

### Current project state
- Signing is **not configured for release**: `ios/Runner.xcodeproj` uses
  `CODE_SIGN_STYLE = Automatic` with the placeholder `CODE_SIGN_IDENTITY =
  "iPhone Developer"` and **no `DEVELOPMENT_TEAM`** and **no provisioning
  profile**.
- CI currently produces only an **unsigned** build
  (`flutter build ios --release --no-codesign` → `shabooagri-ios-unsigned.zip`),
  which is suitable for compile validation **only** — it cannot be installed by
  users and is not a distribution artifact.

### Prerequisites to enable TestFlight (not yet in place)
These require Apple credentials that are intentionally **not** present in this
repo and must be provided by the account owner:
1. **Apple Developer Program** membership (paid) and an Apple Team ID.
2. Set `DEVELOPMENT_TEAM` (and, for CI, a distribution certificate +
   provisioning profile) in the Xcode/Runner signing settings.
3. An **App Store Connect** app record (bundle id matching `Runner`'s).
4. Build a **signed** IPA on **macOS**: `flutter build ipa` with the signing
   settings / an `ExportOptions.plist` for App Store distribution.
5. Upload to App Store Connect (Xcode Organizer, Transporter, or
   `xcrun altool`/`notarytool`) and distribute via **TestFlight**.

Do not fabricate certificates, provisioning profiles, Apple credentials, or an
App Store Connect configuration, and do not submit anything to Apple as part of
engineering work — these are account-owner actions.

### Source validity
The iOS build shares the same Dart source as every other platform; source
validity is covered by `flutter analyze` in CI. No iOS binary is produced for
distribution until the signing prerequisites above are satisfied on macOS.
