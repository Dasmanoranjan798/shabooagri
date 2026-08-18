import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/storage/local_storage.dart';

/// One-time, per-device step: which ShabooAgri company does this phone
/// belong to? Resolves to `https://{slug}.shabooagri.com`, the same
/// wildcard-subdomain tenant resolution the web app already uses — so this
/// screen only needs to collect and validate a slug, not talk to any
/// license/activation service.
class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({super.key});

  @override
  ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _controller = TextEditingController();
  bool _isChecking = false;
  String? _errorText;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    final slug = _controller.text.trim().toLowerCase();
    if (slug.isEmpty) {
      setState(() => _errorText = 'Enter your company ID.');
      return;
    }

    setState(() {
      _isChecking = true;
      _errorText = null;
    });

    try {
      final dio = Dio(BaseOptions(
        baseUrl: 'https://$slug.shabooagri.com',
        connectTimeout: const Duration(seconds: 10),
      ));
      // `/health` is a plain infra liveness check mounted ahead of the
      // backend's tenant-resolver middleware, so it returns 200 for *any*
      // subdomain, real or not — it can't confirm the company exists.
      // `/auth/me` runs after tenant resolution: a real company slug with
      // no token yields 401 "Missing access token"; a slug matching no
      // company yields 404 "Tenant Not Found" first. A 401 here is exactly
      // what confirms the slug is real.
      final response = await dio.get(
        '/auth/me',
        options: Options(validateStatus: (status) => status == 401 || status == 404),
      );
      if (response.statusCode != 401) {
        throw Exception('tenant not found');
      }

      await TenantStorage.setSlug(slug);
      ref.read(tenantSlugProvider.notifier).state = slug;

      if (!mounted) return;
      context.go('/login');
    } catch (_) {
      setState(() {
        _errorText = "Couldn't find a company with that ID. Check with your ShabooAgri admin.";
      });
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Company Setup')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.business, size: 56, color: Colors.green),
              const SizedBox(height: 16),
              const Text(
                'Welcome to ShabooAgri',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                "Enter your company's ID to connect this device. Your admin can provide this — it's the same one used at company-id.shabooagri.com.",
                style: TextStyle(fontSize: 14, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _controller,
                decoration: InputDecoration(
                  labelText: 'Company ID',
                  hintText: 'e.g. pilot',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.apartment),
                  errorText: _errorText,
                ),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _continue(),
                enabled: !_isChecking,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isChecking ? null : _continue,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: _isChecking
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('CONTINUE', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
