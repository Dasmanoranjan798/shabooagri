import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/repositories/auth_repository.dart';

/// Staff/farmer invite activation — mirrors the website's
/// `frontend/src/features/auth/AcceptInvitePage.tsx` against the same backend
/// endpoints. Reached via the emailed/SMSed deep link `/accept-invite?token=..`
/// or by pasting the invite token. Verifies the token, then sets a password to
/// activate the account and log in (backend returns a session).
class AcceptInviteScreen extends ConsumerStatefulWidget {
  final String? initialToken;
  const AcceptInviteScreen({super.key, this.initialToken});

  @override
  ConsumerState<AcceptInviteScreen> createState() => _AcceptInviteScreenState();
}

class _AcceptInviteScreenState extends ConsumerState<AcceptInviteScreen> {
  late final TextEditingController _tokenController;
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _busy = false;
  bool _verified = false;
  String? _inviteeName;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tokenController = TextEditingController(text: widget.initialToken ?? '');
    if ((widget.initialToken ?? '').trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _verify());
    }
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
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

  Future<void> _verify() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) { setState(() => _error = 'Enter your invite token.'); return; }
    await _run(() async {
      final data = await ref.read(authRepositoryProvider).verifyInviteToken(token);
      if (mounted) {
        setState(() {
          _verified = true;
          _inviteeName = (data['fullName'] ?? data['name'] ?? data['contactPerson'])?.toString();
        });
      }
    });
  }

  Future<void> _accept() async {
    final token = _tokenController.text.trim();
    final pwd = _passwordController.text;
    if (pwd.length < 8) { setState(() => _error = 'Password must be at least 8 characters.'); return; }
    if (pwd != _confirmController.text) { setState(() => _error = 'Passwords do not match.'); return; }
    await _run(() async {
      final user = await ref.read(authRepositoryProvider).acceptInvite(token, pwd);
      if (mounted) context.go(user.homeRoute);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Activate Account')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_verified) ...[
                const Text('Enter your invite', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                const SizedBox(height: 20),
                TextField(
                  controller: _tokenController,
                  decoration: const InputDecoration(labelText: 'Invite Token', border: OutlineInputBorder()),
                  enabled: !_busy,
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _verify,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _busy
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('CONTINUE'),
                ),
              ] else ...[
                Text('Welcome${_inviteeName != null ? ', $_inviteeName' : ''}!',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                const Text('Set a password to activate your account.', textAlign: TextAlign.center),
                const SizedBox(height: 20),
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'Password (min 8 chars)', border: OutlineInputBorder()),
                  obscureText: true, enabled: !_busy,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _confirmController,
                  decoration: const InputDecoration(labelText: 'Confirm Password', border: OutlineInputBorder()),
                  obscureText: true, enabled: !_busy,
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _accept,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _busy
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('ACTIVATE ACCOUNT'),
                ),
              ],
              const SizedBox(height: 8),
              TextButton(onPressed: _busy ? null : () => context.go('/login'), child: const Text('Back to Sign In')),
            ],
          ),
        ),
      ),
    );
  }
}
