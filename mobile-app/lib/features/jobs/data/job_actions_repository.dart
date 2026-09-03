import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import 'job_detail.dart';
import 'job_execution_models.dart';

final jobActionsRepositoryProvider = Provider<JobActionsRepository>((ref) {
  final dio = ref.watch(apiClientProvider);
  return JobActionsRepository(dio);
});

/// Direct, online API calls for the Job lifecycle — deliberately NOT routed
/// through the offline SyncQueue. Start/Pause/Resume/Stop/Submit carry real
/// business rules (mandatory pause-reason, the locked-after-submit rule,
/// automatic invoice generation) that only the server can enforce
/// correctly; queuing them for later replay would mean a driver sees a
/// false "success" for an action that might get rejected once it actually
/// reaches the server. The website itself has no offline mode for this
/// either. See BUILD_LOG.md Stage 1 for the full reasoning.
class JobActionsRepository {
  final Dio _dio;

  JobActionsRepository(this._dio);

  Future<JobDetail> getById(String id) async {
    final response = await _dio.get('/jobs/$id');
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  /// Live list with full relations (booking number, customer name, machine)
  /// — used by the Jobs list screens instead of the flat offline cache, so
  /// rows can show real identifying info instead of a raw job ID.
  Future<List<JobDetail>> list() async {
    final response = await _dio.get('/jobs');
    return (response.data as List<dynamic>).map((j) => JobDetail.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<JobDetail> start(String id) async {
    final response = await _dio.post('/jobs/$id/start');
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  /// Pause now requires a reason (Job Execution V2). Pausing releases the
  /// machine/driver and closes the current work session server-side.
  Future<JobDetail> pause(String id, String reason) async {
    final response = await _dio.post('/jobs/$id/pause', data: {'note': reason});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  /// Resume takes NO reason — the reason captured at Pause time is the record.
  Future<JobDetail> resume(String id) async {
    final response = await _dio.post('/jobs/$id/resume');
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  /// Pause-reason master (data-driven dropdown, not hardcoded). Returns labels.
  Future<List<String>> listPauseReasons() async {
    final response = await _dio.get('/pause-reasons');
    return (response.data as List<dynamic>)
        .map((e) => (e as Map<String, dynamic>)['label'] as String)
        .toList();
  }

  /// Create a new pause reason (Owner/Manager). Backend enforces the
  /// case-insensitive duplicate check and returns 409 if it already exists.
  Future<String> createPauseReason(String label) async {
    final response = await _dio.post('/pause-reasons', data: {'label': label});
    return (response.data as Map<String, dynamic>)['label'] as String;
  }

  Future<JobDetail> stop(String id) async {
    final response = await _dio.post('/jobs/$id/stop');
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<JobDetail> submit(String id, {double? completedAcres}) async {
    final response = await _dio.post('/jobs/$id/submit', data: {
      'completedAcres': ?completedAcres,
    });
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<JobDetail> cancel(String id, {String? reason}) async {
    final response = await _dio.post('/jobs/$id/cancel', data: {if (reason != null && reason.isNotEmpty) 'reason': reason});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> addFuelEntry(String id, double litres, double? cost) async {
    await _dio.post('/jobs/$id/fuel-entries', data: {
      'litres': litres,
      'cost': ?cost,
    });
  }

  Future<void> addPhoto(String id, String filePath, {String? caption}) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      if (caption != null && caption.isNotEmpty) 'caption': caption,
    });
    await _dio.post('/jobs/$id/photos', data: formData);
  }

  /// Counts only — used to drive the missing-photo/missing-fuel warning
  /// banners before Submit, matching `JobExecutionModal.tsx`'s
  /// `missingPhoto`/`missingFuel` checks (`company.requireJobPhoto` /
  /// `requireJobFuelLog` gated, evaluated client-side so the user sees the
  /// warning before hitting the server's generic validation error).
  Future<int> countFuelEntries(String id) async {
    final response = await _dio.get('/jobs/$id/fuel-entries');
    return (response.data as List<dynamic>).length;
  }

  Future<int> countPhotos(String id) async {
    final response = await _dio.get('/jobs/$id/photos');
    return (response.data as List<dynamic>).length;
  }

  Future<JobDetail> updateNotes(String id, String notes) async {
    final response = await _dio.patch('/jobs/$id', data: {'notes': notes});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  // ---- Job Execution V2: reassignment, history, transportation -------------
  // Reason is mandatory; only valid while PAUSED and for authorised users
  // (backend enforces both). The new resource is not occupied until Resume.
  Future<JobDetail> changeMachine(String id, String machineId, String reason) async {
    final response = await _dio.post('/jobs/$id/machine', data: {'machineId': machineId, 'reason': reason});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<JobDetail> changeDriver(String id, String driverId, String reason) async {
    final response = await _dio.post('/jobs/$id/driver', data: {'driverId': driverId, 'reason': reason});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<JobWorkSession>> listWorkSessions(String id) async {
    final response = await _dio.get('/jobs/$id/work-sessions');
    return (response.data as List<dynamic>).map((s) => JobWorkSession.fromJson(s as Map<String, dynamic>)).toList();
  }

  Future<List<JobAssignmentChange>> listAssignmentChanges(String id) async {
    final response = await _dio.get('/jobs/$id/assignment-changes');
    return (response.data as List<dynamic>).map((c) => JobAssignmentChange.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<List<JobTransportCharge>> listTransportCharges(String id) async {
    final response = await _dio.get('/jobs/$id/transport');
    return (response.data as List<dynamic>).map((c) => JobTransportCharge.fromJson(c as Map<String, dynamic>)).toList();
  }

  /// total is computed server-side (trips × rate) — never sent by the client.
  Future<void> addTransportCharge(String id, String transportTypeId, int trips, double ratePerTrip) async {
    await _dio.post('/jobs/$id/transport', data: {
      'transportTypeId': transportTypeId,
      'trips': trips,
      'ratePerTrip': ratePerTrip,
    });
  }

  Future<void> deleteTransportCharge(String jobId, String chargeId) async {
    await _dio.delete('/jobs/$jobId/transport/$chargeId');
  }

  Future<List<TransportType>> listTransportTypes() async {
    final response = await _dio.get('/transport-types');
    return (response.data as List<dynamic>).map((t) => TransportType.fromJson(t as Map<String, dynamic>)).toList();
  }

  Future<List<ResourceOption>> listMachines() async {
    final response = await _dio.get('/machines');
    return (response.data as List<dynamic>)
        .map((m) => ResourceOption(id: m['id'] as String, label: m['registrationNumber'] as String? ?? 'Machine'))
        .toList();
  }

  Future<List<ResourceOption>> listDrivers() async {
    final response = await _dio.get('/drivers');
    return (response.data as List<dynamic>).map((d) {
      final employee = d['employee'] as Map<String, dynamic>?;
      return ResourceOption(id: d['id'] as String, label: employee?['name'] as String? ?? 'Driver');
    }).toList();
  }
}
