import 'package:flutter/widgets.dart';

import 'api_client.dart';

class ApiContext extends InheritedWidget {
  final ApiClient api;

  const ApiContext({super.key, required this.api, required super.child});

  static ApiClient of(BuildContext context) {
    final w = context.dependOnInheritedWidgetOfExactType<ApiContext>();
    if (w == null) {
      throw StateError('ApiContext not found');
    }
    return w.api;
  }

  @override
  bool updateShouldNotify(ApiContext oldWidget) => api != oldWidget.api;
}
