import 'dart:io';

String apiBase() {
  const defined = String.fromEnvironment('API_BASE');
  if (defined.isNotEmpty) return defined;

  return 'https://www.popostapo.com/api';
}
