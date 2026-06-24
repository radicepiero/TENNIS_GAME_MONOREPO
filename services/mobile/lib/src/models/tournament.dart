import '../utils/json_utils.dart';

class TournamentSurfaceDto {
  final String material;
  final String color;

  const TournamentSurfaceDto({required this.material, required this.color});

  factory TournamentSurfaceDto.fromJson(Map<String, dynamic> json) {
    return TournamentSurfaceDto(
      material: JsonUtils.asString(json['material']),
      color: JsonUtils.asString(json['color']),
    );
  }
}

class TournamentDto {
  final String id;
  final String name;
  final String nickname;
  final String status;
  final TournamentSurfaceDto? surface;
  final String? category;
  final String? image;
  final String? location;
  final String? country;
  final String? rankingDate;
  final String? dataopen;
  final String? datainizio;
  final String? datafine;
  final bool? hasTree;
  final bool? hasPrediction;
  final bool? hasSuperTree;

  const TournamentDto({
    required this.id,
    required this.name,
    required this.nickname,
    required this.status,
    required this.surface,
    required this.category,
    required this.image,
    required this.location,
    required this.country,
    required this.rankingDate,
    required this.dataopen,
    required this.datainizio,
    required this.datafine,
    required this.hasTree,
    required this.hasPrediction,
    required this.hasSuperTree,
  });

  String get displayName => nickname.isNotEmpty ? nickname : name;

  factory TournamentDto.fromJson(Map<String, dynamic> json) {
    final surfaceRaw = json['surface_jsonb'];
    final surfaceJson = (surfaceRaw is Map) ? JsonUtils.asMap(surfaceRaw) : null;

    return TournamentDto(
      id: JsonUtils.asString(json['id']),
      name: JsonUtils.asString(json['name']),
      nickname: JsonUtils.asString(json['nickname']),
      status: JsonUtils.asString(json['status']),
      surface: (surfaceJson != null && surfaceJson.isNotEmpty)
          ? TournamentSurfaceDto.fromJson(surfaceJson)
          : null,
      category: (() {
        final v = JsonUtils.asString(json['category']);
        return v.isEmpty ? null : v;
      })(),
      image: (() {
        final v = JsonUtils.asString(json['image']);
        return v.isEmpty ? null : v;
      })(),
      location: (() {
        final v = JsonUtils.asString(json['location']);
        return v.isEmpty ? null : v;
      })(),
      country: (() {
        final v = JsonUtils.asString(json['country']);
        return v.isEmpty ? null : v;
      })(),
      rankingDate: (() {
        final v = JsonUtils.asString(json['ranking_date']);
        return v.isEmpty ? null : v;
      })(),
      dataopen: (() {
        final v = JsonUtils.asString(json['dataopen']);
        return v.isEmpty ? null : v;
      })(),
      datainizio: (() {
        final v = JsonUtils.asString(json['datainizio']);
        return v.isEmpty ? null : v;
      })(),
      datafine: (() {
        final v = JsonUtils.asString(json['datafine']);
        return v.isEmpty ? null : v;
      })(),
      hasTree: (json.containsKey('hasTree')) ? JsonUtils.asBool(json['hasTree']) : null,
      hasPrediction: (json.containsKey('hasPrediction')) ? JsonUtils.asBool(json['hasPrediction']) : null,
      hasSuperTree: (json.containsKey('hasSuperTree')) ? JsonUtils.asBool(json['hasSuperTree']) : null,
    );
  }
}
