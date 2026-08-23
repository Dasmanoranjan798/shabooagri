; ShabooAgri — Windows installer (Inno Setup 6)
;
; Produces a single user-facing installer (ShabooAgri-Setup-x64.exe) that
; replaces the old "unzip a loose Release folder" distribution. It:
;   - installs the built Flutter Windows app into Program Files,
;   - creates Start Menu (and optional desktop) shortcuts,
;   - registers a proper uninstaller (Add/Remove Programs),
;   - ensures the Microsoft Visual C++ 2015-2022 x64 Redistributable is
;     present (Flutter Windows apps dynamically link the MSVC runtime;
;     without it a clean machine fails to launch shabooagri_mobile.exe with a
;     "VCRUNTIME140.dll missing / required component" error). The redist is
;     bundled and run silently ONLY if not already installed.
;
; End users need NOTHING else — no Flutter, Dart, Visual Studio, SDKs, or
; compilers. WebView2 is NOT required (the app embeds no web view).
;
; Built on Windows/CI by ISCC. Overridable defines (passed by CI with /D...):
;   MyAppVersion  - product version (default below; CI passes pubspec version)
;   SourceDir     - the Flutter Release output dir to package
;   VcRedistPath  - path to vc_redist.x64.exe to bundle

#ifndef MyAppVersion
  #define MyAppVersion "0.8.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\..\build\windows\x64\runner\Release"
#endif
#ifndef VcRedistPath
  #define VcRedistPath "vc_redist.x64.exe"
#endif

#define MyAppName "ShabooAgri"
#define MyAppPublisher "Shaboo"
#define MyAppExeName "shabooagri_mobile.exe"
#define MyAppURL "https://shabooagri.com"

[Setup]
; Stable AppId — must never change across versions so upgrades/uninstall work.
AppId={{A3F1C2E4-5B6D-4E7F-8A90-1B2C3D4E5F60}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
OutputBaseFilename=ShabooAgri-Setup-x64
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; 64-bit only application.
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Admin needed to write Program Files and to install the VC++ redistributable.
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; The entire Flutter Windows Release output (exe + DLLs + data\).
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
; VC++ redistributable bootstrapper — removed after install; only executed if needed (see [Run]/Check).
Source: "{#VcRedistPath}"; DestDir: "{tmp}"; DestName: "vc_redist.x64.exe"; Flags: deleteafterinstall

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Install the VC++ runtime silently, only when the check says it's missing.
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Installing Microsoft Visual C++ runtime..."; Check: VCRedistNeeded; Flags: waituntilterminated
; Offer to launch the app after a non-silent install.
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
// Returns True if the Microsoft Visual C++ 2015-2022 x64 runtime is NOT
// already installed (so the bundled redist should run). The runtime records
// itself under this key with Installed=1; absence (or read failure) => install.
function VCRedistNeeded(): Boolean;
var
  installed: Cardinal;
begin
  if RegQueryDWordValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64', 'Installed', installed) then
    Result := (installed <> 1)
  else
    Result := True;
end;
