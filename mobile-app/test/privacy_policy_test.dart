import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/features/settings/presentation/privacy_policy_screen.dart';

/// Verifies the in-app Privacy Policy access point required by Google Play's
/// User Data policy: a simple link/page that points at the single governing
/// public policy URL (not a separate in-app policy document).
void main() {
  test('the in-app policy points at the single governing public URL', () {
    expect(kPrivacyPolicyUrl, 'https://www.shabooagri.com/privacy');
  });

  testWidgets('Privacy Policy screen offers a link to the governing policy URL', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PrivacyPolicyScreen()));
    await tester.pump();

    // A visible action to open the policy, and the canonical URL shown as text.
    expect(find.widgetWithText(FilledButton, 'View Privacy Policy'), findsOneWidget);
    expect(find.text(kPrivacyPolicyUrl), findsOneWidget);
    // No overflow at a phone size.
    expect(tester.takeException(), isNull);
  });
}
