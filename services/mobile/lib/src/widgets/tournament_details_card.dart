import 'package:flutter/material.dart';

import '../models/tournament.dart';

class TournamentDetailsCard extends StatelessWidget {
  final TournamentDto tournament;
  final Widget? actions;

  const TournamentDetailsCard({super.key, required this.tournament, this.actions});

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
    final s = _countryToIso2(raw);
    if (s.isEmpty) return '';
    final a = s.codeUnitAt(0);
    final b = s.codeUnitAt(1);
    if (a < 65 || a > 90 || b < 65 || b > 90) return '';
    const base = 0x1F1E6;
    return String.fromCharCodes([base + (a - 65), base + (b - 65)]);
  }

  String _countryToIso2(String? raw) {
    final s = (raw ?? '').trim();
    if (s.isEmpty) return '';
    final upper = s.toUpperCase();

    if (upper.length == 2) return upper;

    const iso3ToIso2 = <String, String>{
      'ITA': 'IT',
      'FRA': 'FR',
      'ESP': 'ES',
      'DEU': 'DE',
      'GER': 'DE',
      'GBR': 'GB',
      'UKR': 'UA',
      'USA': 'US',
      'CHE': 'CH',
      'SUI': 'CH',
      'AUT': 'AT',
      'BEL': 'BE',
      'NLD': 'NL',
      'SWE': 'SE',
      'NOR': 'NO',
      'DNK': 'DK',
      'PRT': 'PT',
      'GRC': 'GR',
      'POL': 'PL',
      'ROU': 'RO',
      'SRB': 'RS',
      'HRV': 'HR',
      'SVK': 'SK',
      'SVN': 'SI',
      'HUN': 'HU',
      'CZE': 'CZ',
      'RUS': 'RU',
      'ARG': 'AR',
      'BRA': 'BR',
      'CHL': 'CL',
      'COL': 'CO',
      'MEX': 'MX',
      'CAN': 'CA',
      'AUS': 'AU',
      'NZL': 'NZ',
      'JPN': 'JP',
      'CHN': 'CN',
      'KOR': 'KR',
      'IND': 'IN',
      'ZAF': 'ZA',
      'MAR': 'MA',
      'TUN': 'TN',
      'EGY': 'EG',
      'TUR': 'TR',
    };
    if (upper.length == 3 && iso3ToIso2.containsKey(upper)) return iso3ToIso2[upper]!;

    final key = upper.replaceAll(RegExp(r'[^A-Z]'), '');
    const nameToIso2 = <String, String>{
      'ITALY': 'IT',
      'ITALIA': 'IT',
      'FRANCE': 'FR',
      'SPAIN': 'ES',
      'GERMANY': 'DE',
      'UNITEDKINGDOM': 'GB',
      'UK': 'GB',
      'GREATBRITAIN': 'GB',
      'ENGLAND': 'GB',
      'UNITEDSTATES': 'US',
      'USA': 'US',
      'SWITZERLAND': 'CH',
      'AUSTRIA': 'AT',
      'BELGIUM': 'BE',
      'NETHERLANDS': 'NL',
      'PORTUGAL': 'PT',
    };
    return nameToIso2[key] ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final t = tournament;
    final colors = _surfaceColors(t);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Ink(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [colors.base.withOpacity(0.22), colors.accent.withOpacity(0.18)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoRow(label: 'Inizio', value: _fmtYmd(t.datainizio)),
              _InfoRow(label: 'Fine', value: _fmtYmd(t.datafine)),
              _InfoRow(label: 'Stato', value: t.status),
              if ((t.category ?? '').isNotEmpty) _InfoRow(label: 'Categoria', value: t.category ?? ''),
              if ((t.country ?? '').isNotEmpty)
                _InfoRow(
                  label: 'Nazione',
                  value: '${_countryToFlagEmoji(t.country)} ${t.country}'.trim(),
                ),
              if ((t.location ?? '').isNotEmpty) _InfoRow(label: 'Città', value: t.location ?? ''),
              if (actions != null) ...[
                const SizedBox(height: 12),
                actions!,
              ],
            ],
          ),
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
