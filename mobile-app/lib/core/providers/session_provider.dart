import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_user.dart';

/// Company slug this device is set up for (e.g. "pilot"), used to build the
/// API base URL as `https://{slug}.shabooagri.com`. Seeded from
/// [TenantStorage] at app startup in main.dart, updated by the Company
/// Setup screen.
final tenantSlugProvider = StateProvider<String?>((ref) => null);

/// The logged-in user, if any. Seeded from [AuthStorage] at app startup,
/// updated on login/logout. Screens key role-based UI off
/// `currentUserProvider.roleSystemKey`, mirroring how the website's
/// AuthContext keys off `user.role.systemKey`.
final currentUserProvider = StateProvider<AppUser?>((ref) => null);
