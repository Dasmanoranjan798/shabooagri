import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/repositories/auth_repository.dart';

/// Password reset — mirrors the website's two-step flow
/// (`frontend/src/features/auth/ResetPasswordPage.tsx`) against the same
/// backend endpoints. Entered either from Login ("Forgot password?", no
/// params -> request step) or via the emailed deep link
/// `/reset-password?token=..&email=..` (-> confirm step, prefilled).
class ResetPasswordScreen extends ConsumerStatefulWidget {
  final String? initialEmail;
  final String? initialToken;
  const ResetPasswordScreen({super.key, this.initialEmail, this.initialToken});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  late final TextEditingController _emailController;
  late final TextEditingController _tokenController;
  final _newPasswordController = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _info;
  bool _done = false;
  bool _showConfirm = false;

  // Confirm step if we arrived with a token (deep link) or the user chose to
  // enter a code manually; otherwise the request step.
  bool get _confirmMode => _showConfirm || _tokenController.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
    _tokenController = TextEditingController(text: widget.initialToken ?? '');
    _showConfirm = (widget.initialToken ?? '').trim().isNotEmpty;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() { _busy = true; _error = null; });
    try {
      await action();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendLink() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) { setState(() => _error = 'Enter your registered email.'); return; }
    await _run(() async {
      await ref.read(authRepositoryProvider).requestPasswordReset(email);
      if (mounted) setState(() => _info = 'If an account exists for that email, a reset link has been sent.');
    });
  }

  Future<void> _confirm() async {
    final email = _emailController.text.trim();
    final token = _tokenController.text.trim();
    final pwd = _newPasswordController.text;
    if (email.isEmpty || token.isEmpty) { setState(() => _error = 'Email and reset token are required.'); return; }
    if (pwd.length < 8) { setState(() => _error = 'Password must be at least 8 characters.'); return; }
    await _run(() async {
      await ref.read(authRepositoryProvider).confirmPasswordReset(email, token, pwd);
      if (mounted) setState(() { _done = true; _info = 'Password updated. You can now sign in.'; });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset Password')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_done) ...[
                const Icon(Icons.check_circle, color: Colors.green, size: 48),
                const SizedBox(height: 12),
                Text(_info ?? 'Password updated.', textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(onPressed: () => context.go('/login'), child: const Text('BACK TO SIGN IN')),
              ] else ...[
                Text(_confirmMode ? 'Set a new password' : 'Request a reset link',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                const SizedBox(height: 20),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Registered Email', border: OutlineInputBorder()),
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_busy,
                ),
                const SizedBox(height: 16),
                if (_confirmMode) ...[
                  TextField(
                    controller: _tokenController,
                    decoration: const InputDecoration(labelText: 'Reset Token', border: OutlineInputBorder()),
                    enabled: !_busy,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _newPasswordController,
                    decoration: const InputDecoration(labelText: 'New Password (min 8 chars)', border: OutlineInputBorder()),
                    obscureText: true,
                    enabled: !_busy,
                  ),
                  const SizedBox(height: 8),
                ],
                if (_info != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_info!, style: const TextStyle(color: Colors.green))),
                if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
                ElevatedButton(
                  onPressed: _busy ? null : (_confirmMode ? _confirm : _sendLink),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _busy
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_confirmMode ? 'UPDATE PASSWORD' : 'SEND RESET LINK'),
                ),
                const SizedBox(height: 8),
                if (!_confirmMode)
                  TextButton(
                    onPressed: _busy ? null : () => setState(() => _showConfirm = true),
                    child: const Text('I already have a reset code'),
                  ),
                TextButton(onPressed: _busy ? null : () => context.go('/login'), child: const Text('Back to Sign In')),
              ],
            ],
          ),
          ),
        ),
      ),
    );
  }
}
