import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  static const _kAccessToken = 'access_token';
  static const _kRefreshToken = 'refresh_token';

  final FlutterSecureStorage _storage;

  TokenStore({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  Future<String?> readAccessToken() => _storage.read(key: _kAccessToken);
  Future<String?> readRefreshToken() => _storage.read(key: _kRefreshToken);

  Future<void> writeTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _kAccessToken, value: accessToken);
    await _storage.write(key: _kRefreshToken, value: refreshToken);
  }

  Future<void> writeAccessToken(String accessToken) async {
    await _storage.write(key: _kAccessToken, value: accessToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
  }
}
