import 'dart:io';

String apiBase() {
  const defined = String.fromEnvironment('API_BASE');
  if (defined.isNotEmpty) return defined;

  if (Platform.isAndroid) {
    return 'http://10.0.2.2/api';
  }

  return 'http://localhost/api';
}
