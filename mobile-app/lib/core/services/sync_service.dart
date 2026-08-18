import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../providers/network_provider.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(apiClientProvider);
  return SyncService(db, dio, ref);
});

class SyncService {
  final AppDatabase _db;
  final Dio _dio;
  final Ref _ref;
  bool _isSyncing = false;

  SyncService(this._db, this._dio, this._ref) {
    _listenToNetworkChanges();
  }

  void _listenToNetworkChanges() {
    _ref.listen<AsyncValue<bool>>(networkStatusProvider, (previous, next) {
      final isOnline = next.valueOrNull ?? false;
      if (isOnline) {
        processQueue();
      }
    });
  }

  Future<void> processQueue() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final queueItems = await _db.select(_db.syncQueue).get();
      for (final item in queueItems) {
        bool success = await _syncItem(item);
        if (success) {
          await (_db.delete(_db.syncQueue)..where((t) => t.id.equals(item.id))).go();
        } else {
          // Increment retry count or handle persistent failure
          await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
              .write(SyncQueueCompanion(retryCount: Value(item.retryCount + 1)));
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<bool> _syncItem(OfflineSyncQueue item) async {
    try {
      final payload = jsonDecode(item.payloadJson);
      String endpoint = '';
      
      switch (item.entityType) {
        case 'booking':
          endpoint = '/bookings';
          if (item.operation == 'UPDATE') endpoint += '/${item.entityId}';
          break;
        case 'job':
          endpoint = '/jobs';
          if (item.operation == 'UPDATE') endpoint += '/${item.entityId}';
          // Additional custom operations like /jobs/:id/start
          if (item.operation.startsWith('JOB_ACTION_')) {
            final action = item.operation.split('_').last.toLowerCase();
            endpoint += '/${item.entityId}/$action';
          }
          break;
        // add cases for other entities
        default:
          return false;
      }

      Response response;
      if (item.operation == 'CREATE') {
        response = await _dio.post(endpoint, data: payload);
      } else if (item.operation == 'UPDATE' || item.operation.startsWith('JOB_ACTION_')) {
        // Assume PATCH for updates, POST for job actions based on backend spec
        if (item.operation == 'UPDATE') {
          response = await _dio.patch(endpoint, data: payload);
        } else {
          response = await _dio.post(endpoint, data: payload);
        }
      } else if (item.operation == 'DELETE') {
        response = await _dio.delete(endpoint);
      } else {
        return false;
      }

      return response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout || 
          e.type == DioExceptionType.receiveTimeout || 
          e.type == DioExceptionType.connectionError) {
        // Network issue, do not consider as permanent failure, keep in queue
        return false;
      }
      // Depending on the API, a 400 or 500 error might mean the payload is permanently invalid
      // In a real app we might drop it or move to a dead-letter queue. For now, fail it.
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> enqueueSync(String entityType, String entityId, String operation, Map<String, dynamic> payload) async {
    await _db.into(_db.syncQueue).insert(
      SyncQueueCompanion.insert(
        entityType: entityType,
        entityId: entityId,
        operation: operation,
        payloadJson: jsonEncode(payload),
      ),
    );
    // Attempt sync immediately if online
    final isOnline = _ref.read(networkStatusProvider).valueOrNull ?? false;
    if (isOnline) {
      processQueue();
    }
  }
}
