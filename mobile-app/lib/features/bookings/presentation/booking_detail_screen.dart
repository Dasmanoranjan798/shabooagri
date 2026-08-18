import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/info_row.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';

final bookingDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/bookings/$id');
  return response.data as Map<String, dynamic>;
});

final bookingAttachmentsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/bookings/$id/attachments');
  return (response.data as List<dynamic>).cast<Map<String, dynamic>>();
});

class BookingDetailScreen extends ConsumerStatefulWidget {
  final String bookingId;

  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  ConsumerState<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends ConsumerState<BookingDetailScreen> {
  bool _assigningMachine = false;
  bool _assigningDriver = false;
  bool _uploadingPhoto = false;

  void _refresh() {
    ref.invalidate(bookingDetailProvider(widget.bookingId));
  }

  Future<void> _assignMachine(String? machineId) async {
    setState(() => _assigningMachine = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/bookings/${widget.bookingId}/machine', data: {'machineId': machineId});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _assigningMachine = false);
    }
  }

  Future<void> _assignDriver(String? driverId) async {
    setState(() => _assigningDriver = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/bookings/${widget.bookingId}/driver', data: {'driverId': driverId});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _assigningDriver = false);
    }
  }

  Future<void> _uploadPhoto() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80);
    if (picked == null) return;
    setState(() => _uploadingPhoto = true);
    try {
      final dio = ref.read(apiClientProvider);
      final formData = FormData.fromMap({'file': await MultipartFile.fromFile(picked.path)});
      await dio.post('/bookings/${widget.bookingId}/attachments', data: formData);
      ref.invalidate(bookingAttachmentsProvider(widget.bookingId));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingAsync = ref.watch(bookingDetailProvider(widget.bookingId));
    final attachmentsAsync = ref.watch(bookingAttachmentsProvider(widget.bookingId));
    final dio = ref.read(apiClientProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/bookings'),
        ),
      ),
      body: bookingAsync.when(
        data: (booking) {
          final pricingMethod = booking['pricingMethod'] as Map<String, dynamic>?;
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                InfoRow('Booking Number', booking['bookingNumber'] as String),
                InfoRow('Status', booking['status'] as String),
                if (booking['workDescription'] != null) InfoRow('Work Needed', booking['workDescription'] as String),
                if (booking['scheduledDate'] != null)
                  InfoRow('Scheduled Date', (booking['scheduledDate'] as String).split('T').first),
                InfoRow(
                  'Rate & Method',
                  booking['rate'] != null && pricingMethod != null
                      ? '₹${booking['rate']} / ${pricingMethod['label']}'
                      : 'Not set yet — assigned when work starts',
                ),
                if (booking['estimatedAmount'] != null)
                  InfoRow('Estimated Amount', '₹${(booking['estimatedAmount'] as num).toStringAsFixed(0)}'),
                if (booking['notes'] != null && (booking['notes'] as String).isNotEmpty)
                  InfoRow('Notes', booking['notes'] as String),
                const Divider(height: 32),
                const Text('Fleet & Operator Assignment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                Consumer(builder: (context, ref, _) {
                  final machinesAsync = ref.watch(machinesListProvider);
                  return machinesAsync.when(
                    data: (machines) => DropdownButtonFormField<String>(
                      initialValue: booking['machineId'] as String?,
                      decoration: const InputDecoration(labelText: 'Machine', border: OutlineInputBorder()),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('-- Unassigned --')),
                        ...machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))),
                      ],
                      onChanged: _assigningMachine ? null : _assignMachine,
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
                  );
                }),
                const SizedBox(height: 12),
                Consumer(builder: (context, ref, _) {
                  final driversAsync = ref.watch(driversListProvider);
                  return driversAsync.when(
                    data: (drivers) => DropdownButtonFormField<String>(
                      initialValue: booking['driverId'] as String?,
                      decoration: const InputDecoration(labelText: 'Driver', border: OutlineInputBorder()),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('-- Unassigned --')),
                        ...drivers.map((d) => DropdownMenuItem(value: d.id, child: Text(d.name))),
                      ],
                      onChanged: _assigningDriver ? null : _assignDriver,
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, s) => Text('Could not load drivers: ${apiErrorMessage(e)}'),
                  );
                }),
                const Divider(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Photo Attachments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(
                      icon: _uploadingPhoto
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.add_a_photo),
                      onPressed: _uploadingPhoto ? null : _uploadPhoto,
                    ),
                  ],
                ),
                attachmentsAsync.when(
                  data: (attachments) {
                    if (attachments.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text('No photos attached to this booking yet.'),
                      );
                    }
                    return GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                      children: attachments.map((a) {
                        final url = '${dio.options.baseUrl}${a['fileUrl']}';
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.network(url, fit: BoxFit.cover),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
                  error: (e, s) => Text('Could not load photos: ${apiErrorMessage(e)}'),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
