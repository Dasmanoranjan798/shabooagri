import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// The single governing ShabooAgri Privacy Policy. The app does NOT ship its
/// own separate policy document — it points at the same public policy that
/// governs the website and SaaS platform, so the two can never drift apart
/// (this is what Google Play's User Data policy requires of an in-app link).
const String kPrivacyPolicyUrl = 'https://www.shabooagri.com/privacy';

/// Opens the governing Privacy Policy in the device browser. Exposed so any
/// entry point (owner drawer, desktop sidebar, driver/farmer profile) can
/// reuse the exact same destination.
Future<void> openPrivacyPolicy() async {
  final uri = Uri.parse(kPrivacyPolicyUrl);
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// A simple in-app Privacy Policy link/page. It carries no policy text of its
/// own; it explains that the full, current policy lives at the public URL and
/// opens it. This keeps a single source of truth for the policy.
class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.privacy_tip_outlined, size: 56, color: Colors.green),
                const SizedBox(height: 16),
                const Text(
                  'Your privacy matters',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'The ShabooAgri Privacy Policy explains what data the app '
                  'collects, how it is used and protected, and how you can '
                  'request deletion of your account and data. The same policy '
                  'governs the website, the platform, and this app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, height: 1.5),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: openPrivacyPolicy,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('View Privacy Policy'),
                ),
                const SizedBox(height: 12),
                const SelectableText(
                  kPrivacyPolicyUrl,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
