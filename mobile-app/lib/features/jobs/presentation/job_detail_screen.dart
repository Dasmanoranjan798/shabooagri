import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/info_row.dart';
import '../data/job_actions_repository.dart';
import '../data/job_detail.dart';

final jobDetailLiveProvider = FutureProvider.family<JobDetail, String>((ref, id) async {
  return ref.watch(jobActionsRepositoryProvider).getById(id);
});

class JobDetailScreen extends ConsumerStatefulWidget {
  final String jobId;

  const JobDetailScreen({super.key, required this.jobId});

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen> {
  Timer? _ticker;
  bool _acting = false;

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _ensureTicker(String status) {
    if (status == 'WORKING') {
      _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    } else {
      _ticker?.cancel();
      _ticker = null;
    }
  }

  void _refresh() => ref.invalidate(jobDetailLiveProvider(widget.jobId));

  Future<void> _runAction(Future<void> Function() action) async {
    if (_acting) return;
    setState(() => _acting = true);
    try {
      await action();
      _refresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handleStart() async {
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.start(widget.jobId));
  }

  /// A booking is created with pricing unset (matches the backend: it's
  /// deliberately picked "right before Start", not at booking time), so
  /// this has to run before Start becomes possible — `start()` 400s
  /// server-side ("Set a pricing method and rate before starting this
  /// job") without it.
  Future<void> _handleSetPricing(String bookingId) async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => const _SetPricingDialog(),
    );
    if (result == null) return;
    final pricingMethodId = result['pricingMethodId'];
    final rate = double.tryParse(result['rate'] ?? '');
    if (pricingMethodId == null || rate == null || rate < 0) return;

    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/bookings/$bookingId/pricing', data: {'pricingMethodId': pricingMethodId, 'rate': rate});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handlePause() async {
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.pause(widget.jobId));
  }

  Future<void> _handleResume() async {
    final reason = await _showResumeReasonDialog();
    if (reason == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.resume(widget.jobId, reason));
  }

  Future<void> _handleStop() async {
    final confirmed = await _showConfirmDialog(
      title: 'Stop this job?',
      body: 'The work will be marked as finished. Make sure the machine has actually stopped working in the field.',
      note: '⏱ Counter keeps running until you confirm',
      cancelLabel: 'No, Continue',
      confirmLabel: 'Yes, Stop',
    );
    if (confirmed != true) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.stop(widget.jobId));
  }

  Future<void> _handleSubmit() async {
    final confirmed = await _showConfirmDialog(
      title: 'Submit this job?',
      body: 'Once submitted, this job cannot be changed by a Manager or Driver. Only the Owner can edit it after this point.',
      cancelLabel: 'No, Wait',
      confirmLabel: 'Yes, Submit',
      confirmColor: Colors.red,
    );
    if (confirmed != true) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.submit(widget.jobId));
  }

  Future<void> _handleCancel() async {
    final reason = await _showTextInputDialog(
      title: 'Cancel this job?',
      label: 'Reason (optional)',
      confirmLabel: 'Cancel Job',
      confirmColor: Colors.red,
      requireNonEmpty: false,
    );
    if (reason == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.cancel(widget.jobId, reason: reason));
  }

  Future<void> _handleAddFuel() async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => const _AddFuelDialog(),
    );
    if (result == null) return;
    final litres = double.tryParse(result['litres'] ?? '');
    if (litres == null || litres <= 0) return;
    final cost = double.tryParse(result['cost'] ?? '');
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.addFuelEntry(widget.jobId, litres, cost));
  }

  Future<void> _handleAddPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(children: [
          ListTile(
            leading: const Icon(Icons.camera_alt),
            title: const Text('Take Photo'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library),
            title: const Text('Choose from Gallery'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (source == null) return;

    final picked = await ImagePicker().pickImage(source: source, imageQuality: 80);
    if (picked == null) return;

    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() async {
      await repo.addPhoto(widget.jobId, picked.path);
      _refresh();
    });
  }

  Future<void> _handleAddNote() async {
    final job = ref.read(jobDetailLiveProvider(widget.jobId)).valueOrNull;
    final note = await _showTextInputDialog(
      title: 'Add Note',
      label: 'Note',
      initialValue: job?.notes,
      confirmLabel: 'Save',
      requireNonEmpty: true,
    );
    if (note == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.updateNotes(widget.jobId, note));
  }

  Future<String?> _showResumeReasonDialog() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Why the delay?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                children: ['Machine breakdown', 'Lunch break', 'Rain'].map((chip) {
                  return ActionChip(
                    label: Text(chip),
                    onPressed: () {
                      controller.text = chip;
                      setDialogState(() {});
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(labelText: 'Reason to Resume *', border: OutlineInputBorder()),
                onChanged: (_) => setDialogState(() {}),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: controller.text.trim().isEmpty ? null : () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Confirm & Resume'),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool?> _showConfirmDialog({
    required String title,
    required String body,
    String? note,
    required String cancelLabel,
    required String confirmLabel,
    Color? confirmColor,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(body),
            if (note != null) ...[
              const SizedBox(height: 12),
              Text(note, style: const TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
            ],
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(cancelLabel)),
          ElevatedButton(
            style: confirmColor != null ? ElevatedButton.styleFrom(backgroundColor: confirmColor) : null,
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }

  Future<String?> _showTextInputDialog({
    required String title,
    required String label,
    String? initialValue,
    required String confirmLabel,
    Color? confirmColor,
    required bool requireNonEmpty,
  }) {
    final controller = TextEditingController(text: initialValue);
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(title),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
            maxLines: 3,
            autofocus: true,
            onChanged: (_) => setDialogState(() {}),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              style: confirmColor != null ? ElevatedButton.styleFrom(backgroundColor: confirmColor) : null,
              onPressed: requireNonEmpty && controller.text.trim().isEmpty
                  ? null
                  : () => Navigator.pop(context, controller.text.trim()),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ),
    );
  }

  String _formatHms(int totalSeconds) {
    final h = (totalSeconds ~/ 3600).toString().padLeft(2, '0');
    final m = ((totalSeconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final jobAsync = ref.watch(jobDetailLiveProvider(widget.jobId));
    final user = ref.watch(currentUserProvider);
    final isOwnerOrManager = user?.isOwnerOrManager ?? false;
    final isOwner = user?.roleSystemKey == 'owner';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/jobs'),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: jobAsync.when(
        data: (job) {
          _ensureTicker(job.status);
          final elapsedSec = job.status == 'WORKING' ? job.elapsedSecondsNow() : null;
          final liveAmount = elapsedSec != null ? job.liveAmountFor(elapsedSec) : null;

          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                InfoRow('Booking', job.bookingNumber),
                InfoRow('Customer', job.customerName),
                InfoRow('Village', job.villageName),
                if (job.machineRegistration != null) InfoRow('Machine', job.machineRegistration!),
                if (job.driverName != null) InfoRow('Driver', job.driverName!),
                const Divider(height: 32),
                _buildTimerCard(job, elapsedSec, liveAmount),
                const SizedBox(height: 24),
                if (job.notes != null && job.notes!.isNotEmpty) ...[
                  InfoRow('Notes', job.notes!),
                  const SizedBox(height: 16),
                ],
                _buildActionButtons(job, isOwnerOrManager, isOwner),
                if (isOwnerOrManager && !['COMPLETED', 'CANCELLED'].contains(job.status)) ...[
                  const Divider(height: 32),
                  _buildQuickActions(job),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }

  Widget _buildTimerCard(JobDetail job, int? elapsedSec, double? liveAmount) {
    final isLocked = job.status == 'STOPPED' || job.status == 'COMPLETED';
    final displaySeconds = elapsedSec ??
        (job.actualHours != null ? (job.actualHours! * 3600).round() : job.elapsedSecondsNow());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Text(
              isLocked ? 'FINAL TIME — LOCKED' : 'ELAPSED TIME',
              style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            Text(
              _formatHms(displaySeconds),
              style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, fontFeatures: [FontFeature.tabularFigures()]),
            ),
            if (liveAmount != null) ...[
              const SizedBox(height: 12),
              Text('₹${liveAmount.toStringAsFixed(0)} — updates live', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ] else if (job.rate != null && job.pricingLabel != null) ...[
              const SizedBox(height: 12),
              Text('${job.pricingLabel}: ₹${job.rate!.toStringAsFixed(0)}', style: const TextStyle(color: Colors.grey)),
            ],
            if (job.status == 'PAUSED')
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('PAUSED', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(JobDetail job, bool isOwnerOrManager, bool isOwner) {
    switch (job.status) {
      case 'NOT_STARTED':
        if (job.rate == null) {
          return _primaryButton('Set Pricing', Colors.blue, _acting ? null : () => _handleSetPricing(job.bookingId));
        }
        return _primaryButton('▶ Start', Colors.green, _acting ? null : _handleStart);
      case 'WORKING':
        return Column(children: [
          _primaryButton('⏸ Pause', Colors.orange, _acting ? null : _handlePause),
          const SizedBox(height: 12),
          _primaryButton('Stop', Colors.red, _acting ? null : _handleStop),
        ]);
      case 'PAUSED':
        return Column(children: [
          _primaryButton('▶ Start', Colors.green, _acting ? null : _handleResume),
          const SizedBox(height: 12),
          _primaryButton('Stop', Colors.red, _acting ? null : _handleStop),
        ]);
      case 'STOPPED':
        return Column(children: [
          _primaryButton('Submit', Colors.red, _acting ? null : _handleSubmit),
          if (isOwner) ...[
            const SizedBox(height: 12),
            TextButton(onPressed: _acting ? null : _handleCancel, child: const Text('Cancel Job', style: TextStyle(color: Colors.red))),
          ],
        ]);
      case 'COMPLETED':
        return const Center(
          child: Text('Job Completed & Submitted',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
        );
      case 'CANCELLED':
        return const Center(
          child: Text('Job Cancelled', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey)),
        );
      default:
        if (isOwner && job.status != 'COMPLETED' && job.status != 'CANCELLED') {
          return TextButton(onPressed: _acting ? null : _handleCancel, child: const Text('Cancel Job', style: TextStyle(color: Colors.red)));
        }
        return const SizedBox.shrink();
    }
  }

  Widget _buildQuickActions(JobDetail job) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        OutlinedButton.icon(onPressed: _acting ? null : _handleAddFuel, icon: const Icon(Icons.local_gas_station), label: const Text('Add Fuel')),
        OutlinedButton.icon(onPressed: _acting ? null : _handleAddPhoto, icon: const Icon(Icons.camera_alt), label: const Text('Add Photo')),
        OutlinedButton.icon(onPressed: _acting ? null : _handleAddNote, icon: const Icon(Icons.note_add), label: const Text('Add Note')),
      ],
    );
  }

  Widget _primaryButton(String label, Color color, VoidCallback? onPressed) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: color, padding: const EdgeInsets.symmetric(vertical: 16)),
        onPressed: onPressed,
        child: Text(label, style: const TextStyle(fontSize: 16, color: Colors.white)),
      ),
    );
  }
}

class _SetPricingDialog extends ConsumerStatefulWidget {
  const _SetPricingDialog();

  @override
  ConsumerState<_SetPricingDialog> createState() => _SetPricingDialogState();
}

class _SetPricingDialogState extends ConsumerState<_SetPricingDialog> {
  final _rateController = TextEditingController();
  String? _pricingMethodId;

  @override
  void dispose() {
    _rateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final methodsAsync = ref.watch(_pricingMethodsProvider);
    return AlertDialog(
      title: const Text('Set Pricing'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          methodsAsync.when(
            data: (methods) => DropdownButtonFormField<String>(
              initialValue: _pricingMethodId,
              decoration: const InputDecoration(labelText: 'Pricing Method *', border: OutlineInputBorder()),
              items: methods.map((m) => DropdownMenuItem(value: m['id'] as String, child: Text(m['label'] as String))).toList(),
              onChanged: (value) => setState(() => _pricingMethodId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load pricing methods: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rateController,
            decoration: const InputDecoration(labelText: 'Rate *', border: OutlineInputBorder(), prefixText: '₹ '),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _pricingMethodId == null
              ? null
              : () => Navigator.pop(context, {'pricingMethodId': _pricingMethodId!, 'rate': _rateController.text}),
          child: const Text('Save'),
        ),
      ],
    );
  }
}

final _pricingMethodsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/pricing-methods');
  return (response.data as List<dynamic>).cast<Map<String, dynamic>>();
});

class _AddFuelDialog extends StatefulWidget {
  const _AddFuelDialog();

  @override
  State<_AddFuelDialog> createState() => _AddFuelDialogState();
}

class _AddFuelDialogState extends State<_AddFuelDialog> {
  final _litresController = TextEditingController();
  final _costController = TextEditingController();

  @override
  void dispose() {
    _litresController.dispose();
    _costController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Fuel Entry'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _litresController,
            decoration: const InputDecoration(labelText: 'Litres *', border: OutlineInputBorder()),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _costController,
            decoration: const InputDecoration(labelText: 'Cost (optional)', border: OutlineInputBorder(), prefixText: '₹ '),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, {'litres': _litresController.text, 'cost': _costController.text}),
          child: const Text('Save'),
        ),
      ],
    );
  }
}
