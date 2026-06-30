import 'package:flutter/material.dart';

import '../api/api_context.dart';
import '../api/api_client.dart';
import '../models/player.dart';
import '../models/tree.dart';
import '../scoring/prediction_scoring.dart';
import '../widgets/player_avatar.dart';
import '../widgets/tournament_tree_map.dart';

const _roundLabels = ['', 'Finale', 'Semifinale', 'Quarti', 'R16', 'R32', 'R64', 'R128'];

String _roundLabel(int round) =>
    (round >= 0 && round < _roundLabels.length) ? _roundLabels[round] : 'Round $round';

class AlberoPronosticoScreen extends StatefulWidget {
  final String tournamentId;
  final String? roomId;

  const AlberoPronosticoScreen({
    super.key,
    required this.tournamentId,
    this.roomId,
  });

  @override
  State<AlberoPronosticoScreen> createState() => _AlberoPronosticoScreenState();
}

class _AlberoPronosticoScreenState extends State<AlberoPronosticoScreen> {
  bool _loading = true;
  String? _error;
  TreeDto? _tree;
  List<MatchDto> _matches = [];
  Map<int, PlayerDto> _playerById = {};
  Map<int, int> _playerRankingById = {};
  bool _dirty = false;
  bool _saving = false;

  int _currentRound = 0;
  int _currentMatchIndexInRound = 0;
  String? _selectedMatchId;

  Map<String, int> _matchLeafStartIndex = {};

  bool _initialized = false;
  PageController _pageController = PageController(initialPage: 0, viewportFraction: 0.55);

  Future<void> _resetTreeFromSuperuser() async {
    final api = ApiContext.of(context);
    final treeId = _tree?.id;
    if (treeId == null || treeId.trim().isEmpty) return;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ricarica tabellone'),
        content: const Text(
          'Vuoi cancellare il tuo tabellone e ricaricarlo dai risultati ufficiali? Le modifiche non salvate andranno perse.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Annulla')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Ricarica')),
        ],
      ),
    );
    if (ok != true) return;

    setState(() {
      _loading = true;
      _error = null;
      _dirty = false;
    });

    try {
      await api.deleteTree(treeId: treeId);
      await _cloneTree(api);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Impossibile ricaricare il tabellone: $e');
    } finally {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _resetPageController({required int initialPage}) {
    _pageController.dispose();
    _pageController = PageController(initialPage: initialPage, viewportFraction: 0.55);
  }

  void _recomputePlayersFromResults() {
    if (_tree == null || _matches.isEmpty) return;

    // We consider player1Id/player2Id of non-leaf rounds as derived data.
    // On reload they may be null in DB, so we rebuild them deterministically
    // from leaf players and winner flags.
    final byUuid = <String, int>{};
    for (var i = 0; i < _matches.length; i++) {
      byUuid[_matches[i].uuid] = i;
    }

    for (var r = _tree!.roundMax; r >= 2; r--) {
      final roundMatches = _matches.where((m) => m.round == r).toList();
      for (final child in roundMatches) {
        final winnerId = child.winnerId;
        final fatherId = child.fatherId;
        if (winnerId == null) continue;
        if (fatherId == null || fatherId.trim().isEmpty) continue;

        final pIdx = byUuid[fatherId];
        if (pIdx == null) continue;
        final parent = _matches[pIdx];

        final isLeft = (child.childIndex != null)
            ? child.childIndex == 0
            : (() {
                // Fallback stable order
                final siblings = _matches.where((m) => m.fatherId == fatherId).toList()
                  ..sort((a, b) => a.uuid.compareTo(b.uuid));
                return siblings.isNotEmpty && siblings.first.uuid == child.uuid;
              })();

        final nextP1 = isLeft ? winnerId : parent.player1Id;
        final nextP2 = isLeft ? parent.player2Id : winnerId;
        if (nextP1 != parent.player1Id || nextP2 != parent.player2Id) {
          _matches[pIdx] = parent.copyWith(player1Id: nextP1, player2Id: nextP2);
        }
      }
    }
  }

  bool _isTopHalfMatch(MatchDto match) {
    final tree = _tree;
    if (tree == null) return true;
    final totalLeaves = 1 << (tree.roundMax - 1);
    final start = _matchLeafStartIndex[match.uuid];
    if (start == null) return true;
    return start < (totalLeaves / 2);
  }

  Color _matchCardColor(MatchDto match) {
    final isTop = _isTopHalfMatch(match);
    return isTop ? Colors.red.shade50 : Colors.blue.shade50;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _init();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ApiContext.of(context);
      await _loadPlayers(api);
      await _loadOrCloneTree(api);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadPlayers(api) async {
    try {
      final raw = await api.getPlayersByRankingDate();
      final data = raw['data'];
      final map = <int, PlayerDto>{};
      final rankingMap = <int, int>{};
      if (data is List) {
        for (var i = 0; i < data.length; i++) {
          final p = data[i];
          if (p is! Map) continue;
          final id = int.tryParse((p['id'] ?? '').toString());
          if (id == null) continue;
          try {
            map[id] = PlayerDto.fromJson(p.cast<String, dynamic>());
            rankingMap[id] = i + 1;
          } catch (_) {}
        }
      }
      _playerById = map;
      _playerRankingById = rankingMap;
    } catch (e) {
      debugPrint('_loadPlayers error: $e');
    }
  }

  Future<void> _loadOrCloneTree(api) async {
    TreeDto? tree;
    try {
      final currentUserUuid = await api.getCurrentUserUuid();
      debugPrint('[AlberoPronostico] currentUserUuid=$currentUserUuid tournamentId=${widget.tournamentId}');
      final raw = await api.getUserTreeByTournament(tournamentId: widget.tournamentId);
      final data = raw['data'];
      debugPrint('[AlberoPronostico] GET /trees dataType=${data.runtimeType}');
      if (data is List && data.isNotEmpty) {
        try {
          final owners = data
              .whereType<Map>()
              .map((t) => 'id=${t['id']} ownerId=${t['ownerId']} matches=${(t['Matches'] is List) ? (t['Matches'] as List).length : (t['matches'] is List ? (t['matches'] as List).length : 'n/a')}')
              .toList();
          debugPrint('[AlberoPronostico] /trees returned ${data.length} trees: ${owners.join(' | ')}');
        } catch (e) {
          debugPrint('[AlberoPronostico] log trees list failed: $e');
        }
        if (currentUserUuid != null) {
          final found = data.whereType<Map>().cast<Map<String, dynamic>>().where((t) {
            final ownerId = (t['ownerId'] ?? '').toString();
            return ownerId == currentUserUuid;
          }).toList();
          if (found.isNotEmpty) {
            try {
              final rawMatches = (found.first['Matches'] ?? found.first['matches']);
              if (rawMatches is List && rawMatches.isNotEmpty && rawMatches.first is Map) {
                final first = (rawMatches.first as Map).cast<dynamic, dynamic>();
                debugPrint('[AlberoPronostico] raw first match keys=${first.keys.toList()}');
                debugPrint('[AlberoPronostico] raw first match sample p1=${first['player1Id'] ?? first['player1_id'] ?? first['player1']} p2=${first['player2Id'] ?? first['player2_id'] ?? first['player2']}');
              }
            } catch (e) {
              debugPrint('[AlberoPronostico] raw matches inspection failed: $e');
            }
            tree = TreeDto.fromJson(found.first);
          } else {
            // Non esiste ancora un albero per l'utente: clona quello del superuser.
            await _cloneTree(api);
            return;
          }
        } else {
          tree = TreeDto.fromJson(data.last as Map<String, dynamic>);
        }
      } else if (data is Map<String, dynamic>) {
        tree = TreeDto.fromJson(data);
      }
    } catch (e) {
      if (e.toString().contains('404')) tree = null;
    }

    if (tree == null) {
      await _cloneTree(api);
      return;
    }

    _setTree(tree);
  }

  Future<void> _cloneTree(api) async {
    setState(() => _error = null);
    try {
      debugPrint('[AlberoPronostico] cloning superuser tree tournamentId=${widget.tournamentId}');
      final raw = await api.cloneSuperuserTree(tournamentId: widget.tournamentId);
      final data = raw['data'] ?? raw;
      final tree = TreeDto.fromJson(data is Map<String, dynamic> ? data : raw);
      debugPrint('[AlberoPronostico] clone ok treeId=${tree.id} ownerId=${tree.ownerId} matches=${tree.matches.length}');
      _setTree(tree);
    } catch (e) {
      if (e.toString().contains('409')) {
        debugPrint('[AlberoPronostico] clone returned 409, reloading user tree');
        await _loadOrCloneTree(api);
        return;
      }
      setState(() => _error = 'Tabellone non disponibile: $e');
    }
  }

  void _setTree(TreeDto tree) {
    _tree = tree;
    _matches = List.of(tree.matches);
    _matchLeafStartIndex = _computeMatchLeafStartIndex(_matches, tree.roundMax);
    _recomputePlayersFromResults();
    debugPrint('[AlberoPronostico] setTree treeId=${tree.id} ownerId=${tree.ownerId} roundMax=${tree.roundMax} matches=${tree.matches.length}');
    try {
      final withAnyPlayer = tree.matches.where((m) => (m.player1Id != null && m.player1Id != 0) || (m.player2Id != null && m.player2Id != 0)).length;
      final leafWithPlayers = tree.matches
          .where((m) => m.round == tree.roundMax)
          .where((m) => (m.player1Id != null && m.player1Id != 0) || (m.player2Id != null && m.player2Id != 0))
          .length;
      debugPrint('[AlberoPronostico] matchesWithAnyPlayer=$withAnyPlayer leafMatchesWithPlayers=$leafWithPlayers');

      final leaf = tree.matches.firstWhere(
        (m) => m.round == tree.roundMax,
        orElse: () => tree.matches.first,
      );
      debugPrint('[AlberoPronostico] sampleLeaf uuid=${leaf.uuid} round=${leaf.round} p1=${leaf.player1Id} p2=${leaf.player2Id}');

      final leafWithPlayer = tree.matches.firstWhere(
        (m) =>
            m.round == tree.roundMax &&
            ((m.player1Id != null && m.player1Id != 0) || (m.player2Id != null && m.player2Id != 0)),
        orElse: () => tree.matches.first,
      );
      debugPrint(
          '[AlberoPronostico] sampleLeafWithPlayer uuid=${leafWithPlayer.uuid} round=${leafWithPlayer.round} p1=${leafWithPlayer.player1Id} p2=${leafWithPlayer.player2Id} p1Known=${_playerById.containsKey(leafWithPlayer.player1Id)} p2Known=${_playerById.containsKey(leafWithPlayer.player2Id)}');
    } catch (e) {
      debugPrint('[AlberoPronostico] setTree stats failed: $e');
    }
    if (tree.matches.isNotEmpty) {
      final m = tree.matches.first;
      debugPrint('[AlberoPronostico] firstMatch uuid=${m.uuid} round=${m.round} p1=${m.player1Id} p2=${m.player2Id} fatherId=${m.fatherId}');
    }
    final roundMax = tree.roundMax;
    _currentRound = roundMax;
    final roundMatches = _matchesForRound(_currentRound);
    final firstNonEmptyIdx = roundMatches.indexWhere(
      (m) => (m.player1Id != null && m.player1Id != 0) || (m.player2Id != null && m.player2Id != 0),
    );
    _currentMatchIndexInRound = firstNonEmptyIdx >= 0 ? firstNonEmptyIdx : 0;
    _resetPageController(initialPage: 0);
    _updateSelectedMatch();
  }

  void _updateSelectedMatch() {
    final roundMatches = _matchesForRound(_currentRound);
    if (roundMatches.isEmpty) {
      _selectedMatchId = null;
      return;
    }
    final idx = _currentMatchIndexInRound.clamp(0, roundMatches.length - 1);
    _selectedMatchId = roundMatches[idx].uuid;
  }

  List<MatchDto> _matchesForRound(int round) =>
      _matches.where((m) => m.round == round).toList()
        ..sort((a, b) {
          final aKey = _matchLeafStartIndex[a.uuid] ?? 1 << 30;
          final bKey = _matchLeafStartIndex[b.uuid] ?? 1 << 30;
          final byKey = aKey.compareTo(bKey);
          if (byKey != 0) return byKey;
          final aC = a.childIndex;
          final bC = b.childIndex;
          if (aC != null && bC != null) {
            final byChild = aC.compareTo(bC);
            if (byChild != 0) return byChild;
          }
          return a.uuid.compareTo(b.uuid);
        });

  Map<String, int> _computeMatchLeafStartIndex(List<MatchDto> matches, int roundMax) {
    final byId = <String, MatchDto>{ for (final m in matches) m.uuid: m };

    List<MatchDto> childrenOf(String fatherUuid) {
      final kids = matches.where((m) => m.fatherId == fatherUuid).toList();
      kids.sort((a, b) {
        final aC = a.childIndex;
        final bC = b.childIndex;
        if (aC != null && bC != null) {
          final by = aC.compareTo(bC);
          if (by != 0) return by;
        }
        return a.uuid.compareTo(b.uuid);
      });
      return kids;
    }

    final root = matches.where((m) => m.fatherId == null).fold<MatchDto?>(null, (best, m) {
      if (best == null) return m;
      if (m.round < best.round) return m;
      return best;
    });

    final leafStart = <String, int>{};
    int leafCursor = 0;

    void walk(MatchDto node) {
      if (node.round == roundMax) {
        leafStart[node.uuid] = leafCursor;
        leafCursor += 1;
        return;
      }
      final kids = childrenOf(node.uuid);
      if (kids.isEmpty) {
        leafStart[node.uuid] = leafCursor;
        leafCursor += 1;
        return;
      }
      leafStart[node.uuid] = leafCursor;
      for (final k in kids) {
        walk(k);
      }
    }

    if (root != null) {
      walk(root);
    } else {
      // Fallback: just enumerate leaves by uuid.
      final leaves = matches.where((m) => m.round == roundMax).toList()..sort((a,b)=>a.uuid.compareTo(b.uuid));
      for (final m in leaves) {
        leafStart[m.uuid] = leafCursor;
        leafCursor += 1;
      }
    }

    // Propagate leafStart to all matches (ensure every match has a key).
    for (final m in matches) {
      if (!leafStart.containsKey(m.uuid)) {
        // Use a stable fallback based on its uuid.
        leafStart[m.uuid] = m.uuid.hashCode;
      }
    }
    return leafStart;
  }

  MatchDto? get _currentMatch {
    if (_selectedMatchId == null) return null;
    try {
      return _matches.firstWhere((m) => m.uuid == _selectedMatchId);
    } catch (_) {
      return null;
    }
  }

  PlayerDto? _player(int? id) => id == null ? null : _playerById[id];

  int _ranking(int? playerId) {
    if (playerId == null) return 0;
    return _playerRankingById[playerId] ?? 0;
  }

  String _playerName(int? id) => _player(id)?.name ?? (id != null ? '#$id' : '—');

  void _propagateWinnerFrom(MatchDto startMatch) {
    final winnerId = startMatch.winnerId;
    if (winnerId == null) return;
    if (startMatch.fatherId == null || startMatch.fatherId!.trim().isEmpty) return;

    int parentIdx = _matches.indexWhere((m) => m.uuid == startMatch.fatherId);
    if (parentIdx < 0) return;

    final parent = _matches[parentIdx];
    final children = _matches.where((c) => c.fatherId == parent.uuid).toList();
    if (children.isEmpty) return;

    final isFirstChild = startMatch.childIndex != null
        ? startMatch.childIndex == 0
        : (() {
            children.sort((a, b) => a.uuid.compareTo(b.uuid));
            return children.isNotEmpty && children.first.uuid == startMatch.uuid;
          })();
    final slotPlayerId = isFirstChild ? parent.player1Id : parent.player2Id;
    final otherPlayerId = isFirstChild ? parent.player2Id : parent.player1Id;

    if (slotPlayerId == winnerId) {
      return;
    }

    // Se il vincitore entra in uno slot, il vecchio giocatore in quello slot va rimosso
    // a cascata dai round successivi.
    final replacedPlayerId = slotPlayerId;

    // Se il vincitore è già nell'altro slot del padre, rimuovilo da lì.
    int? nextP1 = parent.player1Id;
    int? nextP2 = parent.player2Id;
    if (isFirstChild) {
      nextP1 = winnerId;
      if (otherPlayerId == winnerId) nextP2 = null;
    } else {
      nextP2 = winnerId;
      if (otherPlayerId == winnerId) nextP1 = null;
    }

    // Ogni volta che cambiano i player del parent, resettiamo l'esito del parent.
    final updatedParent = parent.copyWith(
      player1Id: nextP1,
      player2Id: nextP2,
      p1Wins: false,
      p2Wins: false,
    );
    _matches[parentIdx] = updatedParent;

    if (replacedPlayerId != null) {
      _clearPlayerFromFutureRounds(replacedPlayerId, updatedParent.uuid);
    }

    _propagateWinnerFrom(updatedParent);
  }

  void _clearPlayerFromFutureRounds(int playerId, String fromMatchUuid) {
    if (playerId <= 0) return;

    var currentUuid = fromMatchUuid;
    while (true) {
      final idx = _matches.indexWhere((m) => m.uuid == currentUuid);
      if (idx < 0) break;
      final m = _matches[idx];
      final fatherId = m.fatherId;
      if (fatherId == null || fatherId.trim().isEmpty) break;

      final pIdx = _matches.indexWhere((mm) => mm.uuid == fatherId);
      if (pIdx < 0) break;
      final p = _matches[pIdx];

      final nextP1 = p.player1Id == playerId ? null : p.player1Id;
      final nextP2 = p.player2Id == playerId ? null : p.player2Id;
      final touched = (nextP1 != p.player1Id) || (nextP2 != p.player2Id);

      if (touched) {
        _matches[pIdx] = p.copyWith(player1Id: nextP1, player2Id: nextP2, p1Wins: false, p2Wins: false);
      }

      currentUuid = fatherId;
    }
  }

  void _setWinner(MatchDto match, bool p1Wins) {
    setState(() {
      _dirty = true;
      final idx = _matches.indexWhere((m) => m.uuid == match.uuid);
      if (idx < 0) return;
      _matches[idx] = match.copyWith(p1Wins: p1Wins, p2Wins: !p1Wins);
      _propagateWinnerFrom(_matches[idx]);
    });
  }

  bool get _predictionReady {
    final semis = _matches.where((m) => m.round == 2).toList();
    final finale = _matches.where((m) => m.round == 1).toList();
    if (semis.length != 2) return false;
    if (finale.length != 1) return false;

    final semisHavePlayers = semis.every((m) {
      final p1 = (m.player1Id ?? 0);
      final p2 = (m.player2Id ?? 0);
      return p1 > 0 && p2 > 0;
    });
    if (!semisHavePlayers) return false;

    final semisHaveWinners = semis.every((m) => m.hasWinner);
    if (!semisHaveWinners) return false;

    final f = finale.first;
    final fP1 = (f.player1Id ?? 0);
    final fP2 = (f.player2Id ?? 0);
    final finalHasPlayers = fP1 > 0 && fP2 > 0;
    if (!finalHasPlayers) return false;

    return f.hasWinner;
  }

  Future<void> _save({bool force = false}) async {
    if ((!_dirty && !force) || _saving) return;
    setState(() => _saving = true);
    try {
      final api = ApiContext.of(context);
      await api.saveTree(
        treeId: _tree!.id,
        matches: _matches
            .map((m) => {
                  'uuid': m.uuid,
                  'p1Wins': m.p1Wins,
                  'p2Wins': m.p2Wins,
                })
            .toList(),
      );
      if (mounted) setState(() => _dirty = false);
    } catch (e) {
      if (mounted) {
        final msg = (e is ApiException)
            ? 'Errore salvataggio (${e.statusCode}): ${e.message}'
            : 'Errore salvataggio: $e';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
        );
      }
      rethrow;
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _generatePrediction() async {
    if (!_predictionReady) return;

    try {
      await _save(force: true);
    } catch (_) {
      return;
    }

    final api = ApiContext.of(context);
    bool exists = false;
    try {
      exists = await api.predictionExistsByTournament(
        tournamentId: widget.tournamentId,
        roomId: widget.roomId,
      );
    } catch (_) {}

    if (exists && mounted) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Pronostico già esistente'),
          content: const Text('Vuoi sovrascrivere il pronostico esistente?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annulla')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Continua')),
          ],
        ),
      );
      if (ok != true) return;
    }

    try {
      final semis = _matches.where((m) => m.round == 2).toList();
      final finale = _matches.firstWhere((m) => m.round == 1);
      final winnerId = finale.winnerId;

      final semiPlayerIds = <int>[];
      for (final m in semis) {
        final p1 = m.player1Id ?? 0;
        final p2 = m.player2Id ?? 0;
        if (p1 > 0 && !semiPlayerIds.contains(p1)) semiPlayerIds.add(p1);
        if (p2 > 0 && !semiPlayerIds.contains(p2)) semiPlayerIds.add(p2);
      }

      // We expect exactly 4 semifinalists. The winner must be one of them.
      final rows = <Map<String, dynamic>>[];
      for (final pid in semiPlayerIds.take(4)) {
        final role = (winnerId != null && pid == winnerId) ? 'winner' : 'semifinalist';
        rows.add({'player_id': pid.toString(), 'prediction': role});
      }

      debugPrint(
        '[AlberoPronostico] generatePrediction semis=${semiPlayerIds.join(',')} winnerId=${winnerId ?? 'null'} rows=${rows.map((r) => "${r['player_id']}:${r['prediction']}").join(',')}',
      );

      await api.createPrediction(
        tournamentId: widget.tournamentId,
        rows: rows,
        roomId: widget.roomId,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pronostico generato!')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Errore: $e')),
        );
      }
    }
  }

  void _navigateToMatch(MatchDto match) {
    final roundMatches = _matchesForRound(match.round);
    final idx = roundMatches.indexWhere((m) => m.uuid == match.uuid);
    final nextIdx = idx < 0 ? 0 : idx;

    final roundChanged = _currentRound != match.round;
    setState(() {
      _currentRound = match.round;
      _currentMatchIndexInRound = nextIdx;
      _selectedMatchId = match.uuid;
      if (roundChanged) {
        _resetPageController(initialPage: nextIdx);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (!_pageController.hasClients) return;
      try {
        _pageController.animateToPage(
          nextIdx,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tabellone pronostico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Ricarica da risultati ufficiali',
            onPressed: (_loading || _saving) ? null : _resetTreeFromSuperuser,
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _predictionReady ? _generatePrediction : null,
                  icon: const Icon(Icons.auto_awesome),
                  label: Text(
                    _predictionReady ? 'Genera pronostico' : 'Semifinali e finale incomplete',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.save),
                onPressed: (!_dirty || _saving) ? null : () => _save(),
                tooltip: 'Salva tabellone',
              ),
            ],
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _init, child: const Text('Riprova')),
            ],
          ),
        ),
      );
    }
    if (_tree == null) return const Center(child: Text('Nessun tabellone disponibile'));

    final roundMatches = _matchesForRound(_currentRound);
    final totalInRound = roundMatches.length;

    return Column(
      children: [
        _buildTreeMap(),
        _buildRoundNav(totalInRound),
        Expanded(
          child: roundMatches.isEmpty
              ? const Center(child: Text('Seleziona un match'))
              : _buildMatchPageView(roundMatches),
        ),
      ],
    );
  }

  Widget _buildTreeMap() {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 12, bottom: 4),
            child: Text(
              'Mappa tabellone  •  tap su un match per navigare',
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 12),
            child: TournamentTreeMapInteractive(
              matches: _matches,
              roundMax: _tree!.roundMax,
              selectedMatchId: _selectedMatchId,
              onTapMatch: _navigateToMatch,
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 12, top: 6, bottom: 2),
            child: Row(
              children: [
                _legend(Colors.red.shade300, 'Ramo A'),
                const SizedBox(width: 12),
                _legend(Colors.blue.shade300, 'Ramo B'),
                const SizedBox(width: 12),
                _legend(Colors.green.shade400, 'Completato'),
                const SizedBox(width: 12),
                _legend(Colors.amber, 'Selezionato'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _legend(Color color, String label) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelSmall),
        ],
      );

  Widget _buildRoundNav(int totalInRound) {
    final roundMatches = _matchesForRound(_currentRound);
    final canPrev = _currentMatchIndexInRound > 0;
    final canNext = _currentMatchIndexInRound < totalInRound - 1;
    final roundUp = _currentRound < _tree!.roundMax;
    final roundDown = _currentRound > 1;

    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _roundLabel(_currentRound),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  'match ${_currentMatchIndexInRound + 1} / $totalInRound  •  scorri ↕ tra i match',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _changeRound(int round) {
    setState(() {
      _currentRound = round;
      _currentMatchIndexInRound = 0;
      _resetPageController(initialPage: 0);
      _updateSelectedMatch();
    });
  }

  void _changeMatchIndex(int idx) {
    setState(() {
      _currentMatchIndexInRound = idx;
      _updateSelectedMatch();
    });
  }

  Widget _buildMatchPageView(List<MatchDto> roundMatches) {
    return PageView.builder(
      key: ValueKey(_currentRound),
      controller: _pageController,
      scrollDirection: Axis.vertical,
      itemCount: roundMatches.length,
      onPageChanged: (idx) => _changeMatchIndex(idx),
      itemBuilder: (_, idx) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: _buildMatchCard(roundMatches[idx], isActive: idx == _currentMatchIndexInRound),
      ),
    );
  }

  Widget _buildMatchCard(MatchDto match, {bool isActive = true}) {
    final p1 = _player(match.player1Id);
    final p2 = _player(match.player2Id);
    final isReadOnly = false;

    final roundMatches = _matchesForRound(_currentRound);
    final idxInRound = roundMatches.indexWhere((m) => m.uuid == match.uuid);
    final matchNumber = (idxInRound >= 0 ? idxInRound : 0) + 1;
    final branchLabel = _isTopHalfMatch(match) ? 'Ramo A' : 'Ramo B';
    final bg = _matchCardColor(match);

    return Card(
      elevation: isActive ? 3 : 1,
      color: bg,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _isTopHalfMatch(match) ? Colors.red.shade100 : Colors.blue.shade100,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${_roundLabel(_currentRound)}  •  Match $matchNumber / ${roundMatches.length}',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ),
                Text(
                  branchLabel,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ],
            ),
          ),
          if (isReadOnly)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock, size: 14, color: Colors.orange.shade700),
                  const SizedBox(width: 6),
                  Text('Risultato reale — non modificabile',
                      style: TextStyle(color: Colors.orange.shade700, fontSize: 12)),
                ],
              ),
            ),
          _buildPlayerTile(
            match: match, playerId: match.player1Id, player: p1,
            isP1: true, isWinner: match.p1Wins && !match.p2Wins, isReadOnly: isReadOnly,
          ),
          Divider(height: 1, indent: 16, endIndent: 16,
              color: Theme.of(context).colorScheme.outlineVariant),
          _buildPlayerTile(
            match: match, playerId: match.player2Id, player: p2,
            isP1: false, isWinner: match.p2Wins && !match.p1Wins, isReadOnly: isReadOnly,
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerTile({
    required MatchDto match,
    required int? playerId,
    required PlayerDto? player,
    required bool isP1,
    required bool isWinner,
    required bool isReadOnly,
  }) {
    final rawName = player?.name ?? (playerId != null ? '#$playerId' : '— TBD —');
    final trimmed = rawName.trim();
    final parts = trimmed.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    final displayName = parts.length >= 2
        ? '${parts.first.characters.first}. ${parts.sublist(1).join(' ')}'
        : trimmed;
    final ranking = _ranking(playerId);
    final winnerPts = PredictionScoringProfile.standard.winnerPoints(ranking);
    final semiPts = PredictionScoringProfile.standard.semifinalistPoints(ranking);
    final metaCountry = player?.country;
    final meta = <String>[];
    if (metaCountry != null && metaCountry.trim().isNotEmpty) meta.add(metaCountry);
    if (ranking > 0) meta.add('[$ranking]');
    if (ranking > 0) meta.add('{$winnerPts/$semiPts}');
    final metaLine = meta.isEmpty ? null : meta.join(' ');

    return InkWell(
      onTap: (isReadOnly || playerId == null) ? null : () => _setWinner(match, isP1),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: isWinner ? Colors.green.shade50 : null,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            PlayerAvatar(imageSrc: player?.imageSrc, radius: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isWinner)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
                        ),
                      Expanded(
                        child: Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: isWinner ? FontWeight.bold : FontWeight.normal,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (metaLine != null)
                    Text(
                      metaLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                ],
              ),
            ),
            if (isReadOnly)
              isWinner
                  ? const Icon(Icons.emoji_events, color: Colors.amber)
                  : const SizedBox(width: 24)
            else
              Radio<bool>(
                value: true,
                groupValue: isP1 ? match.p1Wins : match.p2Wins,
                onChanged: playerId == null ? null : (_) => _setWinner(match, isP1),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildChildMatches(MatchDto match) {
    final children = _matches.where((m) => m.fatherId == match.uuid).toList();
    if (children.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Match precedenti (${_roundLabel(match.round + 1)})',
            style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: 8),
        ...children.map((c) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                leading: PlayerAvatar(imageSrc: _player(c.player1Id)?.imageSrc, radius: 16),
                title: Text(
                  '${_playerName(c.player1Id)} vs ${_playerName(c.player2Id)}',
                  style: const TextStyle(fontSize: 13),
                ),
                subtitle: c.hasWinner
                    ? Text('Vincente: ${_playerName(c.winnerId)}',
                        style: const TextStyle(color: Colors.green, fontSize: 12))
                    : const Text('Da giocare', style: TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, size: 18),
                onTap: () => _navigateToMatch(c),
              ),
            )),
      ],
    );
  }
}
