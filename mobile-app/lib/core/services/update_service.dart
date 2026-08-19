import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const String _currentAppVersion = '0.6.0';

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

  Future<void> checkForUpdates(BuildContext context) async {
    if (_hasChecked) return;
    _hasChecked = true;

    try {
      final response = await _dio.get('/api/app-version');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final serverVersion = data['version'] as String;
        final downloadUrl = data['downloadUrl'] as String;

        if (serverVersion != _currentAppVersion && context.mounted) {
          _showUpdateDialog(context, serverVersion, downloadUrl);
        }
      }
    } catch (e) {
      // Fail silently, don't block app usage
      debugPrint('Update check failed: $e');
    }
  }

  void _showUpdateDialog(BuildContext context, String newVersion, String url) {
    showDialog(
      context: context,
      barrierDismissible: true,
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
