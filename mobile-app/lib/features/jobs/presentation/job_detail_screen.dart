import '../../../core/widgets/status_badge.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/theme/app_theme.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';
import '../data/job_actions_repository.dart';
import '../data/job_detail.dart';
import '../data/job_execution_models.dart';

final jobDetailLiveProvider = FutureProvider.family<JobDetail, String>((ref, id) async {
  syncOn(ref, {SyncEntity.job});
  return ref.watch(jobActionsRepositoryProvider).getById(id);
});

/// Bundled Job Execution V2 history — work sessions, assignment-change audit,
/// and transportation charges — the authoritative data behind the timeline,
/// per-resource attribution, and the final breakdown. Invalidated by the same
/// 5s reconcile poll as the job itself (see _refresh), so another device's
/// pause/reassign/transport edits reconcile here too.
class JobHistory {
  final List<JobWorkSession> sessions;
  final List<JobAssignmentChange> changes;
  final List<JobTransportCharge> transport;
  const JobHistory(this.sessions, this.changes, this.transport);

  double get transportTotal => transport.fold(0.0, (s, c) => s + c.totalAmount);
}

final jobHistoryProvider = FutureProvider.family<JobHistory, String>((ref, id) async {
  syncOn(ref, {SyncEntity.job});
  final repo = ref.watch(jobActionsRepositoryProvider);
  final results = await Future.wait([
    repo.listWorkSessions(id),
    repo.listAssignmentChanges(id),
    repo.listTransportCharges(id),
  ]);
  return JobHistory(
    results[0] as List<JobWorkSession>,
    results[1] as List<JobAssignmentChange>,
    results[2] as List<JobTransportCharge>,
  );
});

final _transportTypesProvider = FutureProvider<List<TransportType>>((ref) async {
  return ref.watch(jobActionsRepositoryProvider).listTransportTypes();
});
final _machinesProvider = FutureProvider<List<ResourceOption>>((ref) async {
  return ref.watch(jobActionsRepositoryProvider).listMachines();
});
final _driversProvider = FutureProvider<List<ResourceOption>>((ref) async {
  return ref.watch(jobActionsRepositoryProvider).listDrivers();
});

/// Only fetched while STOPPED (the one state the missing-photo/missing-fuel
/// warning banners apply to) — see `_buildActionButtons`'s STOPPED case.
final _jobFuelCountProvider = FutureProvider.family<int, String>((ref, id) async {
  syncOn(ref, {SyncEntity.job, SyncEntity.fuel});
  return ref.watch(jobActionsRepositoryProvider).countFuelEntries(id);
});

final _jobPhotoCountProvider = FutureProvider.family<int, String>((ref, id) async {
  syncOn(ref, {SyncEntity.job});
  return ref.watch(jobActionsRepositoryProvider).countPhotos(id);
});

class JobDetailScreen extends ConsumerStatefulWidget {
  final String jobId;

  const JobDetailScreen({super.key, required this.jobId});

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen> with SingleTickerProviderStateMixin {
  Timer? _ticker;
  Timer? _poll;
  late AnimationController _pulseController;
  late Animation<double> _animation;
  bool _acting = false;
  final _acresController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.2, end: 1.0).animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _poll?.cancel();
    _pulseController.dispose();
    _acresController.dispose();
    super.dispose();
  }

  /// Non-terminal statuses can still be changed by *another* device
  /// (Owner/Manager/Driver on their own phone). While the job is in any of
  /// these states this screen must keep reconciling against the authoritative
  /// server state; once COMPLETED/CANCELLED the state is frozen and there is
  /// nothing left to reconcile.
  static const _liveStatuses = {'NOT_STARTED', 'WORKING', 'PAUSED', 'STOPPED'};

  /// Drives two independent timers off the authoritative status:
  ///
  ///  * the 1-second **render** tick — only while WORKING, purely so the
  ///    locally-derived elapsed counter (recomputed from the server's
  ///    `startTime`, never an independent stopwatch) advances smoothly;
  ///
  ///  * the 5-second **poll** — while the job is in any non-terminal state,
  ///    re-fetches `GET /jobs/:id` so a transition made on another device
  ///    (Start/Pause/Resume/Stop/Submit) is reflected here automatically with
  ///    no manual refresh. Because every control, badge and the timer freeze
  ///    are driven by `job.status`, reconciling the fetched status updates the
  ///    whole screen; if another device completes/stops the job, the WORKING
  ///    render tick is cancelled here on the next poll and the timer freezes at
  ///    the authoritative final duration. Riverpod keeps the previous data on
  ///    screen during the refetch (skipLoadingOnRefresh), so there is no
  ///    spinner flash.
  void _syncTimers(String status) {
    if (status == 'WORKING') {
      _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    } else {
      _ticker?.cancel();
      _ticker = null;
    }

    if (_liveStatuses.contains(status)) {
      _poll ??= Timer.periodic(const Duration(seconds: 5), (_) {
        // Don't fight an action that's mid-flight; it refreshes on completion.
        if (mounted && !_acting) _refresh();
      });
    } else {
      _poll?.cancel();
      _poll = null;
    }
  }

  void _refresh() {
    ref.invalidate(jobDetailLiveProvider(widget.jobId));
    ref.invalidate(jobHistoryProvider(widget.jobId));
  }

  Future<void> _navigate(JobDetail job) async {
    final query = job.location ?? job.villageName;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _runAction(Future<void> Function() action) async {
    if (_acting) return;
    setState(() => _acting = true);
    try {
      await action();
      _refresh();
    } catch (e) {
      // Always reconcile against the authoritative server state after a failed
      // action — most importantly when another device changed the job first
      // (a stale Start/Pause/Resume/Stop the backend safely rejected). Without
      // this the screen would keep showing the contradictory stale state.
      _refresh();
      if (mounted) {
        final message = isJobStateConflict(e)
            ? 'This job was updated by another user. The latest job status has been loaded.'
            : apiErrorMessage(e);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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
    // Optional minimum billable floor (§8.2). Blank -> null (clears any floor);
    // the backend applies the authoritative max(metered, minimumCharge).
    final minText = (result['minimumCharge'] ?? '').trim();
    final minimumCharge = minText.isEmpty ? null : double.tryParse(minText);

    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/bookings/$bookingId/pricing',
          data: {'pricingMethodId': pricingMethodId, 'rate': rate, 'minimumCharge': minimumCharge});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handlePause() async {
    final reason = await _showReasonDialog(
      title: 'Why are you pausing?',
      label: 'Pause reason *',
      quickOptions: const [
        'Customer requested pause',
        'Weather',
        'Machine issue',
        'Driver issue',
        'Field/access problem',
        'Waiting for customer',
        'Work postponed',
      ],
      confirmLabel: 'Confirm & Pause',
      helper: 'Pausing releases the machine and driver for other jobs. The elapsed time is preserved.',
    );
    if (reason == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.pause(widget.jobId, reason));
  }

  Future<void> _handleResume() async {
    final reason = await _showReasonDialog(
      title: 'Why the delay?',
      label: 'Reason to Resume *',
      quickOptions: const ['Machine breakdown', 'Lunch break', 'Rain'],
      confirmLabel: 'Confirm & Resume',
    );
    if (reason == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.resume(widget.jobId, reason));
  }

  Future<void> _handleChangeMachine() async {
    final machines = await ref.read(_machinesProvider.future);
    final job = ref.read(jobDetailLiveProvider(widget.jobId)).valueOrNull;
    final options = machines.where((m) => m.id != job?.machineId).toList();
    final result = await _showReassignDialog(
      title: 'Change Machine',
      currentLabel: job?.machineRegistration ?? '—',
      options: options,
      quickReasons: const [
        'Machine breakdown',
        'Machine unavailable',
        'Maintenance',
        'Machine reassigned',
        'Customer requested machine change',
        'Emergency',
      ],
    );
    if (result == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.changeMachine(widget.jobId, result.$1, result.$2));
  }

  Future<void> _handleChangeDriver() async {
    final drivers = await ref.read(_driversProvider.future);
    final job = ref.read(jobDetailLiveProvider(widget.jobId)).valueOrNull;
    final options = drivers.where((d) => d.id != job?.driverId).toList();
    final result = await _showReassignDialog(
      title: 'Change Driver',
      currentLabel: job?.driverName ?? '—',
      options: options,
      quickReasons: const [
        'Driver unavailable',
        'Driver reassigned',
        'Driver illness',
        'Customer requested driver change',
        'Emergency',
      ],
    );
    if (result == null) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.changeDriver(widget.jobId, result.$1, result.$2));
  }

  Future<void> _handleAddTransport() async {
    final types = await ref.read(_transportTypesProvider.future);
    if (!mounted) return;
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => _AddTransportDialog(types: types),
    );
    if (result == null) return;
    final typeId = result['transportTypeId'];
    final trips = int.tryParse(result['trips'] ?? '');
    final rate = double.tryParse(result['ratePerTrip'] ?? '');
    if (typeId == null || trips == null || trips <= 0 || rate == null || rate < 0) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.addTransportCharge(widget.jobId, typeId, trips, rate));
  }

  Future<void> _handleDeleteTransport(String chargeId) async {
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.deleteTransportCharge(widget.jobId, chargeId));
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

  Future<void> _handleSubmit({double? completedAcres}) async {
    final confirmed = await _showConfirmDialog(
      title: 'Submit this job?',
      body: 'Once submitted, this job cannot be changed by a Manager or Driver. Only the Owner can edit it after this point.',
      cancelLabel: 'No, Wait',
      confirmLabel: 'Yes, Submit',
      confirmColor: Colors.red,
    );
    if (confirmed != true) return;
    final repo = ref.read(jobActionsRepositoryProvider);
    await _runAction(() => repo.submit(widget.jobId, completedAcres: completedAcres));
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

  /// Shared reason prompt (quick-pick chips + free text). Used by Pause and
  /// Resume — a non-empty reason is required, matching the backend. "Other" is
  /// simply free text, so no special-casing is needed here.
  Future<String?> _showReasonDialog({
    required String title,
    required String label,
    required List<String> quickOptions,
    required String confirmLabel,
    String? helper,
  }) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  children: quickOptions.map((chip) {
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
                  decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
                  onChanged: (_) => setDialogState(() {}),
                  autofocus: true,
                ),
                if (helper != null) ...[
                  const SizedBox(height: 8),
                  Text(helper, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: controller.text.trim().isEmpty ? null : () => Navigator.pop(context, controller.text.trim()),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ),
    );
  }

  /// Machine/Driver reassignment prompt: pick a new resource + mandatory
  /// reason. Returns (newId, reason). Shows the current assignment for context.
  Future<(String, String)?> _showReassignDialog({
    required String title,
    required String currentLabel,
    required List<ResourceOption> options,
    required List<String> quickReasons,
  }) {
    final reasonController = TextEditingController();
    String? selectedId;
    return showDialog<(String, String)>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current: $currentLabel', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                const SizedBox(height: 12),
                if (options.isEmpty)
                  const Text('No other resources available.', style: TextStyle(color: Colors.red))
                else
                  DropdownButtonFormField<String>(
                    initialValue: selectedId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'New *', border: OutlineInputBorder()),
                    items: options.map((o) => DropdownMenuItem(value: o.id, child: Text(o.label))).toList(),
                    onChanged: (v) => setDialogState(() => selectedId = v),
                  ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: quickReasons.map((chip) {
                    return ActionChip(
                      label: Text(chip),
                      onPressed: () {
                        reasonController.text = chip;
                        setDialogState(() {});
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(labelText: 'Reason *', border: OutlineInputBorder()),
                  onChanged: (_) => setDialogState(() {}),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: (selectedId == null || reasonController.text.trim().isEmpty)
                  ? null
                  : () => Navigator.pop(context, (selectedId!, reasonController.text.trim())),
              child: const Text('Confirm'),
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
    final history = ref.watch(jobHistoryProvider(widget.jobId)).valueOrNull;
    final user = ref.watch(currentUserProvider);
    final isOwnerOrManager = user?.isOwnerOrManager ?? false;
    final isOwner = user?.roleSystemKey == 'owner';

    final content = jobAsync.when(
        data: (job) {
          _syncTimers(job.status);
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
                if (job.machineRegistration != null) Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Machine', style: TextStyle(color: AppTheme.textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
                      Row(
                        children: [
                          Text(job.machineRegistration!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                          const SizedBox(width: 8),
                          if (job.status == 'WORKING') MachineStatusBadge(status: 'WORKING'),
                        ],
                      ),
                    ],
                  ),
                ),
                if (job.driverName != null) Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Driver', style: TextStyle(color: AppTheme.textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
                      Row(
                        children: [
                          Text(job.driverName!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                          const SizedBox(width: 8),
                          if (job.status == 'WORKING') DriverStatusBadge(status: 'WORKING'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => _navigate(job),
                  icon: const Icon(Icons.directions, size: 18),
                  label: const Text('Navigate'),
                ),
                const Divider(height: 32),
                _buildTimerCard(job, elapsedSec, liveAmount),
                const SizedBox(height: 24),
                if (job.notes != null && job.notes!.isNotEmpty) ...[
                  InfoRow('Notes', job.notes!),
                  const SizedBox(height: 16),
                ],
                if (job.status == 'COMPLETED') ...[
                  _buildCompletionGrid(job, displaySeconds: job.actualHours != null ? (job.actualHours! * 3600).round() : 0),
                  if (history != null && history.transport.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildFinalBreakdown(job, history),
                  ],
                  const SizedBox(height: 16),
                  const Card(
                    color: Color(0xFFF5F5F5),
                    child: Padding(
                      padding: EdgeInsets.all(12.0),
                      child: Text(
                        'This is now locked. Only the Owner can edit or void it — Manager/Driver view only from here.',
                        style: TextStyle(fontSize: 12, color: Colors.black87),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                // Transportation editor — shown during finalization (STOPPED),
                // before Submit. Optional; server computes the authoritative total.
                if (job.status == 'STOPPED') ...[
                  _buildTransportSection(job, history, editable: true),
                  const SizedBox(height: 16),
                ],
                _buildActionButtons(job, isOwnerOrManager, isOwner),
                if (isOwnerOrManager && !['COMPLETED', 'CANCELLED'].contains(job.status)) ...[
                  const Divider(height: 32),
                  _buildQuickActions(job),
                ],
                if (history != null && history.sessions.isNotEmpty) ...[
                  const Divider(height: 32),
                  _buildTimeline(job, history),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      );

    // Owner/Manager get the desktop shell (persistent sidebar) on wide windows;
    // drivers keep the phone layout everywhere (no owner sidebar).
    if (isOwnerOrManager) {
      return AdaptiveScaffold(
        currentRoute: '/jobs',
        title: 'Job Details',
        showBack: true,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh)],
        body: content,
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go((user?.isDriver ?? false) ? '/driver' : '/jobs'),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: content,
    );
  }

  Widget _buildTimerCard(JobDetail job, int? displaySeconds, double? liveAmount) {
    final isLocked = job.status == 'COMPLETED' || job.status == 'CANCELLED';
    if (displaySeconds == null && !isLocked) return const SizedBox.shrink();
    displaySeconds ??= 0;
    
    final timerColor = job.status == 'WORKING' ? AppTheme.primary : 
                       job.status == 'PAUSED' ? AppTheme.warning : 
                       job.status == 'COMPLETED' ? AppTheme.success : AppTheme.textMuted;

    return Card(
      color: timerColor.withValues(alpha: 0.05),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: timerColor.withValues(alpha: 0.3), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (job.status == 'WORKING') ...[
                   FadeTransition(
                     opacity: _animation,
                     child: Icon(Icons.circle, color: AppTheme.primary, size: 12),
                   ),
                   const SizedBox(width: 8),
                ],
                Text(
                  isLocked ? 'FINAL TIME — LOCKED' : 'ELAPSED TIME',
                  style: TextStyle(fontSize: 12, color: timerColor, fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              _formatHms(displaySeconds),
              style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: AppTheme.text, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
            if (liveAmount != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: Text('₹${liveAmount.toStringAsFixed(0)} — updates live', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
              )
            ] else if (job.rate != null && job.pricingLabel != null) ...[
              const SizedBox(height: 12),
              Text('${job.pricingLabel}: ₹${job.rate!.toStringAsFixed(0)}', style: TextStyle(color: AppTheme.textMuted)),
            ],
            if (job.status == 'PAUSED')
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: JobStatusBadge(status: 'PAUSED'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletionGrid(JobDetail job, {required int displaySeconds}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: _gridItem('Customer', job.customerName)),
              Expanded(child: _gridItem('Village', job.villageName)),
            ]),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _gridItem('Duration', _formatHms(displaySeconds))),
              Expanded(
                child: _gridItem(
                  'Rate',
                  job.rate != null ? '₹${job.rate!.toStringAsFixed(0)}${job.pricingUnit != null ? '/${job.pricingUnit}' : ''}' : '—',
                ),
              ),
            ]),
            const SizedBox(height: 16),
            _gridItem(
              'Total',
              job.finalAmount != null ? '₹${job.finalAmount!.toStringAsFixed(2)}' : '—',
              valueStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _gridItem(String label, String value, {TextStyle? valueStyle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: valueStyle ?? const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      ],
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
          // Reassignment is only offered while PAUSED (resources released) and
          // only to authorised Owner/Manager users. The new resource stays idle
          // until Resume, which re-checks availability on the backend.
          if (isOwnerOrManager) ...[
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _acting ? null : _handleChangeMachine,
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: const Text('Change Machine'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _acting ? null : _handleChangeDriver,
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: const Text('Change Driver'),
                ),
              ),
            ]),
          ],
        ]);
      case 'STOPPED':
        return _buildStoppedActions(job, isOwner);
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

  /// Mirrors `JobExecutionModal.tsx`'s STOPPED block: an inline Completed
  /// Acres input for acre-priced jobs, proactive missing-photo/missing-fuel
  /// banners driven by the company's `requireJobPhoto`/`requireJobFuelLog`
  /// settings (rather than only surfacing the backend's generic rejection
  /// after the user taps Submit), and Submit disabled until all three are
  /// satisfied.
  Widget _buildStoppedActions(JobDetail job, bool isOwner) {
    final companyAsync = ref.watch(companyProfileProvider);
    final fuelCountAsync = ref.watch(_jobFuelCountProvider(widget.jobId));
    final photoCountAsync = ref.watch(_jobPhotoCountProvider(widget.jobId));

    final company = companyAsync.valueOrNull;
    final missingPhoto = (company?.requireJobPhoto ?? false) && (photoCountAsync.valueOrNull ?? 1) == 0;
    final missingFuel = (company?.requireJobFuelLog ?? false) && (fuelCountAsync.valueOrNull ?? 1) == 0;
    final isAcrePriced = job.pricingUnit == 'acre';
    final acres = double.tryParse(_acresController.text.trim());
    final missingAcres = isAcrePriced && (acres == null || acres <= 0);
    final stillLoading = companyAsync.isLoading || fuelCountAsync.isLoading || photoCountAsync.isLoading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isAcrePriced)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TextField(
              controller: _acresController,
              decoration: const InputDecoration(labelText: 'Completed Acres *', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
          ),
        if (missingPhoto)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: _WarningBanner(icon: Icons.camera_alt, text: 'A completion photo is required before submitting this job.'),
          ),
        if (missingFuel)
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: _WarningBanner(icon: Icons.local_gas_station, text: 'A fuel-log entry is required before submitting this job.'),
          ),
        _primaryButton(
          'Submit',
          Colors.red,
          (_acting || stillLoading || missingPhoto || missingFuel || missingAcres)
              ? null
              : () => _handleSubmit(completedAcres: acres),
        ),
        if (isOwner) ...[
          const SizedBox(height: 12),
          TextButton(onPressed: _acting ? null : _handleCancel, child: const Text('Cancel Job', style: TextStyle(color: Colors.red))),
        ],
      ],
    );
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

  String _formatClock(DateTime dt) {
    final l = dt.toLocal();
    final h = l.hour.toString().padLeft(2, '0');
    final m = l.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String _durWords(int sec) {
    final h = sec ~/ 3600;
    final m = (sec % 3600) ~/ 60;
    return '${h}h ${m}m';
  }

  // Transportation — optional, structured, separate from the work timer. The
  // server computes each charge's total (trips × rate); the client only lists
  // and sums the authoritative values.
  Widget _buildTransportSection(JobDetail job, JobHistory? history, {required bool editable}) {
    final charges = history?.transport ?? const [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Transportation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                if (editable)
                  TextButton.icon(
                    onPressed: _acting ? null : _handleAddTransport,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add'),
                  ),
              ],
            ),
            if (charges.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: Text('Optional. Add a transport charge (e.g. hauling produce) if the customer is being charged for it.',
                    style: TextStyle(fontSize: 12, color: Colors.grey)),
              )
            else ...[
              for (final c in charges)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text('${c.transportTypeName} · ${c.trips} × ₹${c.ratePerTrip.toStringAsFixed(0)}')),
                      Text('₹${c.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      if (editable)
                        IconButton(
                          icon: const Icon(Icons.close, size: 16),
                          onPressed: _acting ? null : () => _handleDeleteTransport(c.id),
                        ),
                    ],
                  ),
                ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Transportation total', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text('₹${(history?.transportTotal ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Final customer breakdown: Work + Transportation + Total. Work amount comes
  // from the same authoritative formula as the invoice (job.finalAmount);
  // transport totals are the server's structured charges. No recalculation.
  Widget _buildFinalBreakdown(JobDetail job, JobHistory history) {
    final work = job.finalAmount;
    final transport = history.transportTotal;
    final grand = work != null ? work + transport : null;
    Widget row(String label, String value, {bool bold = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
              Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w600, fontSize: bold ? 18 : 14)),
            ],
          ),
        );
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Charge Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            row('Work charges', work != null ? '₹${work.toStringAsFixed(2)}' : '—'),
            for (final c in history.transport)
              row('Transportation · ${c.transportTypeName} (${c.trips} × ₹${c.ratePerTrip.toStringAsFixed(0)})',
                  '₹${c.totalAmount.toStringAsFixed(0)}'),
            const Divider(),
            row('Total', grand != null ? '₹${grand.toStringAsFixed(2)}' : '—', bold: true),
          ],
        ),
      ),
    );
  }

  // Job Timeline built from the authoritative work sessions + assignment
  // changes (never the current machine/driver). Sessions are worked intervals;
  // assignment changes are point events with a reason.
  Widget _buildTimeline(JobDetail job, JobHistory history) {
    // Resolve resource ids to labels using the sessions' embedded names.
    final machineLabels = <String, String>{};
    final driverLabels = <String, String>{};
    for (final s in history.sessions) {
      if (s.machineRegistration != null) machineLabels[s.machineId] = s.machineRegistration!;
      if (s.driverName != null) driverLabels[s.driverId] = s.driverName!;
    }

    final events = <(DateTime, String, String, Color)>[];
    final terminal = ['STOPPED', 'COMPLETED', 'CANCELLED'].contains(job.status);
    for (var i = 0; i < history.sessions.length; i++) {
      final s = history.sessions[i];
      events.add((
        s.startedAt,
        i == 0 ? 'Work started' : 'Work resumed',
        '${s.machineRegistration ?? '—'} · ${s.driverName ?? '—'}',
        Colors.green,
      ));
      if (s.endedAt != null) {
        final isLast = i == history.sessions.length - 1;
        events.add((
          s.endedAt!,
          isLast && terminal ? 'Work stopped' : 'Work paused',
          s.durationSec != null ? _durWords(s.durationSec!) : '',
          Colors.orange,
        ));
      }
    }
    for (final c in history.changes) {
      final isMachine = c.field == 'MACHINE';
      final from = isMachine ? (machineLabels[c.oldMachineId] ?? '—') : (driverLabels[c.oldDriverId] ?? '—');
      final to = isMachine ? (machineLabels[c.newMachineId] ?? '—') : (driverLabels[c.newDriverId] ?? '—');
      events.add((
        c.changedAt,
        isMachine ? 'Machine changed' : 'Driver changed',
        '$from → $to · ${c.reason}',
        Colors.red,
      ));
    }
    events.sort((a, b) => a.$1.compareTo(b.$1));

    // Per-resource attribution from sessions (Parts I/J) — actual worked time,
    // never the current/final assignment.
    final byDriver = <String, ({String name, int sec})>{};
    final byMachine = <String, ({String name, int sec})>{};
    for (final s in history.sessions) {
      final sec = s.durationSec ?? 0;
      final d = byDriver[s.driverId];
      byDriver[s.driverId] = (name: s.driverName ?? '—', sec: (d?.sec ?? 0) + sec);
      final m = byMachine[s.machineId];
      byMachine[s.machineId] = (name: s.machineRegistration ?? '—', sec: (m?.sec ?? 0) + sec);
    }
    String h(int sec) => '${(sec / 3600).toStringAsFixed(2)}h';
    // Total worked time / session count across all sessions — mirrors the web
    // JobExecutionModal's work-summary line and the backend rollup.
    final totalWorkedSec = history.sessions.fold<int>(0, (s, w) => s + (w.durationSec ?? 0));
    final sessionCount = history.sessions.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Job Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 10),
        for (final e in events)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.circle, size: 10, color: e.$4),
                const SizedBox(width: 10),
                SizedBox(
                  width: 46,
                  child: Text(_formatClock(e.$1), style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.grey)),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(e.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
                      if (e.$3.isNotEmpty) Text(e.$3, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Text(
            'Total worked: ${_durWords(totalWorkedSec)} · $sessionCount ${sessionCount == 1 ? 'session' : 'sessions'}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
        if (byDriver.length > 1 || byMachine.length > 1) ...[
          const SizedBox(height: 10),
          const Divider(),
          Wrap(
            spacing: 24,
            runSpacing: 8,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Driver time', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                  for (final d in byDriver.values) Text('${d.name}: ${h(d.sec)}', style: const TextStyle(fontSize: 13)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Machine time', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                  for (final m in byMachine.values) Text('${m.name}: ${h(m.sec)}', style: const TextStyle(fontSize: 13)),
                ],
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _WarningBanner extends StatelessWidget {
  final IconData icon;
  final String text;

  const _WarningBanner({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.shade200)),
      child: Row(children: [
        Icon(icon, size: 16, color: Colors.red.shade700),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: TextStyle(color: Colors.red.shade700, fontSize: 13))),
      ]),
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
  final _minChargeController = TextEditingController();
  String? _pricingMethodId;
  // Unit of the selected method (hour/minute/acre or null for fixed/custom).
  // Minimum Charge is a floor on METERED methods only, so the field is shown
  // only when the selected method has a non-null unit — matching React.
  String? _selectedUnit;

  @override
  void dispose() {
    _rateController.dispose();
    _minChargeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final methodsAsync = ref.watch(_pricingMethodsProvider);
    final isMetered = _selectedUnit != null;
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
              onChanged: (value) => setState(() {
                _pricingMethodId = value;
                _selectedUnit = value == null
                    ? null
                    : methods.firstWhere((m) => m['id'] == value)['unit'] as String?;
              }),
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
          if (isMetered) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _minChargeController,
              decoration: const InputDecoration(
                labelText: 'Minimum Charge',
                helperText: 'Optional. Lowest amount that will be charged.',
                border: OutlineInputBorder(),
                prefixText: '₹ ',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _pricingMethodId == null
              ? null
              : () => Navigator.pop(context, {
                    'pricingMethodId': _pricingMethodId!,
                    'rate': _rateController.text,
                    // Only send a minimum for metered methods; blank otherwise.
                    'minimumCharge': isMetered ? _minChargeController.text : '',
                  }),
          child: const Text('Save'),
        ),
      ],
    );
  }
}

final _pricingMethodsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  syncOn(ref, {SyncEntity.pricingMethod});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/pricing-methods');
  return (response.data as List<dynamic>).cast<Map<String, dynamic>>();
});

class _AddTransportDialog extends StatefulWidget {
  final List<TransportType> types;
  const _AddTransportDialog({required this.types});

  @override
  State<_AddTransportDialog> createState() => _AddTransportDialogState();
}

class _AddTransportDialogState extends State<_AddTransportDialog> {
  final _tripsController = TextEditingController();
  final _rateController = TextEditingController();
  String? _typeId;

  @override
  void dispose() {
    _tripsController.dispose();
    _rateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trips = int.tryParse(_tripsController.text.trim());
    final rate = double.tryParse(_rateController.text.trim());
    final preview = (trips != null && trips > 0 && rate != null && rate >= 0) ? trips * rate : null;
    final valid = _typeId != null && preview != null;
    return AlertDialog(
      title: const Text('Add Transportation'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _typeId,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Transportation Type *', border: OutlineInputBorder()),
              items: widget.types.map((t) => DropdownMenuItem(value: t.id, child: Text(t.name))).toList(),
              onChanged: (v) => setState(() => _typeId = v),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tripsController,
              decoration: const InputDecoration(labelText: 'Number of Trips *', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _rateController,
              decoration: const InputDecoration(labelText: 'Rate per Trip *', border: OutlineInputBorder(), prefixText: '₹ '),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
            ),
            if (preview != null) ...[
              const SizedBox(height: 12),
              Text('Total: ₹${preview.toStringAsFixed(0)}  (confirmed by server on save)',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: valid
              ? () => Navigator.pop(context, {
                    'transportTypeId': _typeId!,
                    'trips': _tripsController.text.trim(),
                    'ratePerTrip': _rateController.text.trim(),
                  })
              : null,
          child: const Text('Add'),
        ),
      ],
    );
  }
}

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
