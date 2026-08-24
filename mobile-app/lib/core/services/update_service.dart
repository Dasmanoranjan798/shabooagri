import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

final updateServiceProvider = Provider<UpdateService>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://shabooagri.com',
    connectTimeout: const Duration(seconds: 10),
  ));
  return UpdateService(dio);
});

class UpdateService {
  final Dio _dio;
  bool _hasChecked = false;

  UpdateService(this._dio);

  /// The in-app self-updater (server version check → prompt → download an
  /// installer from an external URL) is ONLY valid for the direct-distribution
  /// desktop builds (the Windows .exe served from shabooagri.com). App-store
  /// builds must never do this: Google Play's Device and Network Abuse policy
  /// forbids apps distributed through Play from downloading/installing an APK
  /// from outside Play, and Play (or the App Store) already owns updates on
  /// mobile. So on Android/iOS/web this is a no-op — updates flow through the
  /// store — while Windows/macOS/Linux keep the self-update prompt.
  static bool get _selfUpdateAllowed =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.windows ||
          defaultTargetPlatform == TargetPlatform.macOS ||
          defaultTargetPlatform == TargetPlatform.linux);

  Future<void> checkForUpdates(BuildContext context) async {
    if (!_selfUpdateAllowed) return;
    if (_hasChecked) return;
    _hasChecked = true;

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      final currentBuildNumber = int.tryParse(packageInfo.buildNumber) ?? 0;

      final response = await _dio.get('/api/app-version');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final serverVersion = data['version'] as String;
        final serverBuildNumber = data['buildNumber'] as int? ?? 0;
        final downloadUrl = data['downloadUrl'] as String;

        bool needsUpdate = false;
        if (serverBuildNumber > currentBuildNumber) {
           needsUpdate = true;
        } else if (serverBuildNumber == 0) {
           // Fallback semantic comparison
           if (_compareVersions(serverVersion, currentVersion) > 0) {
             needsUpdate = true;
           }
        }

        if (needsUpdate && context.mounted) {
          _showUpdateDialog(context, serverVersion, downloadUrl);
        }
      }
    } catch (e) {
      // Fail silently, don't block app usage
      debugPrint('Update check failed: $e');
    }
  }
  
  int _compareVersions(String v1, String v2) {
    List<int> p1 = v1.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    List<int> p2 = v2.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    for (int i = 0; i < 3; i++) {
       int diff = (i < p1.length ? p1[i] : 0) - (i < p2.length ? p2[i] : 0);
       if (diff != 0) return diff;
    }
    return 0;
  }

  void _showUpdateDialog(BuildContext context, String newVersion, String url) {
    showDialog(
      context: context,
      barrierDismissible: true, // Let them dismiss or hit LATER
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Update Available'),
          content: Text('Version $newVersion is available. Would you like to download it now?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('LATER'),
            ),
            ElevatedButton(
              onPressed: () async {
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
                if (context.mounted) {
                  Navigator.of(context).pop();
                }
              },
              child: const Text('UPDATE'),
            ),
          ],
        );
      },
    );
  }
}
