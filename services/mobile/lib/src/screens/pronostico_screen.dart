import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../api/api_context.dart';
import '../api/room_store.dart';
import '../config.dart';
import '../models/player.dart';
import '../models/prediction.dart';
import '../models/sviluppo.dart';
import '../models/tournament.dart';
import '../models/tournament_players.dart';
import '../scoring/prediction_scoring.dart';
import '../widgets/debug_json_tile.dart';
import '../widgets/player_avatar.dart';
import '../widgets/tournament_action_buttons.dart';
import '../widgets/tournament_details_card.dart';
import 'albero_superuser_screen.dart';

class PronosticoScreen extends StatefulWidget {
  final String tournamentId;
  final String? roomId;

  const PronosticoScreen({super.key, required this.tournamentId, this.roomId});

  @override
  State<PronosticoScreen> createState() => _PronosticoScreenState();
}

class _PronosticoScreenState extends State<PronosticoScreen> {
  final _roomStore = RoomStore();
  String? _roomId;

  Future<List<Map<String, dynamic>>>? _loadFuture;
  String? _loadKey;

  final ScrollController _scrollController = ScrollController();

  String? _computedKey;
  TournamentDto? _tournament;
  String _status = '';
  bool _isLockedTournament = false;
  bool _missingPrediction = false;
  bool _hasSuperuserTree = false;
  PredictionResponseDto? _prediction;
  Map<String, PlayerDto> _playerById = <String, PlayerDto>{};
  Map<String, int> _rankingById = <String, int>{};
  List<PlayerDto> _orderedPlayers = <PlayerDto>[];
  Set<String> _disabledPlayerIds = <String>{};
  PredictionScoringProfile _scoringProfile = PredictionScoringProfile.standard;
  String _qs = '';
  String _webRoot = '';

  final Set<String> _selectedIds = <String>{};
  String? _winnerId;
  bool _initializedFromServer = false;

  Future<List<Map<String, dynamic>>> _load(ApiClient api, String tournamentId, String? roomId) async {
    Map<String, dynamic> predictionJson;
    try {
      predictionJson = await api.getMyPronostico(tournamentId: tournamentId, roomId: roomId);
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
    final sviluppoJson = await api.getMobileSviluppo(tournamentId: tournamentId, roomId: roomId);

    final scriptsJson = await api.getTournamentScripts(tournamentId: tournamentId);
    final torneoDto = SviluppoResponseDto.fromApiJson(sviluppoJson).tournament;
    final rankingJson = await api.getPlayersByRankingDate(rankingDate: torneoDto.rankingDate);
    return [predictionJson, playersJson, sviluppoJson, scriptsJson, rankingJson];
  }

  String _normalizeStatus(String? s) => (s ?? '').trim().toLowerCase();

  String _webRootFromApiBase(String apiBase) {
    var s = apiBase.trim();
    if (s.endsWith('/')) s = s.substring(0, s.length - 1);
    if (s.toLowerCase().endsWith('/api')) s = s.substring(0, s.length - 4);
    return s;
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

    final currentKey = '$tid|${_roomId ?? ''}';
    if (_loadFuture == null || _loadKey != currentKey) {
      _loadKey = currentKey;
      _loadFuture = _load(api, tid, _roomId);
      _initializedFromServer = false;
      _computedKey = null;
    }

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _loadFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(title: const Text('Torneo')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Torneo')),
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
            appBar: AppBar(title: const Text('Torneo')),
            body: const Center(child: Text('Nessun dato')),
          );
        }

        final predictionJson = list[0];
        final playersJson = list[1];
        final sviluppoJson = list[2];
        final scriptsJson = list.length > 3 ? list[3] : <String, dynamic>{};
        final rankingJson = list.length > 4 ? list[4] : <String, dynamic>{};

        if (_computedKey != currentKey) {
          final players = TournamentPlayersResponseDto.fromApiJson(playersJson);
          final sviluppo = SviluppoResponseDto.fromApiJson(sviluppoJson);
          final t = sviluppo.tournament;
          final status = _normalizeStatus(t.status);
          final rid = (_roomId ?? '').trim();
          final qs = rid.isNotEmpty ? '?room_id=${Uri.encodeQueryComponent(rid)}' : '';

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

          final playerById = <String, PlayerDto>{
            for (final p in players.players)
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
                final rankings = p['Rankings'];
                if (rankings is List && rankings.isNotEmpty && rankings.first is Map) {
                  final r = rankings.first as Map;
                  final raw = r['ranking'];
                  final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
                  if (n != null) rankingById[id] = n;
                }

                if (!playerById.containsKey(id)) {
                  try {
                    playerById[id] = PlayerDto.fromJson(p.cast<String, dynamic>());
                  } catch (_) {}
                }
              }
            }
          } catch (_) {}

          Set<String> computeDisabledPlayerIdsFromSuperTree(Map<String, dynamic> sviluppoApiJson) {
            try {
              final data = sviluppoApiJson['data'];
              if (data is! Map) return <String>{};
              final treeRaw = data['superuserTree'];
              if (treeRaw is! Map) return <String>{};
              final matchesRaw = treeRaw['Matches'];
              if (matchesRaw is! List || matchesRaw.isEmpty) return <String>{};

              final rounds = <int>[];
              for (final m in matchesRaw) {
                if (m is! Map) continue;
                final r = m['round'];
                final n = (r is num) ? r.toInt() : int.tryParse(r?.toString() ?? '');
                if (n != null) rounds.add(n);
              }
              if (rounds.isEmpty) return <String>{};
              final firstRound = rounds.reduce((a, b) => a > b ? a : b);

              final firstRoundPlayerIds = <String>{};
              for (final m in matchesRaw) {
                if (m is! Map) continue;
                final r = m['round'];
                final n = (r is num) ? r.toInt() : int.tryParse(r?.toString() ?? '');
                if (n == null || n != firstRound) continue;

                final p1 = (m['player1Id'] ?? m['player1_id'] ?? m['player1'] ?? '').toString();
                final p2 = (m['player2Id'] ?? m['player2_id'] ?? m['player2'] ?? '').toString();
                if (p1.isNotEmpty) firstRoundPlayerIds.add(p1);
                if (p2.isNotEmpty) firstRoundPlayerIds.add(p2);
              }

              final eliminated = <String>{};
              for (final m in matchesRaw) {
                if (m is! Map) continue;
                final p1 = (m['player1Id'] ?? m['player1_id'] ?? m['player1'] ?? '').toString();
                final p2 = (m['player2Id'] ?? m['player2_id'] ?? m['player2'] ?? '').toString();
                final p1Wins = (m['p1Wins'] == true) || (m['p1_wins'] == true);
                final p2Wins = (m['p2Wins'] == true) || (m['p2_wins'] == true);
                if (p1Wins && p2.isNotEmpty) eliminated.add(p2);
                if (p2Wins && p1.isNotEmpty) eliminated.add(p1);
              }

              final disabled = <String>{};
              for (final p in playerById.values) {
                if (p.id.isEmpty) continue;
                if (!firstRoundPlayerIds.contains(p.id) || eliminated.contains(p.id)) {
                  disabled.add(p.id);
                }
              }
              return disabled;
            } catch (_) {
              return <String>{};
            }
          }

          final orderedPlayers = playerById.values.toList();
          orderedPlayers.sort((a, b) {
            final ra = rankingById[a.id];
            final rb = rankingById[b.id];
            if (ra == null && rb == null) return a.name.compareTo(b.name);
            if (ra == null) return 1;
            if (rb == null) return -1;
            return ra.compareTo(rb);
          });

          _computedKey = currentKey;
          _tournament = t;
          _status = status;
          _webRoot = _webRootFromApiBase(AppConfig.apiBase());
          _qs = qs;
          _isLockedTournament = status == 'completed' || status == 'in-progress' || status == 'excluded';
          _missingPrediction = predictionJson['_missing_prediction'] == true;
          _hasSuperuserTree = sviluppo.hasSuperuserTree;
          _prediction = PredictionResponseDto.fromApiJson(predictionJson);
          _playerById = playerById;
          _rankingById = rankingById;
          _orderedPlayers = orderedPlayers;
          _disabledPlayerIds = computeDisabledPlayerIdsFromSuperTree(sviluppoJson);
          _scoringProfile = scoringProfile;
        }

        final t = _tournament!;
        final status = _status;
        final webRoot = _webRoot;
        final qs = _qs;
        final isLockedTournament = _isLockedTournament;
        final missingPrediction = _missingPrediction;
        final prediction = _prediction!;
        final rankingById = _rankingById;
        final playerById = _playerById;
        final orderedPlayers = _orderedPlayers;
        final disabledPlayerIds = _disabledPlayerIds;
        final scoringProfile = _scoringProfile;
        final hasSuperuserTree = _hasSuperuserTree;

        final rid = (_roomId ?? '').trim();

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

        String playerName(String id) {
          final p = playerById[id];
          return p != null && p.name.isNotEmpty ? p.name : 'ID $id';
        }

        void initSelectionFromServerOnce() {
          if (_initializedFromServer) return;
          _initializedFromServer = true;

          _selectedIds.clear();
          for (final r in prediction.rows) {
            final id = r.playerId.trim();
            if (id.isEmpty) continue;
            if (r.prediction.toLowerCase() == 'winner') {
              _selectedIds.add(id);
              _winnerId = id;
              continue;
            }
            if (r.prediction.toLowerCase() == 'semifinalist') {
              _selectedIds.add(id);
            }
          }

          if (_selectedIds.length > 4) {
            // Keep deterministic order: prefer winner + first 3 semifinalists from server order.
            final keep = <String>[];
            if (_winnerId != null) keep.add(_winnerId!);
            for (final r in prediction.rows) {
              final id = r.playerId.trim();
              if (id.isEmpty) continue;
              if (keep.contains(id)) continue;
              if (_selectedIds.contains(id)) keep.add(id);
              if (keep.length >= 4) break;
            }
            _selectedIds
              ..clear()
              ..addAll(keep);
          }
          if (_winnerId != null && !_selectedIds.contains(_winnerId)) {
            _winnerId = null;
          }
        }

        initSelectionFromServerOnce();

        bool isPredictionReady() {
          return _selectedIds.length == 4 && _winnerId != null && _selectedIds.contains(_winnerId);
        }

        int totalPoints() {
          var total = 0;
          for (final id in _selectedIds) {
            if (id == _winnerId) {
              total += pointsForWinner(id);
            } else {
              total += pointsForSemi(id);
            }
          }
          return total;
        }

        void onTogglePlayer(String playerId, bool checked) {
          if (isLockedTournament) return;

          setState(() {
            if (checked) {
              if (disabledPlayerIds.contains(playerId)) return;
              if (_selectedIds.length >= 4) {
                return;
              }
              _selectedIds.add(playerId);
            } else {
              _selectedIds.remove(playerId);
              if (_winnerId == playerId) {
                _winnerId = null;
              }
            }
          });
        }

        Future<void> onSave() async {
          if (isLockedTournament) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Pronostico non modificabile per questo torneo')),
            );
            return;
          }
          if (!isPredictionReady()) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Devi selezionare 4 semifinalisti e un vincitore')),
            );
            return;
          }

          final rows = <Map<String, dynamic>>[];
          for (final id in _selectedIds) {
            rows.add({
              'player_id': id,
              'prediction': (id == _winnerId) ? 'winner' : 'semifinalist',
            });
          }

          try {
            await api.createPrediction(tournamentId: tid, rows: rows, roomId: rid.isNotEmpty ? rid : null);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Pronostico salvato')),
            );
            setState(() {
              _loadFuture = null;
            });
          } catch (e) {
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Errore salvataggio: $e')),
            );
          }
        }

        Future<void> onDelete() async {
          if (isLockedTournament) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Pronostico non modificabile per questo torneo')),
            );
            return;
          }

          final ok = await showDialog<bool>(
            context: context,
            builder: (ctx) {
              return AlertDialog(
                title: const Text('Elimina pronostico'),
                content: const Text('Vuoi eliminare il pronostico?'),
                actions: [
                  TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Annulla')),
                  FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Elimina')),
                ],
              );
            },
          );
          if (ok != true) return;

          try {
            await api.deletePrediction(tournamentId: tid, roomId: rid.isNotEmpty ? rid : null);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Pronostico eliminato')),
            );
            setState(() {
              _selectedIds.clear();
              _winnerId = null;
              _loadFuture = null;
            });
          } catch (e) {
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Errore eliminazione: $e')),
            );
          }
        }

        final ready = isPredictionReady();
        final total = totalPoints();

        return Scaffold(
          appBar: AppBar(title: Text(t.displayName.isNotEmpty ? t.displayName : 'Torneo')),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: (isLockedTournament || !ready) ? null : onSave,
                      child: Text(missingPrediction ? 'Invia pronostico' : 'Salva pronostico'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: (isLockedTournament || missingPrediction) ? null : onDelete,
                    child: const Text('Cancella'),
                  ),
                ],
              ),
            ),
          ),
          body: CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    TournamentDetailsCard(
                      tournament: t,
                      actions: TournamentActionButtons(
                        status: status,
                        hasSuperuserTree: hasSuperuserTree,
                        onOpenSviluppo: (status == 'in-progress' || status == 'completed')
                            ? () {
                                context.push('/tornei/${t.id}/sviluppo$qs');
                              }
                            : null,
                        onOpenSuperuserTree: hasSuperuserTree
                            ? () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => AlberoSuperuserScreen(tournamentId: tid),
                                  ),
                                );
                              }
                            : null,
                        onOpenPronostico: null,
                        onOpenVincereFacile: null,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (isLockedTournament)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            status == 'in-progress'
                                ? 'Pronostico non modificabile: il torneo è in corso.'
                                : status == 'completed'
                                    ? 'Pronostico non modificabile: il torneo è completato.'
                                    : status == 'excluded'
                                        ? 'Pronostico non modificabile: il torneo è escluso.'
                                        : 'Pronostico non modificabile.',
                          ),
                        ),
                      ),
                    if (missingPrediction) ...[
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Non hai ancora inserito il pronostico per questo torneo.'),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Pronostico', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 8),
                            _InfoRow(label: 'Selezionati', value: '${_selectedIds.length}/4'),
                            _InfoRow(label: 'Totale punteggio', value: total.toString()),
                            _InfoRow(label: 'Vincitore', value: _winnerId != null ? playerName(_winnerId!) : '-'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const SizedBox(height: 12),
                    Text('I tuoi semifinalisti', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Card(
                      child: Column(
                        children: () {
                          final ids = _selectedIds.toList();
                          ids.sort((a, b) {
                            if (a == _winnerId && b != _winnerId) return -1;
                            if (b == _winnerId && a != _winnerId) return 1;
                            return playerName(a).compareTo(playerName(b));
                          });

                          final slots = List<String?>.generate(4, (i) => i < ids.length ? ids[i] : null);
                          return [
                            for (var i = 0; i < slots.length; i++)
                              ListTile(
                                leading: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (slots[i] != null && !isLockedTournament)
                                      IconButton(
                                        icon: const Icon(Icons.close, size: 18),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        visualDensity: VisualDensity.compact,
                                        onPressed: () => onTogglePlayer(slots[i]!, false),
                                      )
                                    else
                                      const SizedBox(width: 28),
                                    const SizedBox(width: 4),
                                    PlayerAvatar(
                                      imageSrc: slots[i] != null ? playerById[slots[i]]?.imageSrc : null,
                                    ),
                                  ],
                                ),
                                title: Text(slots[i] != null ? playerName(slots[i]!) : 'Seleziona un giocatore'),
                                subtitle: Text(
                                  slots[i] == null
                                      ? '-'
                                      : (slots[i] == _winnerId ? 'winner' : 'semifinalist'),
                                ),
                                trailing: (slots[i] == null)
                                    ? null
                                    : Radio<String>(
                                        value: slots[i]!,
                                        groupValue: _winnerId,
                                        onChanged: (isLockedTournament)
                                            ? null
                                            : (v) {
                                                if (v == null) return;
                                                setState(() => _winnerId = v);
                                              },
                                      ),
                              ),
                          ];
                        }(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text('Seleziona i semifinalisti (max 4)', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                  ]),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final p = orderedPlayers[index];
                      final disabled = isLockedTournament || disabledPlayerIds.contains(p.id);
                      return CheckboxListTile(
                        value: _selectedIds.contains(p.id),
                        onChanged: disabled
                            ? null
                            : (v) {
                                final checked = v == true;
                                if (checked && _selectedIds.length >= 4) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Puoi selezionare massimo 4 semifinalisti!')),
                                  );
                                  return;
                                }
                                onTogglePlayer(p.id, checked);
                              },
                        secondary: PlayerAvatar(
                          imageSrc: p.imageSrc,
                          opacity: disabled ? 0.35 : 1.0,
                        ),
                        title: Text(p.name),
                        subtitle: Text(
                          () {
                            final r = rankingById[p.id];
                            final rankText = (r != null) ? 'Ranking: $r' : 'Ranking: -';
                            final semiPts = pointsForSemi(p.id);
                            final winPts = pointsForWinner(p.id);
                            return '$rankText | semi: $semiPts | winner: $winPts';
                          }(),
                        ),
                      );
                    },
                    childCount: orderedPlayers.length,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 12),
                    DebugJsonTile(json: {
                      'prediction': predictionJson,
                      'players': playersJson,
                      'sviluppo': sviluppoJson,
                    }),
                  ]),
                ),
              ),
            ],
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
