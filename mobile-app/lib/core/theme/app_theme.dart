import 'package:flutter/material.dart';

class AppTheme {
  // Brand Primary Theme Colors
  static const Color primary = Color(0xFF1B7A3E);
  static const Color primaryDark = Color(0xFF13582C);
  static const Color primaryLight = Color(0xFFE6F4EA);
  static const Color accent = Color(0xFF2ECC71);

  // Neutral Surfaces & Borders
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);
  
  // Typography Colors
  static const Color text = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);
  
  // System Status Colors
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF2563EB);

  static ThemeData get themeData {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        surface: surface,
        error: danger,
        onPrimary: Colors.white,
        onSurface: text,
      ),
      scaffoldBackgroundColor: background,
      useMaterial3: true,
      
      // Typography
      textTheme: const TextTheme(
        headlineSmall: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 24),
        titleLarge: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 20),
        titleMedium: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 16),
        bodyLarge: TextStyle(color: text, fontSize: 16),
        bodyMedium: TextStyle(color: text, fontSize: 14),
        bodySmall: TextStyle(color: textMuted, fontSize: 12),
        labelLarge: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 14),
      ),
      
      
      
      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: text,
          side: const BorderSide(color: border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      
      // Input
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        labelStyle: const TextStyle(color: textMuted),
        hintStyle: const TextStyle(color: textMuted),
      ),
      
      // App Bar
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 20),
        iconTheme: IconThemeData(color: text),
      ),
      
      // Divider
      dividerTheme: const DividerThemeData(
        color: border,
        space: 24,
        thickness: 1,
      ),
    );
  }
}
