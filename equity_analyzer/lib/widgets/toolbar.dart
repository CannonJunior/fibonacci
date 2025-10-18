import 'package:flutter/material.dart';
import '../constants/theme_constants.dart';

/// Toolbar widget for chart controls (placeholder for future expansion)
class Toolbar extends StatelessWidget {
  final VoidCallback? onZoomIn;
  final VoidCallback? onZoomOut;
  final VoidCallback? onRefresh;

  const Toolbar({
    Key? key,
    this.onZoomIn,
    this.onZoomOut,
    this.onRefresh,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: ThemeConstants.gridColor,
        border: Border(
          bottom: BorderSide(color: ThemeConstants.gridColor.withOpacity(0.5)),
        ),
      ),
      child: Row(
        children: [
          _buildToolbarButton(
            icon: Icons.zoom_in,
            label: 'Zoom In',
            onPressed: onZoomIn,
          ),
          const SizedBox(width: 8),
          _buildToolbarButton(
            icon: Icons.zoom_out,
            label: 'Zoom Out',
            onPressed: onZoomOut,
          ),
          const SizedBox(width: 8),
          _buildToolbarButton(
            icon: Icons.refresh,
            label: 'Refresh',
            onPressed: onRefresh,
          ),
          const Spacer(),
          Text(
            'TradingView-Style Interface',
            style: TextStyle(
              color: ThemeConstants.textColor.withOpacity(0.5),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolbarButton({
    required IconData icon,
    required String label,
    VoidCallback? onPressed,
  }) {
    return Tooltip(
      message: label,
      child: IconButton(
        icon: Icon(icon, color: ThemeConstants.textColor),
        onPressed: onPressed,
        splashRadius: 20,
      ),
    );
  }
}
