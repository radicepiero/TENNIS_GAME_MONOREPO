import 'package:flutter/material.dart';

class PlayerAvatar extends StatelessWidget {
  final String? imageSrc;
  final double radius;
  final double opacity;

  const PlayerAvatar({super.key, this.imageSrc, this.radius = 20, this.opacity = 1.0});

  @override
  Widget build(BuildContext context) {
    final img = (imageSrc ?? '').trim();
    final avatar = CircleAvatar(
      radius: radius,
      backgroundImage: img.isNotEmpty ? NetworkImage(img) : null,
      backgroundColor: Colors.grey.shade200,
      child: img.isEmpty ? const Icon(Icons.person) : null,
    );
    if (opacity == 1.0) return avatar;
    return Opacity(opacity: opacity, child: avatar);
  }
}
