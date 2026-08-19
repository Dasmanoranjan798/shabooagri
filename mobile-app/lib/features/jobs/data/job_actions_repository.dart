import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import 'job_detail.dart';

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

  Future<JobDetail> pause(String id) async {
    final response = await _dio.post('/jobs/$id/pause');
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<JobDetail> resume(String id, String reason) async {
    final response = await _dio.post('/jobs/$id/resume', data: {'note': reason});
    return JobDetail.fromJson(response.data as Map<String, dynamic>);
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
}
