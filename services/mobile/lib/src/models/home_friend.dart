import '../utils/json_utils.dart';
import 'player.dart';
import 'room.dart';
import 'tournament.dart';

class HomeFriendResponseDto {
  final String roomId;
  final List<RoomDto> rooms;
  final FriendDashboardDto dashboard;

  const HomeFriendResponseDto({
    required this.roomId,
    required this.rooms,
    required this.dashboard,
  });

  factory HomeFriendResponseDto.fromApiJson(Map<String, dynamic> apiJson) {
    final data = JsonUtils.asMap(apiJson['data']);
    final dashboard = JsonUtils.asMap(data['dashboard']);

    return HomeFriendResponseDto(
      roomId: JsonUtils.asString(data['room_id']),
      rooms: JsonUtils.asList(data['rooms']).map((r) => RoomDto.fromJson(JsonUtils.asMap(r))).toList(),
      dashboard: FriendDashboardDto.fromJson(dashboard),
    );
  }
}

class FriendDashboardDto {
  final TournamentDto? currentTournament;
  final List<TournamentDto> nextTournaments;
  final List<TournamentDto> recentTournaments;
  final List<MyPlayerRowDto> myPlayers;

  const FriendDashboardDto({
    required this.currentTournament,
    required this.nextTournaments,
    required this.recentTournaments,
    required this.myPlayers,
  });

  factory FriendDashboardDto.fromJson(Map<String, dynamic> json) {
    final currentRaw = json['currentTournament'];
    final current = (currentRaw is Map) ? TournamentDto.fromJson(JsonUtils.asMap(currentRaw)) : null;

    return FriendDashboardDto(
      currentTournament: current,
      nextTournaments: JsonUtils.asList(json['nextTournaments'])
          .map((t) => TournamentDto.fromJson(JsonUtils.asMap(t)))
          .toList(),
      recentTournaments: JsonUtils.asList(json['recentTournaments'])
          .map((t) => TournamentDto.fromJson(JsonUtils.asMap(t)))
          .toList(),
      myPlayers: JsonUtils.asList(json['myPlayers']).map((r) => MyPlayerRowDto.fromJson(JsonUtils.asMap(r))).toList(),
    );
  }
}

class MyPlayerTournamentPickDto {
  final String tournamentId;
  final String tournamentNickname;
  final String tournamentDatafine;
  final String role;
  final int predictedPoints;
  final int? realizedPoints;

  const MyPlayerTournamentPickDto({
    required this.tournamentId,
    required this.tournamentNickname,
    required this.tournamentDatafine,
    required this.role,
    required this.predictedPoints,
    required this.realizedPoints,
  });

  factory MyPlayerTournamentPickDto.fromJson(Map<String, dynamic> json) {
    final rp = json['realizedPoints'];
    return MyPlayerTournamentPickDto(
      tournamentId: JsonUtils.asString(json['tournament_id']),
      tournamentNickname: JsonUtils.asString(json['tournament_nickname']),
      tournamentDatafine: JsonUtils.asString(json['tournament_datafine']),
      role: JsonUtils.asString(json['role']),
      predictedPoints: JsonUtils.asInt(json['predictedPoints']),
      realizedPoints: (rp == null) ? null : JsonUtils.asInt(rp),
    );
  }
}

class MyPlayerRowDto {
  final PlayerDto player;
  final List<MyPlayerTournamentPickDto> tournaments;

  const MyPlayerRowDto({required this.player, required this.tournaments});

  factory MyPlayerRowDto.fromJson(Map<String, dynamic> json) {
    return MyPlayerRowDto(
      player: PlayerDto.fromJson(JsonUtils.asMap(json['player'])),
      tournaments: JsonUtils.asList(json['tournaments'])
          .map((t) => MyPlayerTournamentPickDto.fromJson(JsonUtils.asMap(t)))
          .toList(),
    );
  }
}
