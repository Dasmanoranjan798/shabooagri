import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/session_provider.dart';
import '../repositories/auth_repository.dart';

/// Shared "Quick-Login PIN" card — the authenticated counterpart to
/// `ChangePasswordCard`. The caller already has a live session, so setting or
/// changing the PIN needs no OTP and no old PIN: it posts `POST /auth/set-pin`
/// directly. The card shows the *authoritative* PIN state (`AppUser.hasPin`
/// from the backend), never a guess from local storage, and updates it live
/// after a successful save. Available to every role, mirroring the web
/// Settings "My Account & Security" tab.
class ChangePinCard extends ConsumerStatefulWidget {
  const ChangePinCard({super.key});

  @override
  ConsumerState<ChangePinCard> createState() => _ChangePinCardState();
}

class _ChangePinCardState extends ConsumerState<ChangePinCard> {
  final _pinController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void dispose() {
    _pinController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _error = null; _saved = false; });
    final pin = _pinController.text.trim();
    if (pin.length < 4 || pin.length > 6) {
      setState(() => _error = 'PIN must be 4-6 digits.');
      return;
    }
    if (pin != _confirmController.text.trim()) {
      setState(() => _error = 'The two PINs do not match.');
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(authRepositoryProvider).setPin(pin);
      _pinController.clear();
      _confirmController.clear();
      setState(() => _saved = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPin = ref.watch(currentUserProvider)?.hasPin ?? false;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Quick-Login PIN', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text(
              'Set a 4-6 digit PIN for fast sign-in on this device. Your PIN never '
              'replaces your password or OTP — it is an additional quick-login option.',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(hasPin ? Icons.check_circle : Icons.info_outline,
                    size: 18, color: hasPin ? Colors.green : Colors.blueGrey),
                const SizedBox(width: 8),
                Text(
                  hasPin ? 'A PIN is currently set on your account.' : 'No PIN is set yet.',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
            if (_saved)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text('PIN saved successfully.', style: TextStyle(color: Colors.green)),
              ),
            TextField(
              controller: _pinController,
              decoration: InputDecoration(
                labelText: hasPin ? 'New PIN (4-6 digits)' : 'PIN (4-6 digits)',
                border: const OutlineInputBorder(),
              ),
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              enabled: !_saving,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmController,
              decoration: const InputDecoration(labelText: 'Confirm PIN', border: OutlineInputBorder()),
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(hasPin ? 'Change PIN' : 'Set PIN'),
            ),
          ],
        ),
      ),
    );
  }
}
