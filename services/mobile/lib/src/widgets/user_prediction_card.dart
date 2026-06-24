import 'package:flutter/material.dart';

import '../models/player.dart';
import '../models/prediction.dart';
import 'player_avatar.dart';

class PredictionPick {
  final String playerId;
  final String role;
  final int points;

  const PredictionPick({required this.playerId, required this.role, required this.points});
}

class UserPredictionCard extends StatelessWidget {
  final PredictionResponseDto prediction;
  final Map<String, PlayerDto> playerById;
  final int? computedScore;
  final List<PredictionPick> picks;

  const UserPredictionCard({
    super.key,
    required this.prediction,
    required this.playerById,
    required this.computedScore,
    required this.picks,
  });

  PlayerDto? _playerFor(String? id) {
    if (id == null || id.isEmpty) return null;
    return playerById[id];
  }

  String _nameFor(String? id) {
    if (id == null || id.isEmpty) return '-';
    final p = _playerFor(id);
    return p?.name ?? 'ID $id';
  }

  String _formatIntIt(int? v) {
    if (v == null) return '-';
    final s = v.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final posFromEnd = s.length - i;
      buf.write(s[i]);
      if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    final score = computedScore;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Mio pronostico', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Table(
              columnWidths: const {
                0: FlexColumnWidth(),
                1: IntrinsicColumnWidth(),
              },
              children: [
                TableRow(
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Text('Punteggio pronostico'),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        _formatIntIt(score),
                        textAlign: TextAlign.right,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                for (final pick in picks)
                  TableRow(
                    children: [
                      _PickLeft(
                        player: _playerFor(pick.playerId),
                        fallbackText: _nameFor(pick.playerId),
                        role: pick.role,
                      ),
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          _formatIntIt(pick.points),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PickLeft extends StatelessWidget {
  final PlayerDto? player;
  final String fallbackText;
  final String role;

  const _PickLeft({
    required this.player,
    required this.fallbackText,
    required this.role,
  });

  @override
  Widget build(BuildContext context) {
    final p = player;
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 6, right: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2, right: 10),
            child: PlayerAvatar(imageSrc: p?.imageSrc, radius: 14),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p?.name ?? fallbackText,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  role,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
