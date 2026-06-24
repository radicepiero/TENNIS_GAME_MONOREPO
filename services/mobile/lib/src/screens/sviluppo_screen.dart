import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_context.dart';
import '../api/room_store.dart';
import '../api/tournament_index_store.dart';
import '../models/player.dart';
import '../models/sviluppo.dart';
import '../models/tournament.dart';
import '../models/tournament_players.dart';
import '../models/tree.dart';
import '../scoring/prediction_scoring.dart';
import '../widgets/player_avatar.dart';

class SviluppoScreen extends StatefulWidget {
  final String tournamentId;
  final String? roomId;

  const SviluppoScreen({super.key, required this.tournamentId, this.roomId});

  @override
  State<SviluppoScreen> createState() => _SviluppoScreenState();
}

enum _PickStatus { ok, inGara, esce, uscito }

enum _PickType { winner, semifinalist }

class _PickView {
  final PlayerDto? player;
  final int? ranking;
  final int theoreticalPoints;
  final int points;
  final _PickStatus status;
  final int? outRound;

  const _PickView({
    required this.player,
    required this.ranking,
    required this.theoreticalPoints,
    required this.points,
    required this.status,
    required this.outRound,
  });
}

class _PredictionView {
  final String userName;
  final String? avatarUrl;
  final int total;
  final int theoreticalTotal;
  final _PickView winner;
  final List<_PickView> semis;

  const _PredictionView({
    required this.userName,
    required this.avatarUrl,
    required this.total,
    required this.theoreticalTotal,
    required this.winner,
    required this.semis,
  });
}

class _SviluppoScreenState extends State<SviluppoScreen> {
  final _roomStore = RoomStore();
  final _tournamentIndexStore = TournamentIndexStore();
  String? _roomId;

  Future<List<Map<String, dynamic>>>? _loadFuture;
  String? _loadKey;

  Future<TournamentIndexSnapshot>? _indexFuture;
  final Map<String, bool> _hasSuperTreeByTournamentId = <String, bool>{};

  @override
  void initState() {
    super.initState();
    _initRoom();
  }

  Future<void> _initRoom() async {
    final stored = await _roomStore.readSelectedRoomId();
    if (!mounted) return;
    setState(() => _roomId = widget.roomId ?? stored);
  }

  void _navigateToTournament(BuildContext context, String tournamentId) {
    final rid = (_roomId ?? '').trim();
    final qs = rid.isNotEmpty ? '?room_id=${Uri.encodeQueryComponent(rid)}' : '';
    context.pushReplacement('/tornei/$tournamentId/sviluppo$qs');
  }

  Future<bool> _ensureHasSuperTree(ApiClient api, String tournamentId) async {
    final cached = _hasSuperTreeByTournamentId[tournamentId];
    if (cached != null) return cached;
    try {
      final json = await api.getSuperuserTreeByTournament(tournamentId: tournamentId);
      final has = (json['id'] ?? json['uuid'] ?? '').toString().trim().isNotEmpty;
      _hasSuperTreeByTournamentId[tournamentId] = has;
      return has;
    } catch (_) {
      _hasSuperTreeByTournamentId[tournamentId] = false;
      return false;
    }
  }

  Future<void> _openTournamentPicker(BuildContext context, ApiClient api, String currentId) async {
    _indexFuture ??= _tournamentIndexStore.ensureFresh(api);
    TournamentIndexSnapshot snap;
    try {
      snap = await _indexFuture!;
    } catch (_) {
      return;
    }

    final all = snap.tournaments;

    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            children: [
              for (final t in all)
                FutureBuilder<bool>(
                  future: _ensureHasSuperTree(api, t.id),
                  builder: (context2, snap2) {
                    final has = snap2.data == true;
                    if (!has) return const SizedBox.shrink();
                    return ListTile(
                      title: Text(t.displayName),
                      trailing: (t.id == currentId) ? const Icon(Icons.check) : null,
                      onTap: () {
                        Navigator.of(ctx).pop();
                        _navigateToTournament(context, t.id);
                      },
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Future<List<Map<String, dynamic>>> _load(ApiClient api, String tournamentId, String? roomId) async {
    final playersJson = await api.getTournamentPlayers(tournamentId: tournamentId);
    final sviluppoJson = await api.getMobileSviluppo(tournamentId: tournamentId, roomId: roomId);

    final scriptsJson = await api.getTournamentScripts(tournamentId: tournamentId);
    final torneoDto = SviluppoResponseDto.fromApiJson(sviluppoJson).tournament;
    final rankingJson = await api.getPlayersByRankingDate(rankingDate: torneoDto.rankingDate);

    return [playersJson, sviluppoJson, scriptsJson, rankingJson];
  }

  int? _faseToRound(int fase) {
    final f = fase;
    if (f <= 0) return null;
    return 7 - f;
  }

  Set<int> _getPredictedPlayerIds(List<dynamic> predictions) {
    final ids = <int>{};
    for (final p in predictions) {
      if (p is! Map) continue;
      final rows = p['rows'];
      if (rows is! List) continue;
      for (final r in rows) {
        if (r is! Map) continue;
        final raw = r['player_id'];
        final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
        if (n != null) ids.add(n);
      }
    }
    return ids;
  }

  bool _matchHasOutcome(MatchDto m) => m.p1Wins || m.p2Wins;

  bool _roundPlayedForPredictions(int round, List<MatchDto> matches, Set<int> predictedPlayerIds) {
    final relevant = matches.where((m) {
      if (m.round != round) return false;
      final p1 = m.player1Id ?? -1;
      final p2 = m.player2Id ?? -1;
      return predictedPlayerIds.contains(p1) || predictedPlayerIds.contains(p2);
    }).toList();

    if (relevant.isEmpty) return true;
    return relevant.every(_matchHasOutcome);
  }

  int _computeUnlockedMaxFase(List<MatchDto> matches, Set<int> predictedPlayerIds) {
    var maxFase = 1;
    for (var fase = 2; fase <= 6; fase++) {
      final prevRound = _faseToRound(fase - 1);
      if (prevRound == null) break;
      final ok = _roundPlayedForPredictions(prevRound, matches, predictedPlayerIds);
      if (!ok) break;
      maxFase = fase;
    }
    return maxFase;
  }

  bool _didPlayRound(int playerId, int round, List<MatchDto> matches) {
    return matches.any((m) {
      if (m.round != round) return false;
      return (m.player1Id == playerId) || (m.player2Id == playerId);
    });
  }

  int? _computeChampionId(List<MatchDto> matches) {
    final finalMatch = matches.cast<MatchDto?>().firstWhere(
          (m) => m != null && m.round == 1,
          orElse: () => null,
        );
    return finalMatch?.winnerId;
  }

  _PickStatus _computePlayerStatusForRound(int playerId, int round, List<MatchDto> matches) {
    final m = matches.cast<MatchDto?>().firstWhere(
          (x) => x != null && x.round == round && (x.player1Id == playerId || x.player2Id == playerId),
          orElse: () => null,
        );
    if (m == null) return _PickStatus.uscito;
    final winnerId = m.winnerId;
    if (winnerId == null) return _PickStatus.inGara;
    return winnerId == playerId ? _PickStatus.ok : _PickStatus.esce;
  }

  _PickStatus _computeDisplayStatusForPick({
    required _PickType pickType,
    required int playerId,
    required int? selectedRound,
    required List<MatchDto> matches,
  }) {
    if (selectedRound == null) return _PickStatus.inGara;

    final base = _computePlayerStatusForRound(playerId, selectedRound, matches);

    if (selectedRound == 1 && (pickType == _PickType.winner || pickType == _PickType.semifinalist)) {
      final reachedSemi = _didPlayRound(playerId, 2, matches);
      final inFinal = _didPlayRound(playerId, 1, matches);
      if (reachedSemi && !inFinal) return _PickStatus.esce;
    }

    return base;
  }

  int _pointsCountForStatus(_PickStatus status) {
    return (status == _PickStatus.ok || status == _PickStatus.inGara) ? 1 : 0;
  }

  int _pointsCountForPick({
    required _PickType pickType,
    required _PickStatus status,
    required int? selectedRound,
    required bool reachedSemifinal,
  }) {
    if (pickType == _PickType.semifinalist && selectedRound != null && selectedRound <= 2) {
      return reachedSemifinal ? 1 : 0;
    }
    return _pointsCountForStatus(status);
  }

  int? _computeOutRound(int playerId, List<MatchDto> matches) {
    int? outRound;
    for (final m in matches) {
      if (!(m.p1Wins || m.p2Wins)) continue;
      final winnerId = m.winnerId;
      if (winnerId == null) continue;
      if (m.player1Id != playerId && m.player2Id != playerId) continue;
      if (winnerId != playerId) {
        if (outRound == null || m.round > outRound) outRound = m.round;
      }
    }
    return outRound;
  }

  String _compactPlayerName(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return '-';
    final parts = s.split(RegExp(r'\s+')).where((p) => p.trim().isNotEmpty).toList();
    if (parts.length == 1) return parts.first;
    final first = parts.first;
    final last = parts.last;
    final initial = first.isNotEmpty ? first.substring(0, 1).toUpperCase() : '';
    return initial.isNotEmpty ? '$initial. $last' : last;
  }

  PredictionScoringProfile _scoringProfileFromScripts(Map<String, dynamic> scriptsJson) {
    try {
      final data = (scriptsJson['data'] is Map) ? (scriptsJson['data'] as Map) : null;
      final list = (data != null && data['Scripts'] is List) ? (data['Scripts'] as List) : null;
      final names = (list ?? [])
          .map((s) => (s is Map) ? (s['name'] ?? '').toString() : '')
          .where((x) => x.isNotEmpty)
          .toSet();
      if (names.contains('AOpenWinner') || names.contains('AOpenSemifinalist')) {
        return PredictionScoringProfile.aOpen;
      }
      return PredictionScoringProfile.standard;
    } catch (_) {
      return PredictionScoringProfile.standard;
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = ApiContext.of(context);
    final tid = widget.tournamentId;

    _indexFuture ??= _tournamentIndexStore.ensureFresh(api);

    final currentKey = '$tid|${_roomId ?? ''}';
    if (_loadFuture == null || _loadKey != currentKey) {
      _loadKey = currentKey;
      _loadFuture = _load(api, tid, _roomId);
    }

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(title: const Text('Sviluppo')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Sviluppo')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(snapshot.error.toString()),
              ),
            ),
          );
        }

        final list = snapshot.data;
        if (list == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Sviluppo')),
            body: const Center(child: Text('Nessun dato')),
          );
        }

        final playersJson = list[0];
        final sviluppoJson = list[1];
        final scriptsJson = list[2];
        final rankingJson = list[3];

        final dto = SviluppoResponseDto.fromApiJson(sviluppoJson);
        final t = dto.tournament;
        final scoringProfile = _scoringProfileFromScripts(scriptsJson);

        final tournamentPlayers = TournamentPlayersResponseDto.fromApiJson(playersJson);
        final playerById = <String, PlayerDto>{
          for (final p in tournamentPlayers.players)
            if (p.id.isNotEmpty) p.id: p,
        };

        final rankingById = <String, int>{};
        try {
          final data = rankingJson['data'];
          if (data is List) {
            for (final p in data) {
              if (p is! Map) continue;
              final id = (p['id'] ?? '').toString();
              if (id.isEmpty) continue;

              if (!playerById.containsKey(id)) {
                try {
                  playerById[id] = PlayerDto.fromJson(p.cast<String, dynamic>());
                } catch (_) {}
              }

              final rankings = p['Rankings'];
              if (rankings is List && rankings.isNotEmpty && rankings.first is Map) {
                final r = rankings.first as Map;
                final raw = r['ranking'];
                final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
                if (n != null) rankingById[id] = n;
              }
            }
          }
        } catch (_) {}

        final data = (sviluppoJson['data'] is Map) ? (sviluppoJson['data'] as Map) : <String, dynamic>{};
        final predictionsRaw = data['predictions'];
        final predictionsList = (predictionsRaw is List) ? predictionsRaw : <dynamic>[];

        final treeRaw = data['superuserTree'];
        final matches = <MatchDto>[];
        if (treeRaw is Map) {
          try {
            final tree = TreeDto.fromJson(treeRaw.cast<String, dynamic>());
            matches.addAll(tree.matches);
          } catch (_) {}
        }

        final predictedIds = _getPredictedPlayerIds(predictionsList);
        final unlockedMaxFase = _computeUnlockedMaxFase(matches, predictedIds);
        final selectedRound = _faseToRound(unlockedMaxFase);
        final championId = _computeChampionId(matches);

        int pointsForWinner(String playerId) {
          final r = rankingById[playerId];
          if (r == null) return 0;
          return scoringProfile.winnerPoints(r);
        }

        int pointsForSemi(String playerId) {
          final r = rankingById[playerId];
          if (r == null) return 0;
          return scoringProfile.semifinalistPoints(r);
        }

        PlayerDto? pById(String? id) {
          if (id == null || id.trim().isEmpty) return null;
          return playerById[id.trim()];
        }

        _PickView buildPick({required _PickType pickType, required String? playerIdRaw}) {
          final player = pById(playerIdRaw);
          if (player == null) {
            return const _PickView(
              player: null,
              ranking: null,
              theoreticalPoints: 0,
              points: 0,
              status: _PickStatus.uscito,
              outRound: null,
            );
          }

          final playerId = int.tryParse(player.id) ?? -1;
          final reachedSemi = _didPlayRound(playerId, 2, matches);
          final inFinal = _didPlayRound(playerId, 1, matches);

          final status = _computeDisplayStatusForPick(
            pickType: pickType,
            playerId: playerId,
            selectedRound: selectedRound,
            matches: matches,
          );

          final outRound = _computeOutRound(playerId, matches);

          var effectiveStatus = status;
          if (effectiveStatus == _PickStatus.uscito && selectedRound != null && outRound != null && outRound > selectedRound) {
            effectiveStatus = _PickStatus.esce;
          }

          final basePoints = (pickType == _PickType.winner) ? pointsForWinner(player.id) : pointsForSemi(player.id);

          var effectivePickType = pickType;
          var effectiveBasePoints = basePoints;

          if (pickType == _PickType.winner && selectedRound != null && selectedRound <= 2) {
            final finalDecided = championId != null;
            final winnerLostFinal = finalDecided && championId != playerId;
            final shouldCountAsSemifinalist = reachedSemi && (!inFinal || winnerLostFinal);
            if (shouldCountAsSemifinalist) {
              effectivePickType = _PickType.semifinalist;
              effectiveBasePoints = pointsForSemi(player.id);
            }
          }

          final count = _pointsCountForPick(
            pickType: effectivePickType,
            status: effectiveStatus,
            selectedRound: selectedRound,
            reachedSemifinal: reachedSemi,
          );

          final theoreticalCount = 1;
          final theoretical = effectiveBasePoints * theoreticalCount;

          final ranking = rankingById[player.id];

          return _PickView(
            player: player,
            ranking: ranking,
            theoreticalPoints: theoretical,
            points: effectiveBasePoints * count,
            status: effectiveStatus,
            outRound: outRound,
          );
        }

        final views = <_PredictionView>[];
        for (final pr in predictionsList) {
          if (pr is! Map) continue;

          final rows = pr['rows'];
          if (rows is! List) continue;

          String? winnerId;
          final semis = <String>[];
          for (final r in rows) {
            if (r is! Map) continue;
            final prediction = (r['prediction'] ?? '').toString().trim().toLowerCase();
            final pid = (r['player_id'] ?? '').toString().trim();
            if (pid.isEmpty) continue;
            if (prediction == 'winner') {
              winnerId = pid;
            } else if (prediction == 'semifinalist') {
              semis.add(pid);
            }
          }

          while (semis.length < 3) {
            semis.add('');
          }

          final winnerPick = buildPick(pickType: _PickType.winner, playerIdRaw: winnerId);
          final semiPicks = <_PickView>[];
          for (var i = 0; i < 3; i++) {
            semiPicks.add(buildPick(pickType: _PickType.semifinalist, playerIdRaw: semis[i]));
          }

          final sortedSemis = semiPicks.toList();
          sortedSemis.sort((a, b) {
            final oa = a.outRound;
            final ob = b.outRound;
            if (oa == null && ob == null) return 0;
            if (oa == null) return -1;
            if (ob == null) return 1;
            return oa.compareTo(ob);
          });

          final userName = (pr['user_soprannome'] ?? pr['user_email'] ?? '').toString().trim();
          final avatarUrl = (pr['avatar_url'] ?? pr['img'] ?? pr['user_image_url'])?.toString();

          final total = winnerPick.points + sortedSemis.fold<int>(0, (sum, p) => sum + p.points);
          final theoreticalTotal = winnerPick.theoreticalPoints + sortedSemis.fold<int>(0, (sum, p) => sum + p.theoreticalPoints);

          views.add(
            _PredictionView(
              userName: userName.isNotEmpty ? userName : 'utente',
              avatarUrl: avatarUrl,
              total: total,
              theoreticalTotal: theoreticalTotal,
              winner: winnerPick,
              semis: sortedSemis,
            ),
          );
        }

        views.sort((a, b) {
          final diff = b.total - a.total;
          if (diff != 0) return diff;
          return a.userName.toLowerCase().compareTo(b.userName.toLowerCase());
        });

        const friendColW = 118.0;
        const pickColW = 118.0;
        final tableW = friendColW + pickColW * 4;
        const rowH = 74.0;

        Widget buildHeaderCell(String text, double width) {
          return SizedBox(
            width: width,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Text(text, style: Theme.of(context).textTheme.labelSmall),
            ),
          );
        }

        Color? bgForStatus(_PickStatus st) {
          final scheme = Theme.of(context).colorScheme;
          switch (st) {
            case _PickStatus.ok:
              return scheme.surface;
            case _PickStatus.inGara:
              return scheme.surface;
            case _PickStatus.esce:
              return scheme.errorContainer;
            case _PickStatus.uscito:
              return scheme.surface;
          }
        }

        double opacityForStatus(_PickStatus st) {
          switch (st) {
            case _PickStatus.inGara:
              return 0.55;
            default:
              return 1.0;
          }
        }

        Widget buildPickCell(_PickView pick) {
          final p = pick.player;
          final name = (p != null) ? _compactPlayerName(p.name) : '-';
          final out = pick.outRound;
          final outLabel = out != null ? 'OUT R$out' : '';
          final bg = bgForStatus(pick.status);
          final op = opacityForStatus(pick.status);

          final ranking = pick.ranking;
          final rankLabel = (ranking != null) ? '[$ranking]' : '[N/D]';
          final info = '${pick.points} - $rankLabel - {${pick.theoreticalPoints}}';

          return SizedBox(
            height: rowH,
            width: pickColW,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
              decoration: BoxDecoration(
                color: bg,
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Opacity(
                opacity: op,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        PlayerAvatar(imageSrc: p?.imageSrc, radius: 10),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      info,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11),
                    ),
                    if (outLabel.isNotEmpty)
                      Text(
                        outLabel,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ),
            ),
          );
        }

        Widget buildFriendCell(_PredictionView v) {
          final info = '${v.total} - {${v.theoreticalTotal}}';
          return SizedBox(
            height: rowH,
            width: friendColW,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Row(
                children: [
                  PlayerAvatar(imageSrc: v.avatarUrl, radius: 10),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          v.userName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          info,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: InkWell(
              onTap: () => _openTournamentPicker(context, api, tid),
              child: Text(t.displayName.isNotEmpty ? t.displayName : 'Sviluppo'),
            ),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SizedBox(
                width: tableW,
                child: Column(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        border: Border(
                          bottom: BorderSide(color: Theme.of(context).dividerColor),
                        ),
                      ),
                      child: Row(
                        children: [
                          buildHeaderCell('FR', friendColW),
                          buildHeaderCell('W', pickColW),
                          buildHeaderCell('SF', pickColW),
                          buildHeaderCell('SF', pickColW),
                          buildHeaderCell('SF', pickColW),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: views.length,
                        itemBuilder: (context, index) {
                          final v = views[index];
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              buildFriendCell(v),
                              buildPickCell(v.winner),
                              buildPickCell(v.semis[0]),
                              buildPickCell(v.semis[1]),
                              buildPickCell(v.semis[2]),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
