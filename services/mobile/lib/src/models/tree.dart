class MatchDto {
  final String uuid;
  final String treeId;
  final int round;
  final int? player1Id;
  final int? player2Id;
  final String? fatherId;
  final bool p1Wins;
  final bool p2Wins;

  const MatchDto({
    required this.uuid,
    required this.treeId,
    required this.round,
    this.player1Id,
    this.player2Id,
    this.fatherId,
    required this.p1Wins,
    required this.p2Wins,
  });

  factory MatchDto.fromJson(Map<String, dynamic> j) => MatchDto(
        uuid: (j['uuid'] ?? '').toString(),
        treeId: (j['treeId'] ?? '').toString(),
        round: int.tryParse(j['round']?.toString() ?? '') ?? 0,
        player1Id: j['player1Id'] != null ? int.tryParse(j['player1Id'].toString()) : null,
        player2Id: j['player2Id'] != null ? int.tryParse(j['player2Id'].toString()) : null,
        fatherId: j['fatherId']?.toString(),
        p1Wins: j['p1Wins'] == true,
        p2Wins: j['p2Wins'] == true,
      );

  MatchDto copyWith({bool? p1Wins, bool? p2Wins}) => MatchDto(
        uuid: uuid,
        treeId: treeId,
        round: round,
        player1Id: player1Id,
        player2Id: player2Id,
        fatherId: fatherId,
        p1Wins: p1Wins ?? this.p1Wins,
        p2Wins: p2Wins ?? this.p2Wins,
      );

  int? get winnerId {
    if (p1Wins && !p2Wins) return player1Id;
    if (p2Wins && !p1Wins) return player2Id;
    return null;
  }

  bool get hasWinner => p1Wins != p2Wins;
}

class TreeDto {
  final String id;
  final String name;
  final int? tournamentId;
  final String ownerId;
  final int roundMax;
  final List<MatchDto> matches;

  const TreeDto({
    required this.id,
    required this.name,
    this.tournamentId,
    required this.ownerId,
    required this.roundMax,
    required this.matches,
  });

  factory TreeDto.fromJson(Map<String, dynamic> j) {
    final rawMatches = j['Matches'] ?? j['matches'] ?? [];
    final matches = (rawMatches as List)
        .map((m) => MatchDto.fromJson(m as Map<String, dynamic>))
        .toList();
    return TreeDto(
      id: (j['id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      tournamentId: j['tournament_id'] != null ? int.tryParse(j['tournament_id'].toString()) : null,
      ownerId: (j['ownerId'] ?? '').toString(),
      roundMax: int.tryParse(j['roundMax']?.toString() ?? '') ?? 6,
      matches: matches,
    );
  }
}
