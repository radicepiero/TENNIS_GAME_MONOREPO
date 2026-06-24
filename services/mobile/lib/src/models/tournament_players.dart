import '../utils/json_utils.dart';
import 'player.dart';

class TournamentPlayersResponseDto {
  final String tournamentId;
  final List<PlayerDto> players;

  const TournamentPlayersResponseDto({required this.tournamentId, required this.players});

  factory TournamentPlayersResponseDto.fromApiJson(Map<String, dynamic> apiJson) {
    final data = JsonUtils.asMap(apiJson['data']);
    return TournamentPlayersResponseDto(
      tournamentId: JsonUtils.asString(data['tournament_id']),
      players: JsonUtils.asList(data['players']).map((p) => PlayerDto.fromJson(JsonUtils.asMap(p))).toList(),
    );
  }
}
