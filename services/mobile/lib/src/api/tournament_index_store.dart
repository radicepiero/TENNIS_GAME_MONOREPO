import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/tournament.dart';
import 'api_client.dart';

class TournamentIndexSnapshot {
  final String version;
  final List<TournamentDto> tournaments;

  const TournamentIndexSnapshot({required this.version, required this.tournaments});
}

class TournamentIndexStore {
  static const _kVersion = 'tournaments_index_version_v1';
  static const _kJson = 'tournaments_index_json_v1';

  Future<TournamentIndexSnapshot?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final version = (prefs.getString(_kVersion) ?? '').trim();
    final raw = (prefs.getString(_kJson) ?? '').trim();
    if (version.isEmpty || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return null;
      final tournaments = decoded
          .whereType<Map>()
          .map((m) => TournamentDto.fromJson(m.cast<String, dynamic>()))
          .toList();
      return TournamentIndexSnapshot(version: version, tournaments: tournaments);
    } catch (_) {
      return null;
    }
  }

  Future<TournamentIndexSnapshot> ensureFresh(ApiClient api) async {
    final current = await read();

    Map<String, dynamic> json;
    try {
      json = await api.getMobileTournamentsIndex();
    } catch (_) {
      if (current != null) return current;
      rethrow;
    }

    final data = (json['data'] is Map) ? (json['data'] as Map) : <String, dynamic>{};
    final version = (data['version'] ?? '').toString().trim();
    final list = (data['tournaments'] is List) ? (data['tournaments'] as List) : const <dynamic>[];

    if (current != null && version.isNotEmpty && version == current.version) {
      return current;
    }

    final tournaments = list
        .whereType<Map>()
        .map((m) => TournamentDto.fromJson(m.cast<String, dynamic>()))
        .toList();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kVersion, version);
    await prefs.setString(_kJson, jsonEncode(list));

    return TournamentIndexSnapshot(version: version, tournaments: tournaments);
  }
}
