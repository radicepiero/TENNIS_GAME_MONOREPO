import 'package:flutter/material.dart';

class TournamentActionButtons extends StatelessWidget {
  final String status;
  final bool hasSuperuserTree;

  final VoidCallback? onOpenSviluppo;
  final VoidCallback? onOpenPronostico;
  final VoidCallback? onOpenSuperuserTree;
  final VoidCallback? onOpenVincereFacile;

  const TournamentActionButtons({
    super.key,
    required this.status,
    required this.hasSuperuserTree,
    this.onOpenSviluppo,
    this.onOpenPronostico,
    this.onOpenSuperuserTree,
    this.onOpenVincereFacile,
  });

  String _normalizeStatus(String? s) => (s ?? '').trim().toLowerCase();

  String _statusLabel(String statusRaw) {
    final st = _normalizeStatus(statusRaw);
    if (st == 'excluded') return 'torneo escluso dal gioco';
    if (st == 'open') return 'Fai il tuo pronostico';
    if (st == 'in-progress') return 'Segui i risultati dei pronostici';
    if (st == 'completed') return 'Verifica il punteggio';
    return st;
  }

  @override
  Widget build(BuildContext context) {
    final st = _normalizeStatus(status);

    final VoidCallback? primaryOnPressed = (st == 'open')
        ? onOpenPronostico
        : (st == 'in-progress' || st == 'completed')
            ? onOpenSviluppo
            : null;

    final superTreeLabel = (st == 'open') ? 'tabellone' : 'guarda i risultati';

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.icon(
          onPressed: primaryOnPressed,
          icon: Icon(
            (st == 'open')
                ? Icons.edit
                : (st == 'in-progress' || st == 'completed')
                    ? Icons.insights
                    : Icons.block,
          ),
          label: Text(_statusLabel(st)),
        ),
        if (hasSuperuserTree && onOpenSuperuserTree != null)
          OutlinedButton.icon(
            onPressed: onOpenSuperuserTree,
            icon: const Icon(Icons.account_tree),
            label: Text(superTreeLabel),
          ),
        if (st == 'open' && hasSuperuserTree && onOpenVincereFacile != null)
          OutlinedButton.icon(
            onPressed: onOpenVincereFacile,
            icon: const Icon(Icons.emoji_events),
            label: const Text('usa il tabellone per vincere facile'),
          ),
      ],
    );
  }
}
