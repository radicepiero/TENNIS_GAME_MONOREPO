/// Small helpers to safely coerce dynamic JSON values into common Dart types.
///
/// These functions are intentionally defensive: when the input is not the
/// expected type (or is null), they return a reasonable default.
class JsonUtils {
  /// Returns `v` as `Map<String, dynamic>` when possible, otherwise `{}`.
  ///
  /// Accepts both a strongly typed `Map<String, dynamic>` and a raw `Map`
  /// (which will be cast).
  static Map<String, dynamic> asMap(dynamic v) {
    if (v is Map<String, dynamic>) return v;
    if (v is Map) return v.cast<String, dynamic>();
    return <String, dynamic>{};
  }

  /// Returns `v` as `List` when possible, otherwise an empty list.
  static List asList(dynamic v) {
    if (v is List) return v;
    return const [];
  }

  /// Returns a string representation of `v`.
  ///
  /// If `v` is `null`, returns an empty string.
  static String asString(dynamic v) {
    if (v == null) return '';
    return v.toString();
  }

  /// Returns `v` as `int` when possible.
  ///
  /// Supports `int`, any `num` (rounded via `toInt()`), and string parsing.
  /// If parsing fails, returns `0`.
  static int asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    final s = asString(v);
    return int.tryParse(s) ?? 0;
  }

  /// Returns `v` as `bool` when possible.
  ///
  /// Accepts booleans directly; otherwise parses common string values.
  /// Truthy values: `true`, `1`, `yes` (case-insensitive). Everything else is
  /// considered `false`.
  static bool asBool(dynamic v) {
    if (v is bool) return v;
    final s = asString(v).toLowerCase();
    return s == 'true' || s == '1' || s == 'yes';
  }
}
