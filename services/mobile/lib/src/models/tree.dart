class MatchDto {
  final String uuid;
  final String treeId;
  final int round;
  final int? player1Id;
  final int? player2Id;
  final String? fatherId;
  final int? childIndex;
  final bool p1Wins;
  final bool p2Wins;
  final DateTime? createdAt;

  const MatchDto({
    required this.uuid,
    required this.treeId,
    required this.round,
    this.player1Id,
    this.player2Id,
    this.fatherId,
    this.childIndex,
    required this.p1Wins,
    required this.p2Wins,
    this.createdAt,
  });

  factory MatchDto.fromJson(Map<String, dynamic> j) {
    final p1Raw = j['player1Id'] ?? j['player1_id'] ?? j['player1'];
    final p2Raw = j['player2Id'] ?? j['player2_id'] ?? j['player2'];
    final fatherRaw = j['fatherId'] ?? j['father_id'];
    final treeRaw = j['treeId'] ?? j['tree_id'];
    final childIndexRaw = j['childIndex'] ?? j['child_index'];
    final createdRaw = j['createdAt'] ?? j['created_at'];
    final createdAt = createdRaw != null ? DateTime.tryParse(createdRaw.toString()) : null;

    return MatchDto(
      uuid: (j['uuid'] ?? '').toString(),
      treeId: (treeRaw ?? '').toString(),
      round: int.tryParse(j['round']?.toString() ?? '') ?? 0,
      player1Id: p1Raw != null ? int.tryParse(p1Raw.toString()) : null,
      player2Id: p2Raw != null ? int.tryParse(p2Raw.toString()) : null,
      fatherId: fatherRaw?.toString(),
      childIndex: childIndexRaw != null ? int.tryParse(childIndexRaw.toString()) : null,
      p1Wins: j['p1Wins'] == true || j['p1_wins'] == true,
      p2Wins: j['p2Wins'] == true || j['p2_wins'] == true,
      createdAt: createdAt,
    );
  }

  MatchDto copyWith({int? player1Id, int? player2Id, bool? p1Wins, bool? p2Wins}) => MatchDto(
        uuid: uuid,
        treeId: treeId,
        round: round,
        player1Id: player1Id ?? this.player1Id,
        player2Id: player2Id ?? this.player2Id,
        fatherId: fatherId,
        childIndex: childIndex,
        p1Wins: p1Wins ?? this.p1Wins,
        p2Wins: p2Wins ?? this.p2Wins,
        createdAt: createdAt,
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
