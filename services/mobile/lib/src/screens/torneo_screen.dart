import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_context.dart';
import '../api/room_store.dart';
import '../api/tournament_index_store.dart';
import '../config.dart';
import '../models/player.dart';
import '../models/prediction.dart';
import '../models/sviluppo.dart';
import '../models/tournament.dart';
import '../models/tournament_players.dart';
import '../scoring/prediction_scoring.dart';
import '../widgets/debug_json_tile.dart';
import '../widgets/tournament_action_buttons.dart';
import '../widgets/tournament_details_card.dart';
import '../widgets/user_prediction_card.dart';
import 'albero_pronostico_screen.dart';
import 'albero_superuser_screen.dart';

class TorneoScreen extends StatefulWidget {
  final String tournamentId;
  final String? roomId;

  const TorneoScreen({super.key, required this.tournamentId, this.roomId});

  @override
  State<TorneoScreen> createState() => _TorneoScreenState();
}

class _TorneoScreenState extends State<TorneoScreen> {
  final _roomStore = RoomStore();
  final _tournamentIndexStore = TournamentIndexStore();
  static final Map<String, Future<List<Map<String, dynamic>>>> _tournamentFutureCache = {};
  String? _roomId;
  bool _rankingExpanded = false;
  Future<List<Map<String, dynamic>>>? _loadFuture;
  String? _loadKey;
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _myPredictionKey = GlobalKey();

  double _dragDx = 0;

  Future<TournamentIndexSnapshot>? _indexFuture;

  Color _parseHexColor(String hex, {Color fallback = const Color(0xFF1565C0)}) {
    final s = hex.trim();
    if (!RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(s)) return fallback;
    final v = int.tryParse(s.substring(1), radix: 16);
    if (v == null) return fallback;
    return Color(0xFF000000 | v);
  }

  String _normalizeMaterial(String? m) {
    final v = (m ?? '').trim().toLowerCase();
    if (v == 'hard' || v == 'clay' || v == 'grass' || v == 'carpet') return v;
    return 'hard';
  }

  ({Color base, Color accent}) _surfaceColors(TournamentDto t) {
    final material = _normalizeMaterial(t.surface?.material);

    if (material == 'clay') {
      return (base: const Color(0xFFB85A2A), accent: const Color(0xFFF3D6B8));
    }
    if (material == 'grass') {
      return (base: const Color(0xFF1B7F3A), accent: const Color(0xFFCFEAD6));
    }
    if (material == 'carpet') {
      return (base: const Color(0xFF5E35B1), accent: const Color(0xFFD9D2F1));
    }

    final tint = t.surface?.color ?? '';
    final tintColor = _parseHexColor(tint, fallback: const Color(0xFF1565C0));
    return (base: tintColor, accent: const Color(0xFFD9E7FF));
  }

  Decoration _tournamentDecoration(TournamentDto t) {
    final colors = _surfaceColors(t);
    return BoxDecoration(
      gradient: LinearGradient(
        colors: [colors.base.withOpacity(0.22), colors.accent.withOpacity(0.18)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    );
  }

  String _normalizeStatus(String? s) => (s ?? '').trim().toLowerCase();

  String _webRootFromApiBase(String apiBase) {
    var s = apiBase.trim();
    if (s.endsWith('/')) s = s.substring(0, s.length - 1);
    if (s.toLowerCase().endsWith('/api')) s = s.substring(0, s.length - 4);
    return s;
  }

  List<String> _visibleTournamentIds(TournamentIndexSnapshot snap) {
    return snap.tournaments.map((t) => t.id).where((id) => id.trim().isNotEmpty).toList();
  }

  String? _nextTournamentId(TournamentIndexSnapshot snap, String currentId) {
    final ids = _visibleTournamentIds(snap);
    final i = ids.indexOf(currentId);
    if (i < 0 || i + 1 >= ids.length) return null;
    return ids[i + 1];
  }

  String? _prevTournamentId(TournamentIndexSnapshot snap, String currentId) {
    final ids = _visibleTournamentIds(snap);
    final i = ids.indexOf(currentId);
    if (i <= 0) return null;
    return ids[i - 1];
  }

  void _navigateToTournament(BuildContext context, String tournamentId) {
    final rid = (_roomId ?? '').trim();
    final qs = rid.isNotEmpty ? '?room_id=${Uri.encodeQueryComponent(rid)}' : '';
    context.pushReplacement('/tornei/$tournamentId$qs');
  }

  void _onMyPredictionPressed(BuildContext context, String tournamentId) {
    final ctx = _myPredictionKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
        alignment: 0.1,
      );
      return;
    }

    final qs2 = (_roomId != null && _roomId!.isNotEmpty) ? '?room_id=${Uri.encodeQueryComponent(_roomId!)}' : '';
    context.push('/tornei/$tournamentId/pronostico$qs2');
  }

  Future<void> _refresh(ApiClient api, String tournamentId) async {
    final key = '$tournamentId|${_roomId ?? ''}';
    _tournamentFutureCache.remove(key);
    setState(() {
      _loadFuture = null;
      _loadKey = null;
      _indexFuture = _tournamentIndexStore.ensureFresh(api);
    });

    try {
      await _indexFuture;
    } catch (_) {}
    try {
      await _getOrCreateTournamentFuture(api, tournamentId);
    } catch (_) {}
  }

  Future<void> _openTournamentPicker(BuildContext context, ApiClient api, String currentId) async {
    _indexFuture ??= _tournamentIndexStore.ensureFresh(api);
    TournamentIndexSnapshot snap;
    try {
      snap = await _indexFuture!;
    } catch (_) {
      return;
    }

    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            children: [
              for (final t in snap.tournaments)
                ListTile(
                  title: Text(t.displayName),
                  trailing: (t.id == currentId) ? const Icon(Icons.check) : null,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _navigateToTournament(context, t.id);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Future<List<Map<String, dynamic>>> _loadAllFor(ApiClient api, String tournamentId) async {
    Map<String, dynamic> predictionJson;
    try {
      predictionJson = await api.getMyPronostico(tournamentId: tournamentId, roomId: _roomId);
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        predictionJson = <String, dynamic>{
          '_missing_prediction': true,
          'success': true,
          'data': const <dynamic>[],
        };
      } else {
        rethrow;
      }
    }

    final playersJson = await api.getTournamentPlayers(tournamentId: tournamentId);
    final sviluppoJson = await api.getMobileSviluppo(tournamentId: tournamentId, roomId: _roomId);

    // Optional for points computation: scripts + ranking-by-date (fallback to latest)
    final scriptsJson = await api.getTournamentScripts(tournamentId: tournamentId);
    final torneoDto = SviluppoResponseDto.fromApiJson(sviluppoJson).tournament;
    final rankingJson = await api.getPlayersByRankingDate(rankingDate: torneoDto.rankingDate);

    return [predictionJson, playersJson, sviluppoJson, scriptsJson, rankingJson];
  }

  Future<List<Map<String, dynamic>>> _getOrCreateTournamentFuture(ApiClient api, String tournamentId) {
    final key = '$tournamentId|${_roomId ?? ''}';
    return _tournamentFutureCache.putIfAbsent(key, () => _loadAllFor(api, tournamentId));
  }

  void _preloadAdjacent(ApiClient api, String currentId) {
    final f = _indexFuture;
    if (f == null) return;
    f.then((snap) {
      final nextId = _nextTournamentId(snap, currentId);
      final prevId = _prevTournamentId(snap, currentId);
      if (nextId != null) {
        _getOrCreateTournamentFuture(api, nextId);
      }
      if (prevId != null) {
        _getOrCreateTournamentFuture(api, prevId);
      }
    }).catchError((_) {});
  }

  @override
  void initState() {
    super.initState();
    _initRoom();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initRoom() async {
    final stored = await _roomStore.readSelectedRoomId();
    if (!mounted) return;
    setState(() => _roomId = widget.roomId ?? stored);
  }

  @override
  Widget build(BuildContext context) {
    final api = ApiContext.of(context);
    final tid = widget.tournamentId;
    final webRoot = _webRootFromApiBase(AppConfig.apiBase());

    _indexFuture ??= _tournamentIndexStore.ensureFresh(api);

    final currentKey = '$tid|${_roomId ?? ''}';
    if (_loadFuture == null || _loadKey != currentKey) {
      _loadKey = currentKey;
      _loadFuture = _getOrCreateTournamentFuture(api, tid);
    }

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(
              title: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => _openTournamentPicker(context, api, tid),
                child: const Text('Torneo'),
              ),
              actions: [
                IconButton(
                  onPressed: () async {
                    TournamentIndexSnapshot? snap;
                    try {
                      snap = await _indexFuture;
                    } catch (_) {
                      snap = null;
                    }
                    if (snap == null) return;
                    final prevId = _prevTournamentId(snap, tid);
                    if (prevId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Sei già al primo torneo')),
                      );
                      return;
                    }
                    _navigateToTournament(context, prevId);
                  },
                  icon: const Icon(Icons.chevron_left),
                  tooltip: 'Torneo precedente',
                ),
                IconButton(
                  onPressed: () async {
                    TournamentIndexSnapshot? snap;
                    try {
                      snap = await _indexFuture;
                    } catch (_) {
                      snap = null;
                    }
                    if (snap == null) return;
                    final nextId = _nextTournamentId(snap, tid);
                    if (nextId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Sei già all\'ultimo torneo')),
                      );
                      return;
                    }
                    _navigateToTournament(context, nextId);
                  },
                  icon: const Icon(Icons.chevron_right),
                  tooltip: 'Torneo successivo',
                ),
                IconButton(
                  onPressed: () => _onMyPredictionPressed(context, tid),
                  icon: const Icon(Icons.person),
                  tooltip: 'Mio pronostico',
                ),
              ],
            ),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(
              title: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => _openTournamentPicker(context, api, tid),
                child: const Text('Torneo'),
              ),
              actions: [
                IconButton(
                  onPressed: () => _onMyPredictionPressed(context, tid),
                  icon: const Icon(Icons.person),
                  tooltip: 'Mio pronostico',
                ),
              ],
            ),
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
            appBar: AppBar(
              title: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => _openTournamentPicker(context, api, tid),
                child: const Text('Torneo'),
              ),
              actions: [
                IconButton(
                  onPressed: () => _onMyPredictionPressed(context, tid),
                  icon: const Icon(Icons.person),
                  tooltip: 'Mio pronostico',
                ),
              ],
            ),
            body: const Center(child: Text('Nessun dato')),
          );
        }

        final predictionJson = list[0];
        final playersJson = list[1];
        final sviluppoJson = list[2];
        final scriptsJson = list.length > 3 ? list[3] : <String, dynamic>{};
        final rankingJson = list.length > 4 ? list[4] : <String, dynamic>{};

        _preloadAdjacent(api, tid);

        final missingPrediction = predictionJson['_missing_prediction'] == true;
        final prediction = PredictionResponseDto.fromApiJson(predictionJson);
        final players = TournamentPlayersResponseDto.fromApiJson(playersJson);

        final playerById = <String, PlayerDto>{
          for (final p in players.players)
            if (p.id.isNotEmpty) p.id: p,
        };

        final dto = SviluppoResponseDto.fromApiJson(sviluppoJson);
        final t = dto.tournament;
        final status = _normalizeStatus(t.status);
        final rid = (_roomId ?? '').trim();
        final qs = rid.isNotEmpty ? '?room_id=${Uri.encodeQueryComponent(rid)}' : '';
        final ranking = dto.tournamentRanking;

        PredictionScoringProfile scoringProfile = PredictionScoringProfile.standard;
        try {
          final data = (scriptsJson['data'] is Map) ? (scriptsJson['data'] as Map) : null;
          final list = (data != null && data['Scripts'] is List) ? (data['Scripts'] as List) : null;
          final names = (list ?? [])
              .map((s) => (s is Map) ? (s['name'] ?? '').toString() : '')
              .where((x) => x.isNotEmpty)
              .toSet();
          if (names.contains('AOpenWinner') || names.contains('AOpenSemifinalist')) {
            scoringProfile = PredictionScoringProfile.aOpen;
          }
        } catch (_) {
          scoringProfile = PredictionScoringProfile.standard;
        }

        final rankingById = <String, int>{};
        try {
          final data = rankingJson['data'];
          if (data is List) {
            for (final p in data) {
              if (p is! Map) continue;
              final id = (p['id'] ?? '').toString();
              if (id.isEmpty) continue;

              // Fallback name/icon source: ranking endpoint already includes player info.
              // Tournament players endpoint might not include all picked players.
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

        int? computedScore;
        final picks = <PredictionPick>[];
        if (!missingPrediction) {
          int pointsForWinner(String? playerId) {
            if (playerId == null || playerId.isEmpty) return 0;
            final r = rankingById[playerId];
            if (r == null) return 0;
            return scoringProfile.winnerPoints(r);
          }

          int pointsForSemi(String? playerId) {
            if (playerId == null || playerId.isEmpty) return 0;
            final r = rankingById[playerId];
            if (r == null) return 0;
            return scoringProfile.semifinalistPoints(r);
          }

          final seen = <String>{};
          void addPick(String? playerId, String role, int points) {
            final id = (playerId ?? '').trim();
            if (id.isEmpty) return;
            if (seen.contains(id)) return;
            seen.add(id);
            picks.add(PredictionPick(playerId: id, role: role, points: points));
          }

          addPick(prediction.winnerPlayerId, 'winner', pointsForWinner(prediction.winnerPlayerId));

          final semiIds = prediction.rows
              .where((r) => r.prediction.toLowerCase() == 'semifinalist')
              .map((r) => r.playerId)
              .where((id) => id.isNotEmpty)
              .toList();

          for (final id in semiIds) {
            addPick(id, 'semifinalist', pointsForSemi(id));
            if (picks.length >= 4) break;
          }

          computedScore = picks.fold<int>(0, (sum, p) => sum + p.points);
        }

        return Scaffold(
          appBar: AppBar(
            title: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => _openTournamentPicker(context, api, tid),
              child: Text(t.displayName.isNotEmpty ? t.displayName : 'Torneo'),
            ),
            actions: [
              IconButton(
                onPressed: () => _onMyPredictionPressed(context, tid),
                icon: const Icon(Icons.person),
                tooltip: 'Mio pronostico',
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () => _refresh(api, tid),
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onHorizontalDragStart: (_) {
                _dragDx = 0;
              },
              onHorizontalDragUpdate: (details) {
                _dragDx += details.delta.dx;
              },
              onHorizontalDragEnd: (details) async {
                final dx = _dragDx;
                _dragDx = 0;
                if (dx.abs() < 60) return;
                TournamentIndexSnapshot? snap;
                try {
                  snap = await _indexFuture;
                } catch (_) {
                  snap = null;
                }
                if (snap == null) return;
                if (!context.mounted) return;

                // dx < 0 means user dragged left (go next)
                if (dx < 0) {
                  final nextId = _nextTournamentId(snap, tid);
                  if (nextId == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Sei già all\'ultimo torneo')),
                    );
                    return;
                  }
                  _navigateToTournament(context, nextId);
                  return;
                }

                final prevId = _prevTournamentId(snap, tid);
                if (prevId == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Sei già al primo torneo')),
                  );
                  return;
                }
                _navigateToTournament(context, prevId);
              },
              child: ListView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  TournamentDetailsCard(
                    tournament: t,
                    actions: TournamentActionButtons(
                      status: status,
                      hasSuperuserTree: dto.hasSuperuserTree,
                      onOpenSviluppo: (status == 'in-progress' || status == 'completed')
                          ? () {
                              context.push('/tornei/${t.id}/sviluppo$qs');
                            }
                          : null,
                      onOpenPronostico: (status == 'open')
                          ? () {
                              context.push('/tornei/${t.id}/pronostico$qs');
                            }
                          : null,
                      onOpenSuperuserTree: dto.hasSuperuserTree
                          ? () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AlberoSuperuserScreen(tournamentId: t.id),
                                ),
                              );
                            }
                          : null,
                      onOpenVincereFacile: (status == 'open' && dto.hasSuperuserTree)
                          ? () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AlberoPronosticoScreen(
                                    tournamentId: t.id,
                                    roomId: qs.isNotEmpty ? qs.replaceFirst('?room_id=', '') : null,
                                  ),
                                ),
                              );
                            }
                          : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (!missingPrediction) ...[
                    KeyedSubtree(
                      key: _myPredictionKey,
                      child: UserPredictionCard(
                        prediction: prediction,
                        playerById: playerById,
                        computedScore: computedScore,
                        picks: picks,
                        decoration: _tournamentDecoration(t),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (status == 'completed' && ranking != null) ...[
                    Card(
                      clipBehavior: Clip.antiAlias,
                      child: Ink(
                        decoration: _tournamentDecoration(t),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () {
                            setState(() => _rankingExpanded = !_rankingExpanded);
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        'Classifica torneo',
                                        style: Theme.of(context).textTheme.titleMedium,
                                      ),
                                    ),
                                    Icon(_rankingExpanded ? Icons.expand_less : Icons.expand_more),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                if (ranking.winners.isNotEmpty)
                                  _InfoRow(
                                    label: 'Vincitori',
                                    value: ranking.winners
                                        .map((w) => w.userSoprannome.isNotEmpty ? w.userSoprannome : w.userUuid)
                                        .join(', '),
                                  )
                                else if (ranking.winner != null)
                                  _InfoRow(label: 'Vincitore', value: ranking.winner!.userSoprannome),
                                AnimatedCrossFade(
                                  firstChild: const SizedBox.shrink(),
                                  secondChild: Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: ranking.rows.isEmpty
                                        ? const Text('Nessun partecipante')
                                        : Card(
                                            child: Column(
                                              children: [
                                                for (final r in ranking.rows)
                                                  ListTile(
                                                    dense: true,
                                                    visualDensity: const VisualDensity(vertical: -3),
                                                    contentPadding:
                                                        const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                                                    title: Text(
                                                      r.userSoprannome.isNotEmpty ? r.userSoprannome : r.userUuid,
                                                    ),
                                                    trailing: Text(
                                                      _formatIntIt(r.points),
                                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                                    ),
                                                  )
                                              ],
                                            ),
                                          ),
                                  ),
                                  crossFadeState: _rankingExpanded
                                      ? CrossFadeState.showSecond
                                      : CrossFadeState.showFirst,
                                  duration: const Duration(milliseconds: 200),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Ink(
                      decoration: _tournamentDecoration(t),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Riepilogo', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 8),
                            _InfoRow(label: 'Pronostici stanza', value: dto.predictionsCount.toString()),
                            _InfoRow(label: 'Superuser tree', value: dto.hasSuperuserTree ? 'OK' : 'N/A'),
                            if (dto.hasSuperuserTree)
                              _InfoRow(label: 'Match nel tree', value: dto.superuserMatchesCount.toString()),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DebugJsonTile(json: {
                    'prediction': predictionJson,
                    'players': playersJson,
                    'sviluppo': sviluppoJson,
                  }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label)),
        const SizedBox(width: 12),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

String _formatIntIt(int v) {
  final s = v.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final posFromEnd = s.length - i;
    buf.write(s[i]);
    if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
  }
  return buf.toString();
}
