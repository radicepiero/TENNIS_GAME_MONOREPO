import 'config_impl_io.dart' if (dart.library.html) 'config_impl_web.dart' as impl;

class AppConfig {
  static String apiBase() => impl.apiBase();
}
