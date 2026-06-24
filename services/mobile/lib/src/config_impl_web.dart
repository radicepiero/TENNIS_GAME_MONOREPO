String apiBase() {
  const defined = String.fromEnvironment('API_BASE');
  if (defined.isNotEmpty) return defined;

  return 'http://localhost/api';
}
