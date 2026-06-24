import 'package:flutter/material.dart';

import 'router.dart';

class TennisApp extends StatelessWidget {
  const TennisApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = buildRouter();
    return MaterialApp.router(
      title: 'Tennis Game',
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      routerConfig: router,
    );
  }
}
