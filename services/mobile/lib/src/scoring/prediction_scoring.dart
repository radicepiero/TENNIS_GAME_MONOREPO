typedef PointsFn = int Function(int ranking);

enum ScoringProfileType {
  standard,
  aOpen,
}

class PredictionScoringProfile {
  final ScoringProfileType type;
  final PointsFn winnerPoints;
  final PointsFn semifinalistPoints;

  const PredictionScoringProfile({
    required this.type,
    required this.winnerPoints,
    required this.semifinalistPoints,
  });

  static int _capRanking(int ranking) {
    if (ranking <= 0) return 1024;
    return ranking > 1024 ? 1024 : ranking;
  }

  static int standardSemifinalist(int rankingRaw) {
    final ranking = _capRanking(rankingRaw);
    if (ranking <= 4) return 20;
    if (ranking <= 8) return 40;
    if (ranking <= 16) return 80;
    if (ranking <= 32) return 160;
    if (ranking <= 64) return 320;
    if (ranking <= 128) return 640;
    if (ranking <= 256) return 1280;
    if (ranking <= 512) return 2560;
    return 5120;
  }

  static int standardWinner(int rankingRaw) {
    final ranking = _capRanking(rankingRaw);
    if (ranking <= 4) return 80;
    if (ranking <= 8) return 160;
    if (ranking <= 16) return 320;
    if (ranking <= 32) return 640;
    if (ranking <= 64) return 1280;
    if (ranking <= 128) return 2560;
    if (ranking <= 256) return 5120;
    if (ranking <= 512) return 10240;
    return 20480;
  }

  static const PredictionScoringProfile standard = PredictionScoringProfile(
    type: ScoringProfileType.standard,
    winnerPoints: standardWinner,
    semifinalistPoints: standardSemifinalist,
  );

  static const PredictionScoringProfile aOpen = PredictionScoringProfile(
    type: ScoringProfileType.aOpen,
    winnerPoints: _aOpenWinner,
    semifinalistPoints: _aOpenSemifinalist,
  );

  static int _aOpenSemifinalist(int ranking) => 25;
  static int _aOpenWinner(int ranking) => 125;
}
