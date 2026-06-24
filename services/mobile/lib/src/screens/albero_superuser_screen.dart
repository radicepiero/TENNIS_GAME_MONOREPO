import 'package:flutter/material.dart';

import '../api/api_context.dart';
import '../models/player.dart';
import '../models/tree.dart';
import '../widgets/player_avatar.dart';
import '../widgets/tournament_tree_map.dart';

const _roundLabels = ['', 'Finale', 'Semifinale', 'Quarti', 'R16', 'R32', 'R64', 'R128'];

String _roundLabel(int round) =>
    (round >= 0 && round < _roundLabels.length) ? _roundLabels[round] : 'Round $round';

class AlberoSuperuserScreen extends StatefulWidget {
  final String tournamentId;

  const AlberoSuperuserScreen({super.key, required this.tournamentId});

  @override
  State<AlberoSuperuserScreen> createState() => _AlberoSuperuserScreenState();
}

class _AlberoSuperuserScreenState extends State<AlberoSuperuserScreen> {
  bool _loading = true;
  String? _error;
  TreeDto? _tree;
  List<MatchDto> _matches = [];
  Map<int, PlayerDto> _playerById = {};

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
      await Future.wait([
        _loadPlayers(api),
        _loadTree(api),
      ]);
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

  Future<void> _loadTree(api) async {
    try {
      final raw = await api.getSuperuserTreeByTournament(tournamentId: widget.tournamentId);
      final data = raw['data'];
      TreeDto? tree;
      if (data is List && data.isNotEmpty) {
        tree = TreeDto.fromJson(data.first as Map<String, dynamic>);
      } else if (data is Map<String, dynamic>) {
        tree = TreeDto.fromJson(data);
      } else if (data is Map) {
        tree = TreeDto.fromJson(Map<String, dynamic>.from(data));
      } else if (raw.containsKey('id')) {
        tree = TreeDto.fromJson(raw);
      }
      if (tree == null) {
        if (mounted) setState(() => _error = 'Albero risultati non disponibile');
        return;
      }
      if (mounted) setState(() => _setTree(tree!));
    } catch (e) {
      debugPrint('_loadTree error: $e');
      if (mounted) setState(() => _error = 'Tabellone non disponibile: $e');
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

  void _navigateToMatch(MatchDto match) {
    final roundMatches = _matchesForRound(match.round);
    final idx = roundMatches.indexWhere((m) => m.uuid == match.uuid);
    setState(() {
      _currentRound = match.round;
      _currentMatchIndexInRound = idx < 0 ? 0 : idx;
      _selectedMatchId = match.uuid;
    });
    _pageController.jumpToPage(_currentMatchIndexInRound);
  }

  void _changeMatchIndex(int idx) {
    setState(() {
      _currentMatchIndexInRound = idx;
      _updateSelectedMatch();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Risultati ufficiali')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
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
              ? const Center(child: Text('Nessun match'))
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

    return Card(
      elevation: isActive ? 3 : 1,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildPlayerTile(
            playerId: match.player1Id,
            player: p1,
            isWinner: match.p1Wins && !match.p2Wins,
          ),
          Divider(height: 1, indent: 16, endIndent: 16,
              color: Theme.of(context).colorScheme.outlineVariant),
          _buildPlayerTile(
            playerId: match.player2Id,
            player: p2,
            isWinner: match.p2Wins && !match.p1Wins,
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerTile({
    required int? playerId,
    required PlayerDto? player,
    required bool isWinner,
  }) {
    final name = player?.name ?? (playerId != null ? '#$playerId' : '— TBD —');

    return AnimatedContainer(
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
          isWinner
              ? const Icon(Icons.emoji_events, color: Colors.amber)
              : const SizedBox(width: 24),
        ],
      ),
    );
  }
}
