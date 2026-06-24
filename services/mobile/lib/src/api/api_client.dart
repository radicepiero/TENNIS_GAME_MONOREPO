import 'dart:convert';

import 'package:http/http.dart' as http;

import 'token_store.dart';

class ApiClient {
  final String apiBase;
  final TokenStore tokenStore;
  final http.Client _http;

  ApiClient({
    required this.apiBase,
    required this.tokenStore,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = apiBase.endsWith('/') ? apiBase.substring(0, apiBase.length - 1) : apiBase;
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$p').replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> login({required String email, required String password}) async {
    final res = await _http.post(
      _uri('/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final json = _decodeJson(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(statusCode: res.statusCode, message: (json['message'] ?? 'Login failed').toString());
    }
    final accessToken = (json['access_token'] ?? '').toString();
    final refreshToken = (json['refresh_token'] ?? '').toString();
    if (accessToken.isEmpty || refreshToken.isEmpty) {
      throw ApiException(statusCode: res.statusCode, message: 'Token mancanti');
    }
    await tokenStore.writeTokens(accessToken: accessToken, refreshToken: refreshToken);
    return json;
  }

  Future<void> logout() => tokenStore.clear();

  Future<Map<String, dynamic>> getMobileFriendHome({String? roomId}) async {
    final query = <String, String>{};
    if (roomId != null && roomId.trim().isNotEmpty) query['room_id'] = roomId;
    return _getJsonWithAuth('/mobile/friend/home', query: query);
  }

  Future<Map<String, dynamic>> getMobileSviluppo({required String tournamentId, String? roomId}) async {
    final query = <String, String>{};
    if (roomId != null && roomId.trim().isNotEmpty) query['room_id'] = roomId;
    return _getJsonWithAuth('/mobile/tournaments/$tournamentId/sviluppo', query: query);
  }

  Future<Map<String, dynamic>> getMobileTournamentsIndex() async {
    return _getJsonWithAuth('/mobile/tournaments/index');
  }

  Future<Map<String, dynamic>> getAnnualRanking({required int year, String? roomId}) async {
    final query = <String, String>{};
    if (roomId != null && roomId.trim().isNotEmpty) query['room_id'] = roomId;
    return _getJsonWithAuth('/annual-ranking/$year', query: query);
  }

  Future<Map<String, dynamic>> getMyPronostico({required String tournamentId, String? roomId}) async {
    final query = <String, String>{};
    if (roomId != null && roomId.trim().isNotEmpty) query['room_id'] = roomId;
    return _getJsonWithAuth('/predictions/tournaments/$tournamentId/user', query: query);
  }

  Future<Map<String, dynamic>> createPrediction({
    required String tournamentId,
    required List<Map<String, dynamic>> rows,
    String? roomId,
  }) async {
    final payload = <String, dynamic>{
      'tournament_id': tournamentId,
      'rows': rows,
    };
    if (roomId != null && roomId.trim().isNotEmpty) payload['room_id'] = roomId;
    return _requestJsonWithAuth(
      'POST',
      '/predictions',
      body: payload,
    );
  }

  Future<Map<String, dynamic>> deletePrediction({
    required String tournamentId,
    String? roomId,
  }) async {
    final payload = <String, dynamic>{
      'tournament_id': tournamentId,
    };
    if (roomId != null && roomId.trim().isNotEmpty) payload['room_id'] = roomId;
    return _requestJsonWithAuth(
      'DELETE',
      '/predictions',
      body: payload,
    );
  }

  Future<Map<String, dynamic>> getTournamentPlayers({required String tournamentId}) async {
    return _getJsonWithAuth('/mobile/tournaments/$tournamentId/players');
  }

  Future<Map<String, dynamic>> getTournamentScripts({required String tournamentId}) async {
    return _getJsonWithAuth('/tournaments/$tournamentId/scripts/');
  }

  Future<Map<String, dynamic>> getUserTreeByTournament({required String tournamentId}) async {
    return _getJsonWithAuth('/trees', query: {'tournamentId': tournamentId, 'includeMatches': 'true'});
  }

  Future<Map<String, dynamic>> getSuperuserTreeByTournament({required String tournamentId}) async {
    return _getJsonWithAuth('/trees/superuser/$tournamentId', query: {'includeMatches': 'true'});
  }

  Future<Map<String, dynamic>> cloneSuperuserTree({required String tournamentId}) async {
    return _requestJsonWithAuth('POST', '/trees/clone/superuser/$tournamentId');
  }

  Future<Map<String, dynamic>> saveTree({required String treeId, required List<Map<String, dynamic>> matches}) async {
    return _requestJsonWithAuth('PUT', '/trees', query: {'treeId': treeId}, body: {'matches': matches});
  }

  Future<bool> predictionExistsByTournament({required String tournamentId, String? roomId}) async {
    try {
      final query = <String, String>{'tournament_id': tournamentId};
      if (roomId != null && roomId.trim().isNotEmpty) query['room_id'] = roomId;
      await _getJsonWithAuth('/predictions/tournaments/$tournamentId/user', query: roomId != null ? {'room_id': roomId} : null);
      return true;
    } on ApiException catch (e) {
      if (e.statusCode == 404) return false;
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getPlayersByRankingDate({String? rankingDate}) async {
    final d = (rankingDate ?? '').trim();
    if (d.isEmpty) {
      return _getJsonWithAuth('/players/ranking');
    }
    return _getJsonWithAuth('/players/ranking/$d');
  }

  Future<Map<String, dynamic>> _getJsonWithAuth(String path, {Map<String, String>? query}) async {
    final accessToken = await tokenStore.readAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw ApiException(statusCode: 401, message: 'Unauthorized');
    }

    final uri = _uri(path, query);
    http.Response res = await _authorizedGet(uri, accessToken);
    if (res.statusCode == 401) {
      final refreshed = await _refresh();
      if (!refreshed) {
        throw ApiException(statusCode: 401, message: 'Unauthorized');
      }
      final access2 = await tokenStore.readAccessToken();
      if (access2 == null || access2.isEmpty) {
        throw ApiException(statusCode: 401, message: 'Unauthorized');
      }
      res = await _authorizedGet(uri, access2);
    }

    final json = _decodeJson(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(statusCode: res.statusCode, message: (json['message'] ?? 'Request failed').toString());
    }
    return json;
  }

  Future<Map<String, dynamic>> _requestJsonWithAuth(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    final accessToken = await tokenStore.readAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw ApiException(statusCode: 401, message: 'Unauthorized');
    }

    final uri = _uri(path, query);
    http.Response res = await _authorizedJsonRequest(uri, accessToken, method, body);
    if (res.statusCode == 401) {
      final refreshed = await _refresh();
      if (!refreshed) {
        throw ApiException(statusCode: 401, message: 'Unauthorized');
      }
      final access2 = await tokenStore.readAccessToken();
      if (access2 == null || access2.isEmpty) {
        throw ApiException(statusCode: 401, message: 'Unauthorized');
      }
      res = await _authorizedJsonRequest(uri, access2, method, body);
    }

    final json = _decodeJson(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(statusCode: res.statusCode, message: (json['message'] ?? 'Request failed').toString());
    }
    return json;
  }

  Future<http.Response> _authorizedGet(Uri uri, String token) {
    return _http.get(uri, headers: {'Authorization': 'Bearer $token'});
  }

  Future<http.Response> _authorizedJsonRequest(
    Uri uri,
    String token,
    String method,
    Map<String, dynamic>? body,
  ) {
    final headers = <String, String>{
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
    final encoded = (body != null) ? jsonEncode(body) : null;
    final req = http.Request(method, uri);
    req.headers.addAll(headers);
    if (encoded != null) req.body = encoded;
    return _http.send(req).then(http.Response.fromStream);
  }

  Map<String, dynamic> _decodeJson(http.Response res) {
    try {
      final body = res.body;
      if (body.isEmpty) return <String, dynamic>{};
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
      return <String, dynamic>{'data': decoded};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Future<bool> _refresh() async {
    final refreshToken = await tokenStore.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    final res = await _http.post(
      _uri('/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    final json = _decodeJson(res);
    if (res.statusCode < 200 || res.statusCode >= 300) return false;

    final access = (json['access_token'] ?? '').toString();
    final refresh = (json['refresh_token'] ?? '').toString();
    if (access.isEmpty || refresh.isEmpty) return false;

    await tokenStore.writeTokens(accessToken: access, refreshToken: refresh);
    return true;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'ApiException($statusCode): $message';
}
