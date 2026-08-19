import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../network/api_error.dart';

/// Shared "Change Password" form — matches `ChangePasswordCard.tsx`
/// exactly (`POST /auth/change-password`, `{currentPassword?, newPassword}`)
/// available to every role, so it's reused as-is across Settings' "My
/// Account & Security" tab and the Driver/Farmer Profile screens rather
/// than being duplicated per-surface.
class ChangePasswordCard extends ConsumerStatefulWidget {
  const ChangePasswordCard({super.key});

  @override
  ConsumerState<ChangePasswordCard> createState() => _ChangePasswordCardState();
}

class _ChangePasswordCardState extends ConsumerState<ChangePasswordCard> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _saved = false;
    });
    final newPassword = _newController.text;
    if (newPassword.length < 8) {
      setState(() => _error = 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword != _confirmController.text) {
      setState(() => _error = 'New password and confirmation do not match.');
      return;
    }
    setState(() => _saving = true);
    try {
      final dio = ref.read(apiClientProvider);
      final current = _currentController.text.trim();
      await dio.post('/auth/change-password', data: {
        if (current.isNotEmpty) 'currentPassword': current,
        'newPassword': newPassword,
      });
      setState(() => _saved = true);
      _currentController.clear();
      _newController.clear();
      _confirmController.clear();
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Change Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Update the password used to sign in to your account', style: TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
            if (_saved)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text('Password changed successfully.', style: TextStyle(color: Colors.green)),
              ),
            TextField(
              controller: _currentController,
              decoration: const InputDecoration(
                labelText: 'Current Password',
                hintText: "Leave blank if you've never set a password",
                border: OutlineInputBorder(),
              ),
              obscureText: true,
              enabled: !_saving,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _newController,
              decoration: const InputDecoration(labelText: 'New Password *', hintText: 'At least 8 characters', border: OutlineInputBorder()),
              obscureText: true,
              enabled: !_saving,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmController,
              decoration: const InputDecoration(labelText: 'Confirm New Password *', border: OutlineInputBorder()),
              obscureText: true,
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Change Password'),
            ),
          ],
        ),
      ),
    );
  }
}
