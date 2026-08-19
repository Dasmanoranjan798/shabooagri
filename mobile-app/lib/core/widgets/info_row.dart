import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Widget? customValueWidget;

  const InfoRow(this.label, this.value, {super.key, this.customValueWidget});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(width: 16),
          Flexible(
            child: customValueWidget ?? Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppTheme.text),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}
