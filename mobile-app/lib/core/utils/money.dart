/// Rupee formatting with Indian digit grouping (₹1,248 · ₹76,583 · ₹5,00,000).
/// One shared formatter so every money value in the app reads the same way.
library;

String _groupIndian(String digits) {
  if (digits.length <= 3) return digits;
  final last3 = digits.substring(digits.length - 3);
  var rest = digits.substring(0, digits.length - 3);
  final buf = StringBuffer();
  // Group the remaining digits in pairs, from the right.
  while (rest.length > 2) {
    buf.write(',${rest.substring(rest.length - 2)}');
    rest = rest.substring(0, rest.length - 2);
  }
  return '$rest$buf,$last3';
}

/// Formats a number as ₹ with Indian grouping. Whole rupees by default (no
/// paise) — money on cards/KPIs reads cleaner without decimals.
String rupees(num? value, {bool decimals = false}) {
  final v = value ?? 0;
  final neg = v < 0;
  final abs = v.abs();
  final String body;
  if (decimals) {
    final parts = abs.toStringAsFixed(2).split('.');
    body = '${_groupIndian(parts[0])}.${parts[1]}';
  } else {
    body = _groupIndian(abs.round().toString());
  }
  return '${neg ? '-' : ''}₹$body';
}
