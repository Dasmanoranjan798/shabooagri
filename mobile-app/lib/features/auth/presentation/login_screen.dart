import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/services/update_service.dart';

enum _LoginMode { password, pin, otp }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pinController = TextEditingController();
  final _otpController = TextEditingController();

  _LoginMode _mode = _LoginMode.password;
  bool _busy = false;
  bool _otpSent = false;
  String? _errorText;
  String? _infoText;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(updateServiceProvider).checkForUpdates(context);
    });
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _pinController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _switchMode(_LoginMode m) {
    setState(() {
      _mode = m;
      _errorText = null;
      _infoText = null;
      _otpSent = false;
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _errorText = null;
    });
    try {
      await action();
    } catch (e) {
      if (mounted) setState(() => _errorText = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    final identifier = _identifierController.text.trim();
    if (identifier.isEmpty) {
      setState(() => _errorText = 'Enter your email or phone number.');
      return;
    }
    final repo = ref.read(authRepositoryProvider);

    switch (_mode) {
      case _LoginMode.password:
        if (_passwordController.text.isEmpty) {
          setState(() => _errorText = 'Enter your password.');
          return;
        }
        await _run(() async {
          final user = await repo.login(identifier, _passwordController.text);
          if (mounted) context.go(user.homeRoute);
        });
        break;
      case _LoginMode.pin:
        if (_pinController.text.trim().length < 4) {
          setState(() => _errorText = 'Enter your 4-6 digit PIN.');
          return;
        }
        await _run(() async {
          final user = await repo.loginWithPin(identifier, _pinController.text.trim());
          if (mounted) context.go(user.homeRoute);
        });
        break;
      case _LoginMode.otp:
        if (!_otpSent) {
          await _run(() async {
            await repo.requestOtp(identifier);
            if (mounted) {
              setState(() {
                _otpSent = true;
                _infoText = 'A verification code has been sent.';
              });
            }
          });
        } else {
          if (_otpController.text.trim().length != 6) {
            setState(() => _errorText = 'Enter the 6-digit code.');
            return;
          }
          await _run(() async {
            final user = await repo.verifyOtp(identifier, _otpController.text.trim());
            if (mounted) context.go(user.homeRoute);
          });
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ShabooAgri')),
      body: Center(
        child: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Sign In',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                const SizedBox(height: 24),
                SegmentedButton<_LoginMode>(
                  segments: const [
                    ButtonSegment(value: _LoginMode.password, label: Text('Password')),
                    ButtonSegment(value: _LoginMode.pin, label: Text('PIN')),
                    ButtonSegment(value: _LoginMode.otp, label: Text('OTP')),
                  ],
                  selected: {_mode},
                  onSelectionChanged: _busy ? null : (s) => _switchMode(s.first),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _identifierController,
                  decoration: const InputDecoration(
                    labelText: 'Email or Phone Number',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_busy && !(_mode == _LoginMode.otp && _otpSent),
                ),
                const SizedBox(height: 16),
                if (_mode == _LoginMode.password)
                  TextField(
                    controller: _passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Password', border: OutlineInputBorder(), prefixIcon: Icon(Icons.lock)),
                    obscureText: true,
                    enabled: !_busy,
                    onSubmitted: (_) => _submit(),
                  ),
                if (_mode == _LoginMode.pin)
                  TextField(
                    controller: _pinController,
                    decoration: const InputDecoration(
                      labelText: 'PIN (4-6 digits)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.dialpad)),
                    obscureText: true,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    enabled: !_busy,
                    onSubmitted: (_) => _submit(),
                  ),
                if (_mode == _LoginMode.otp && _otpSent)
                  TextField(
                    controller: _otpController,
                    decoration: const InputDecoration(
                      labelText: 'Verification Code (6 digits)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.sms)),
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    enabled: !_busy,
                    onSubmitted: (_) => _submit(),
                  ),
                if (_infoText != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_infoText!, style: const TextStyle(color: Colors.green)),
                  ),
                if (_errorText != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_errorText!, style: const TextStyle(color: Colors.red)),
                  ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _busy
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(
                          _mode == _LoginMode.otp && !_otpSent ? 'SEND CODE' : 'LOGIN',
                          style: const TextStyle(fontSize: 16)),
                ),
                const SizedBox(height: 8),
                if (_mode == _LoginMode.password)
                  TextButton(
                    onPressed: _busy ? null : () => context.push('/reset-password'),
                    child: const Text('Forgot password?'),
                  ),
                if (_mode == _LoginMode.otp && _otpSent)
                  TextButton(
                    onPressed: _busy ? null : () => setState(() { _otpSent = false; _otpController.clear(); _infoText = null; }),
                    child: const Text('Use a different email/phone'),
                  ),
              ],
            ),
          ),
          ),
        ),
      ),
    );
  }
}
