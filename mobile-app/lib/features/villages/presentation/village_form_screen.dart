import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import 'village_list_screen.dart';

/// Create/Edit Village — the simplest master-data form (single field),
/// matching the website's `VillageFormModal.tsx` exactly (name only).
class VillageFormScreen extends ConsumerStatefulWidget {
  final String? villageId;
  final String? initialName;

  const VillageFormScreen({super.key, this.villageId, this.initialName});

  @override
  ConsumerState<VillageFormScreen> createState() => _VillageFormScreenState();
}

class _VillageFormScreenState extends ConsumerState<VillageFormScreen> {
  late final TextEditingController _nameController = TextEditingController(text: widget.initialName);
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.villageId != null;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Enter a village name.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    try {
      if (_isEdit) {
        await dio.patch('/villages/${widget.villageId}', data: {'name': name});
      } else {
        await dio.post('/villages', data: {'name': name});
      }
      ref.invalidate(villagesListProvider);
      if (mounted) context.go('/villages');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      currentRoute: '/villages',
      title: _isEdit ? 'Edit Village' : 'New Village',
      showBack: true,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: DesktopFormContainer(
          maxWidth: 560,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _nameController,
                decoration: InputDecoration(labelText: 'Village Name', border: const OutlineInputBorder(), errorText: _error),
                enabled: !_saving,
                autofocus: true,
              ),
              const SizedBox(height: 24),
              DesktopFormActions(
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32)),
                  child: _saving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_isEdit ? 'Save Changes' : 'Create Village'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
