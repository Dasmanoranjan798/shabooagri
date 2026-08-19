import re

with open('lib/features/jobs/presentation/fast_job_create_screen.dart', 'r') as f:
    content = f.read()

patch_content = """      String? bookingId;
      try {
        final res = await dio.post('/bookings', data: {
          'customerId': _customerId,
          'villageId': _villageId,
          'workDescription': _workController.text.trim(),
          'machineId': _machineId,
          'driverId': _driverId,
          'scheduledDate': DateTime.now().toIso8601String(),
          'estimatedHours': _estimateHoursController.text.trim().isNotEmpty ? double.tryParse(_estimateHoursController.text.trim()) : null,
          'ignoreConflict': _ignoreConflict,
        });
        bookingId = res.data['id'] as String;
      } catch (e) {
        if (e is DioException && e.response?.statusCode == 409) {
          if (!mounted) return;
          final errorMsg = e.response?.data?['error']?.toString() ?? '';
          final match = RegExp(r'(BK-\\\\d+)').firstMatch(errorMsg);
          final bkNumber = match?.group(1) ?? 'Unknown';
          
          setState(() => _saving = false);
          final confirm = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Machine & Driver Currently Working'),
              content: Text('This machine and driver are currently assigned to another job.\\n\\nCurrent Job: $bkNumber\\n\\nDo you want to book them for this?'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
                ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('BOOK ANYWAY')),
              ],
            ),
          );
          
          if (confirm == true) {
            setState(() => _ignoreConflict = true);
            return _submit(); // Retry
          } else {
            return; // Cancelled
          }
        }
        
        setState(() {
          _error = 'Failed to create job: ${e.toString()}';
          _saving = false;
        });
        return;
      }

      // If we reach here, the booking was created successfully.
      // Any subsequent errors shouldn't be reported as "Failed to create job".
      try {
        if (_rateController.text.trim().isNotEmpty) {
          final rate = double.tryParse(_rateController.text.trim());
          if (rate != null) {
            await dio.put('/jobs/by-booking/$bookingId/pricing', data: {
              'pricingMethodId': 'HOURLY',
              'rate': rate,
            });
          }
        }

        if (mounted) {
          await Future.delayed(const Duration(milliseconds: 500));
          final getBooking = await dio.get('/bookings/$bookingId');
          if (!mounted) return;
          final jobCards = getBooking.data['jobCards'] as List;
          if (jobCards.isNotEmpty) {
             final jobId = jobCards.first['id'] as String;
             context.go('/jobs/$jobId');
          } else {
             context.go('/bookings/$bookingId');
          }
        }
      } catch (e) {
        // If pricing or fetch fails, just go to bookings list or booking detail
        if (mounted) context.go('/bookings/$bookingId');
      }"""

start_str = "final res = await dio.post('/bookings', data: {"
end_str = "        });\n      }\n    }\n"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

new_content = content[:start_idx] + patch_content + "\n" + content[end_idx:]

with open('lib/features/jobs/presentation/fast_job_create_screen.dart', 'w') as f:
    f.write(new_content)
