import '../utils/json_utils.dart';

class PredictionRowDto {
  final String playerId;
  final String prediction;

  const PredictionRowDto({required this.playerId, required this.prediction});

  factory PredictionRowDto.fromJson(Map<String, dynamic> json) {
    return PredictionRowDto(
      playerId: JsonUtils.asString(json['player_id']),
      prediction: JsonUtils.asString(json['prediction']),
    );
  }
}

class PredictionResponseDto {
  final int rowsCount;
  final String? winnerPlayerId;
  final String? semifinalist1Id;
  final String? semifinalist2Id;
  final List<PredictionRowDto> rows;

  const PredictionResponseDto({
    required this.rowsCount,
    required this.winnerPlayerId,
    required this.semifinalist1Id,
    required this.semifinalist2Id,
    required this.rows,
  });

  factory PredictionResponseDto.fromApiJson(Map<String, dynamic> apiJson) {
    final data = JsonUtils.asMap(apiJson['data']);

    // /predictions/tournaments/:id/user ritorna spesso una LISTA di prediction
    // in { success: true, data: [ ... ] }
    final list = JsonUtils.asList(apiJson['data']);
    final prediction = list.isNotEmpty ? JsonUtils.asMap(list.first) : data;

    final rawRows = JsonUtils.asList(prediction['rows']);
    final rows = rawRows.map((r) => PredictionRowDto.fromJson(JsonUtils.asMap(r))).toList();

    final winner = rows.firstWhere(
      (r) => r.prediction.toLowerCase() == 'winner',
      orElse: () => const PredictionRowDto(playerId: '', prediction: ''),
    );

    final semifinalists = rows
        .where((r) => r.prediction.toLowerCase() == 'semifinalist')
        .map((r) => r.playerId)
        .where((id) => id.isNotEmpty)
        .toList();

    final w = winner.playerId.isEmpty ? null : winner.playerId;
    final sf1 = semifinalists.isNotEmpty ? semifinalists[0] : null;
    final sf2 = semifinalists.length > 1 ? semifinalists[1] : null;

    return PredictionResponseDto(
      rowsCount: rows.length,
      winnerPlayerId: w,
      semifinalist1Id: sf1,
      semifinalist2Id: sf2,
      rows: rows,
    );
  }
}
