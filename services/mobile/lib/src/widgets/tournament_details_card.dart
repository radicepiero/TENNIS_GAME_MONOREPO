import 'package:flutter/material.dart';

import '../models/tournament.dart';

class TournamentDetailsCard extends StatelessWidget {
  final TournamentDto tournament;
  final Widget? actions;

  const TournamentDetailsCard({super.key, required this.tournament, this.actions});

  String _fmtYmd(String? raw) {
    final s = (raw ?? '').trim();
    if (s.isEmpty) return '-';
    final ymd = s.length >= 10 ? s.substring(0, 10) : s;
    final parts = ymd.split('-');
    if (parts.length == 3) {
      final y = parts[0];
      final m = parts[1];
      final d = parts[2];
      if (y.length == 4 && m.length == 2 && d.length == 2) {
        return '$d-$m-$y';
      }
    }
    return ymd;
  }

  String _countryToFlagEmoji(String? raw) {
    final s = (raw ?? '').trim().toUpperCase();
    if (s.length != 2) return '';
    final a = s.codeUnitAt(0);
    final b = s.codeUnitAt(1);
    if (a < 65 || a > 90 || b < 65 || b > 90) return '';
    const base = 0x1F1E6;
    return String.fromCharCodes([base + (a - 65), base + (b - 65)]);
  }

  @override
  Widget build(BuildContext context) {
    final t = tournament;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _InfoRow(label: 'Stato', value: t.status),
            _InfoRow(label: 'Inizio', value: _fmtYmd(t.datainizio)),
            _InfoRow(label: 'Fine', value: _fmtYmd(t.datafine)),
            if ((t.country ?? '').isNotEmpty)
              _InfoRow(
                label: 'Nazione',
                value: '${_countryToFlagEmoji(t.country)} ${t.country}'.trim(),
              ),
            if ((t.location ?? '').isNotEmpty) _InfoRow(label: 'Città', value: t.location ?? ''),
            if ((t.category ?? '').isNotEmpty) _InfoRow(label: 'Categoria', value: t.category ?? ''),
            if (actions != null) ...[
              const SizedBox(height: 12),
              actions!,
            ],
          ],
        ),
      ),
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
