import 'package:flutter/material.dart';

import '../api/api_context.dart';
import '../models/player.dart';
import '../models/tree.dart';
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
  bool _dirty = false;
  bool _saving = false;

  int _currentRound = 0;
  int _currentMatchIndexInRound = 0;
  String? _selectedMatchId;

  bool _initialized = false;
  PageController _pageController = PageController(initialPage: 0, viewportFraction: 0.55);

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
      if (data is List) {
        for (final p in data) {
          if (p is! Map) continue;
          final id = int.tryParse((p['id'] ?? '').toString());
          if (id == null) continue;
          try {
            map[id] = PlayerDto.fromJson(p.cast<String, dynamic>());
          } catch (_) {}
        }
      }
      _playerById = map;
    } catch (e) {
      debugPrint('_loadPlayers error: $e');
    }
  }

  Future<void> _loadOrCloneTree(api) async {
    TreeDto? tree;
    try {
      final raw = await api.getUserTreeByTournament(tournamentId: widget.tournamentId);
      final data = raw['data'];
      if (data is List && data.isNotEmpty) {
        tree = TreeDto.fromJson(data.first as Map<String, dynamic>);
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
      final raw = await api.cloneSuperuserTree(tournamentId: widget.tournamentId);
      final data = raw['data'] ?? raw;
      final tree = TreeDto.fromJson(data is Map<String, dynamic> ? data : raw);
      _setTree(tree);
    } catch (e) {
      if (e.toString().contains('409')) {
        await _loadOrCloneTree(api);
        return;
      }
      setState(() => _error = 'Tabellone non disponibile: $e');
    }
  }

  void _setTree(TreeDto tree) {
    _tree = tree;
    _matches = List.of(tree.matches);
    final roundMax = tree.roundMax;
    _currentRound = roundMax;
    _currentMatchIndexInRound = 0;
    _pageController.dispose();
    _pageController = PageController(initialPage: 0, viewportFraction: 0.55);
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
      _matches.where((m) => m.round == round).toList();

  MatchDto? get _currentMatch {
    if (_selectedMatchId == null) return null;
    try {
      return _matches.firstWhere((m) => m.uuid == _selectedMatchId);
    } catch (_) {
      return null;
    }
  }

  PlayerDto? _player(int? id) => id == null ? null : _playerById[id];

  String _playerName(int? id) => _player(id)?.name ?? (id != null ? '#$id' : '—');

  void _setWinner(MatchDto match, bool p1Wins) {
    if (match.hasWinner && _isSuperuserWinner(match)) return;
    setState(() {
      _dirty = true;
      final idx = _matches.indexWhere((m) => m.uuid == match.uuid);
      if (idx < 0) return;
      _matches[idx] = match.copyWith(p1Wins: p1Wins, p2Wins: !p1Wins);
    });
  }

  bool _isSuperuserWinner(MatchDto m) => m.hasWinner;

  bool get _predictionReady {
    final semis = _matches.where((m) => m.round == 2).toList();
    final finale = _matches.where((m) => m.round == 1).toList();
    return semis.length == 2 &&
        semis.every((m) => m.hasWinner) &&
        finale.length == 1 &&
        finale.first.hasWinner;
  }

  Future<void> _save() async {
    if (!_dirty || _saving) return;
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Errore salvataggio: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _generatePrediction() async {
    if (!_predictionReady) return;

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

      final semiPlayerIds = <int>{};
      for (final m in semis) {
        if (m.player1Id != null) semiPlayerIds.add(m.player1Id!);
        if (m.player2Id != null) semiPlayerIds.add(m.player2Id!);
      }
      semiPlayerIds.remove(0);

      final rows = <Map<String, dynamic>>[];
      for (final pid in semiPlayerIds) {
        if (pid == winnerId) continue;
        rows.add({'player_id': pid.toString(), 'prediction': 'semifinalist'});
      }
      if (winnerId != null) {
        rows.add({'player_id': winnerId.toString(), 'prediction': 'winner'});
      }

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
    setState(() {
      _currentRound = match.round;
      _currentMatchIndexInRound = idx < 0 ? 0 : idx;
      _selectedMatchId = match.uuid;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tabellone pronostico'),
        actions: [
          if (_dirty)
            IconButton(
              icon: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save),
              onPressed: _saving ? null : _save,
              tooltip: 'Salva tabellone',
            ),
        ],
      ),
      bottomNavigationBar: _predictionReady
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: FilledButton.icon(
                  onPressed: _generatePrediction,
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Genera pronostico'),
                ),
              ),
            )
          : null,
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
      _updateSelectedMatch();
    });
    _pageController.jumpToPage(0);
  }

  void _changeMatchIndex(int idx) {
    setState(() {
      _currentMatchIndexInRound = idx;
      _updateSelectedMatch();
    });
  }

  Widget _buildMatchPageView(List<MatchDto> roundMatches) {
    return PageView.builder(
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
    final isReadOnly = match.hasWinner;

    return Card(
      elevation: isActive ? 3 : 1,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
    final name = player?.name ?? (playerId != null ? '#$playerId' : '— TBD —');

    return InkWell(
      onTap: (isReadOnly || playerId == null) ? null : () => _setWinner(match, isP1),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: isWinner ? Colors.green.shade50 : null,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            PlayerAvatar(imageSrc: player?.imageSrc, radius: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontWeight: isWinner ? FontWeight.bold : FontWeight.normal,
                      fontSize: 15,
                    ),
                  ),
                  if (player?.country != null)
                    Text(player!.country!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  if (isWinner)
                    const Text('✓ Vincente', style: TextStyle(color: Colors.green, fontSize: 12)),
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
