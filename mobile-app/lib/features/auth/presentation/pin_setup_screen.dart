import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/repositories/auth_repository.dart';

/// Create / Forgot PIN wizard — mirrors the website's PinSetupPage against the
/// same backend endpoints, as one coherent flow:
///
///   identify (email/phone) -> OTP is sent -> verify OTP (authenticates) ->
///   enter + confirm the new PIN -> POST /auth/set-pin -> back to PIN login.
///
/// Both "Create PIN" (first time) and "Forgot PIN" (reset) use this exact
/// path — the only difference is wording. It never asks for an old PIN and
/// never bypasses OTP: identity is proven by the OTP login before the PIN is
/// set. The raw PIN is only held transiently in the fields; the server hashes
/// and stores it. On success we sign the transient OTP session back out and
/// return to PIN login, where the remembered identifier makes it PIN-only.
class PinSetupScreen extends ConsumerStatefulWidget {
  /// Labels only — the mechanism is identical for create vs. reset.
  final bool isReset;
  final String? initialIdentifier;
  const PinSetupScreen({super.key, this.isReset = false, this.initialIdentifier});

  @override
  ConsumerState<PinSetupScreen> createState() => _PinSetupScreenState();
}

enum _Step { identify, verify, choosePin }

class _PinSetupScreenState extends ConsumerState<PinSetupScreen> {
  late final TextEditingController _identifierController;
  final _otpController = TextEditingController();
  final _pinController = TextEditingController();
  final _confirmPinController = TextEditingController();

  _Step _step = _Step.identify;
  bool _busy = false;
  bool _done = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    _identifierController = TextEditingController(text: widget.initialIdentifier ?? '');
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _otpController.dispose();
    _pinController.dispose();
    _confirmPinController.dispose();
    super.dispose();
  }

  String get _title => widget.isReset ? 'Reset PIN' : 'Create PIN';

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

  Future<void> _sendCode() async {
    final identifier = _identifierController.text.trim();
    if (identifier.isEmpty) { setState(() => _error = 'Enter your email or phone number.'); return; }
    await _run(() async {
      await ref.read(authRepositoryProvider).requestOtp(identifier);
      if (mounted) {
        setState(() {
          _step = _Step.verify;
          _info = 'If an account exists for that identifier, a verification code has been sent.';
        });
      }
    });
  }

  Future<void> _verifyCode() async {
    final identifier = _identifierController.text.trim();
    final code = _otpController.text.trim();
    if (code.length != 6) { setState(() => _error = 'Enter the 6-digit code.'); return; }
    await _run(() async {
      // Verifying the OTP logs the user in — that authenticated session is what
      // authorises the set-pin call on the next step. No old PIN is ever asked.
      await ref.read(authRepositoryProvider).verifyOtp(identifier, code);
      if (mounted) setState(() { _step = _Step.choosePin; _info = null; });
    });
  }

  Future<void> _savePin() async {
    final pin = _pinController.text.trim();
    final confirm = _confirmPinController.text.trim();
    if (pin.length < 4 || pin.length > 6) { setState(() => _error = 'PIN must be 4-6 digits.'); return; }
    if (pin != confirm) { setState(() => _error = 'The two PINs do not match.'); return; }
    await _run(() async {
      final repo = ref.read(authRepositoryProvider);
      await repo.setPin(pin);
      // Return to a clean PIN login: sign the transient OTP session out so the
      // user completes a real PIN login with the PIN they just set. The
      // remembered identifier survives logout, so login is PIN-only.
      await repo.logout();
      if (mounted) setState(() { _done = true; _info = 'PIN saved. You can now sign in with your PIN.'; });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: _done ? _doneBody() : _wizardBody(),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _doneBody() => [
        const Icon(Icons.check_circle, color: Colors.green, size: 48),
        const SizedBox(height: 12),
        Text(_info ?? 'PIN saved.', textAlign: TextAlign.center),
        const SizedBox(height: 24),
        ElevatedButton(onPressed: () => context.go('/login'), child: const Text('GO TO PIN LOGIN')),
      ];

  List<Widget> _wizardBody() {
    return [
      Text(
        switch (_step) {
          _Step.identify => widget.isReset
              ? 'Verify your identity to reset your PIN'
              : 'Verify your identity to create a PIN',
          _Step.verify => 'Enter the verification code',
          _Step.choosePin => widget.isReset ? 'Choose a new PIN' : 'Choose your PIN',
        },
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 20),

      if (_step == _Step.identify) ...[
        TextField(
          controller: _identifierController,
          decoration: const InputDecoration(
            labelText: 'Email or Phone Number',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.person),
          ),
          keyboardType: TextInputType.emailAddress,
          enabled: !_busy,
          onSubmitted: (_) => _sendCode(),
        ),
      ],

      if (_step == _Step.verify) ...[
        TextField(
          controller: _otpController,
          decoration: const InputDecoration(
            labelText: 'Verification Code (6 digits)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.sms),
          ),
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          enabled: !_busy,
          onSubmitted: (_) => _verifyCode(),
        ),
      ],

      if (_step == _Step.choosePin) ...[
        TextField(
          controller: _pinController,
          decoration: const InputDecoration(
            labelText: 'New PIN (4-6 digits)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.dialpad),
          ),
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          enabled: !_busy,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _confirmPinController,
          decoration: const InputDecoration(
            labelText: 'Confirm PIN',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.dialpad),
          ),
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          enabled: !_busy,
          onSubmitted: (_) => _savePin(),
        ),
      ],

      if (_info != null)
        Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_info!, style: const TextStyle(color: Colors.green))),
      if (_error != null)
        Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),

      ElevatedButton(
        onPressed: _busy
            ? null
            : switch (_step) {
                _Step.identify => _sendCode,
                _Step.verify => _verifyCode,
                _Step.choosePin => _savePin,
              },
        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
        child: _busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(switch (_step) {
                _Step.identify => 'SEND CODE',
                _Step.verify => 'VERIFY',
                _Step.choosePin => 'SAVE PIN',
              }),
      ),
      const SizedBox(height: 8),
      if (_step == _Step.verify)
        TextButton(
          onPressed: _busy ? null : () => setState(() { _step = _Step.identify; _otpController.clear(); _info = null; }),
          child: const Text('Use a different email/phone'),
        ),
      TextButton(onPressed: _busy ? null : () => context.go('/login'), child: const Text('Back to Sign In')),
    ];
  }
}
