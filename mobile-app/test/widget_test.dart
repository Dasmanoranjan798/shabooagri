import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/router/app_router.dart';
import 'package:shabooagri_mobile/main.dart';

void main() {
  testWidgets('App boots to Company Setup when no tenant is configured', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MyApp(router: buildAppRouter('/setup')),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Company Setup'), findsOneWidget);
  });
}
