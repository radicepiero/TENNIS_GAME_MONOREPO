import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class DebugJsonTile extends StatelessWidget {
  final Object? json;

  const DebugJsonTile({super.key, required this.json});

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();
    return ExpansionTile(
      title: const Text('Debug: JSON'),
      childrenPadding: const EdgeInsets.all(16),
      children: [
        SelectableText(const JsonEncoder.withIndent('  ').convert(json ?? {})),
      ],
    );
  }
}
