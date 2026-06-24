import '../utils/json_utils.dart';
import 'tournament.dart';

class TournamentRankingRowDto {
  final String userUuid;
  final String userSoprannome;
  final String userEmail;
  final int points;

  const TournamentRankingRowDto({
    required this.userUuid,
    required this.userSoprannome,
    required this.userEmail,
    required this.points,
  });

  factory TournamentRankingRowDto.fromJson(Map<String, dynamic> json) {
    return TournamentRankingRowDto(
      userUuid: JsonUtils.asString(json['user_uuid']),
      userSoprannome: JsonUtils.asString(json['user_soprannome']),
      userEmail: JsonUtils.asString(json['user_email']),
      points: JsonUtils.asInt(json['points']),
    );
  }
}

class TournamentRankingDto {
  final String tournamentId;
  final TournamentRankingRowDto? winner;
  final List<TournamentRankingRowDto> winners;
  final List<TournamentRankingRowDto> rows;

  const TournamentRankingDto({
    required this.tournamentId,
    required this.winner,
    required this.winners,
    required this.rows,
  });

  factory TournamentRankingDto.fromJson(Map<String, dynamic> json) {
    final wRaw = json['winner'];
    final winnerJson = (wRaw is Map) ? JsonUtils.asMap(wRaw) : null;

    final winnersRaw = json['winners'];
    final winnersFromApi = (winnersRaw is List)
        ? JsonUtils.asList(winnersRaw)
            .map((r) => TournamentRankingRowDto.fromJson(JsonUtils.asMap(r)))
            .toList()
        : <TournamentRankingRowDto>[];
    final rows = JsonUtils.asList(json['rows']).map((r) => TournamentRankingRowDto.fromJson(JsonUtils.asMap(r))).toList();

    List<TournamentRankingRowDto> derivedWinners = <TournamentRankingRowDto>[];
    if (rows.isNotEmpty) {
      final maxPoints = rows.first.points;
      derivedWinners = rows.where((r) => r.points == maxPoints).toList();
    }

    return TournamentRankingDto(
      tournamentId: JsonUtils.asString(json['tournament_id']),
      winner: (winnerJson != null && winnerJson.isNotEmpty) ? TournamentRankingRowDto.fromJson(winnerJson) : null,
      winners: winnersFromApi.isNotEmpty ? winnersFromApi : derivedWinners,
      rows: rows,
    );
  }
}

class SviluppoResponseDto {
  final TournamentDto tournament;
  final int predictionsCount;
  final bool hasSuperuserTree;
  final int superuserMatchesCount;
  final TournamentRankingDto? tournamentRanking;

  const SviluppoResponseDto({
    required this.tournament,
    required this.predictionsCount,
    required this.hasSuperuserTree,
    required this.superuserMatchesCount,
    required this.tournamentRanking,
  });

  factory SviluppoResponseDto.fromApiJson(Map<String, dynamic> apiJson) {
    final data = JsonUtils.asMap(apiJson['data']);
    final tournament = TournamentDto.fromJson(JsonUtils.asMap(data['tournament']));

    final predictions = JsonUtils.asList(data['predictions']);
    final treeRaw = data['superuserTree'];
    final tree = (treeRaw is Map) ? JsonUtils.asMap(treeRaw) : <String, dynamic>{};
    final matches = JsonUtils.asList(tree['Matches']);

    final rankingRaw = data['tournamentRanking'];
    final rankingJson = (rankingRaw is Map) ? JsonUtils.asMap(rankingRaw) : null;

    return SviluppoResponseDto(
      tournament: tournament,
      predictionsCount: predictions.length,
      hasSuperuserTree: treeRaw is Map,
      superuserMatchesCount: matches.length,
      tournamentRanking: (rankingJson != null && rankingJson.isNotEmpty) ? TournamentRankingDto.fromJson(rankingJson) : null,
    );
  }
}
