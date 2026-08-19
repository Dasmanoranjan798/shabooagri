import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StatusBadge extends StatefulWidget {
  final String label;
  final Color color;
  final Color backgroundColor;
  final bool isAnimated;

  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    required this.backgroundColor,
    this.isAnimated = false,
  });

  @override
  State<StatusBadge> createState() => _StatusBadgeState();
}

class _StatusBadgeState extends State<StatusBadge> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    if (widget.isAnimated) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(StatusBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isAnimated && !oldWidget.isAnimated) {
      _controller.repeat(reverse: true);
    } else if (!widget.isAnimated && oldWidget.isAnimated) {
      _controller.stop();
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: widget.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: widget.color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (widget.isAnimated) ...[
            FadeTransition(
              opacity: _animation,
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: widget.color.withOpacity(0.5),
                      blurRadius: 4,
                      spreadRadius: 1,
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(width: 6),
          ] else ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: widget.color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            widget.label.toUpperCase(),
            style: TextStyle(
              color: widget.color,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class MachineStatusBadge extends StatelessWidget {
  final String status;

  const MachineStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final s = status.toUpperCase();
    if (s == 'WORKING') {
      return const StatusBadge(
        label: 'WORKING',
        color: AppTheme.primary,
        backgroundColor: AppTheme.primaryLight,
        isAnimated: true,
      );
    } else if (s == 'AVAILABLE') {
      return StatusBadge(
        label: 'AVAILABLE',
        color: AppTheme.success,
        backgroundColor: AppTheme.success.withOpacity(0.1),
      );
    } else if (s == 'REPAIR') {
      return StatusBadge(
        label: 'MAINTENANCE',
        color: AppTheme.warning,
        backgroundColor: AppTheme.warning.withOpacity(0.1),
      );
    } else {
      return StatusBadge(
        label: 'OFFLINE',
        color: AppTheme.danger,
        backgroundColor: AppTheme.danger.withOpacity(0.1),
      );
    }
  }
}

class DriverStatusBadge extends StatelessWidget {
  final String status;

  const DriverStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final s = status.toUpperCase();
    if (s == 'WORKING') {
      return const StatusBadge(
        label: 'WORKING',
        color: AppTheme.primary,
        backgroundColor: AppTheme.primaryLight,
        isAnimated: true,
      );
    } else if (s == 'AVAILABLE') {
      return StatusBadge(
        label: 'AVAILABLE',
        color: AppTheme.success,
        backgroundColor: AppTheme.success.withOpacity(0.1),
      );
    } else {
      return StatusBadge(
        label: 'OFF DUTY',
        color: AppTheme.textMuted,
        backgroundColor: AppTheme.border,
      );
    }
  }
}

class JobStatusBadge extends StatelessWidget {
  final String status;

  const JobStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final s = status.toUpperCase();
    if (s == 'NOT_STARTED') {
      return StatusBadge(
        label: 'NOT STARTED',
        color: AppTheme.textMuted,
        backgroundColor: AppTheme.border,
      );
    } else if (s == 'WORKING') {
      return const StatusBadge(
        label: 'WORKING',
        color: AppTheme.primary,
        backgroundColor: AppTheme.primaryLight,
        isAnimated: true,
      );
    } else if (s == 'PAUSED') {
      return StatusBadge(
        label: 'PAUSED',
        color: AppTheme.warning,
        backgroundColor: AppTheme.warning.withOpacity(0.1),
      );
    } else if (s == 'COMPLETED') {
      return StatusBadge(
        label: 'COMPLETED',
        color: AppTheme.success,
        backgroundColor: AppTheme.success.withOpacity(0.1),
      );
    } else if (s == 'CANCELLED') {
      return StatusBadge(
        label: 'CANCELLED',
        color: AppTheme.danger,
        backgroundColor: AppTheme.danger.withOpacity(0.1),
      );
    }
    return StatusBadge(
      label: s,
      color: AppTheme.textMuted,
      backgroundColor: AppTheme.border,
    );
  }
}
