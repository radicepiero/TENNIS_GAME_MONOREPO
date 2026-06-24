import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_context.dart';
import '../api/room_store.dart';
import '../models/home_friend.dart';
import '../models/room.dart';
import '../models/tournament.dart';
import '../widgets/async_view.dart';
import '../widgets/debug_json_tile.dart';

class HomeFriendScreen extends StatefulWidget {
  const HomeFriendScreen({super.key});

  @override
  State<HomeFriendScreen> createState() => _HomeFriendScreenState();
}

class _HomeFriendScreenState extends State<HomeFriendScreen> {
  final _roomStore = RoomStore();
  String? _roomId;

  @override
  void initState() {
    super.initState();
    _loadRoom();
  }

  Future<void> _loadRoom() async {
    final v = await _roomStore.readSelectedRoomId();
    if (!mounted) return;
    setState(() => _roomId = v);
  }

  Future<void> _selectRoom(String? roomId) async {
    await _roomStore.writeSelectedRoomId(roomId);
    if (!mounted) return;
    setState(() => _roomId = roomId);
  }

  @override
  Widget build(BuildContext context) {
    final api = ApiContext.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gioca'),
        actions: [
          IconButton(
            onPressed: () async {
              await api.logout();
              if (!context.mounted) return;
              context.go('/login');
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: api.getMobileFriendHome(roomId: _roomId),
        builder: (context, snapshot) {
          return AsyncView<Map<String, dynamic>>(
            snapshot: snapshot,
            builder: (json) {
              final dto = HomeFriendResponseDto.fromApiJson(json);
              final dashboard = dto.dashboard;
              final effectiveRoomId = dto.roomId.isEmpty ? null : dto.roomId;

              return RefreshIndicator(
                onRefresh: () async => setState(() {}),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _RoomPicker(
                      rooms: dto.rooms,
                      effectiveRoomId: effectiveRoomId,
                      onChanged: _selectRoom,
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: ListTile(
                        title: const Text('Classifica'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          final y = DateTime.now().year;
                          final qs = dto.roomId.isNotEmpty
                              ? '?room_id=${Uri.encodeQueryComponent(dto.roomId)}&year=$y'
                              : '?year=$y';
                          context.push('/classifica$qs');
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (dashboard.currentTournament != null) ...[
                      _TournamentCard(
                        title: 'In corso',
                        tournament: dashboard.currentTournament!,
                        roomId: dto.roomId,
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (dashboard.nextTournaments.isNotEmpty) ...[
                      Text('Prossimi', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      for (final t in dashboard.nextTournaments)
                        _TournamentCard(title: null, tournament: t, roomId: dto.roomId),
                      const SizedBox(height: 12),
                    ],
                    if (dashboard.recentTournaments.isNotEmpty) ...[
                      Text('Recenti', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      for (final t in dashboard.recentTournaments)
                        _TournamentCard(title: null, tournament: t, roomId: dto.roomId),
                    ],
                    const SizedBox(height: 12),
                    Card(
                      child: ListTile(
                        title: const Text('I miei tennisti'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          final qs = dto.roomId.isNotEmpty ? '?room_id=${Uri.encodeQueryComponent(dto.roomId)}' : '';
                          context.push('/my-players$qs');
                        },
                      ),
                    ),
                    const SizedBox(height: 12),
                    DebugJsonTile(json: json),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _RoomPicker extends StatelessWidget {
  final List<RoomDto> rooms;
  final String? effectiveRoomId;
  final ValueChanged<String?> onChanged;

  const _RoomPicker({required this.rooms, required this.effectiveRoomId, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final items = rooms
        .map((r) => DropdownMenuItem<String>(
              value: r.id,
              child: Text(r.name),
            ))
        .toList();

    return Row(
      children: [
        const Text('Stanza:'),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButton<String>(
            isExpanded: true,
            value: (effectiveRoomId != null && effectiveRoomId!.isNotEmpty) ? effectiveRoomId : null,
            hint: const Text('Seleziona'),
            items: items,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}

class _TournamentCard extends StatelessWidget {
  final String? title;
  final TournamentDto tournament;
  final String roomId;

  const _TournamentCard({required this.title, required this.tournament, required this.roomId});

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

  @override
  Widget build(BuildContext context) {
    final id = tournament.id;
    final name = tournament.displayName;
    final status = tournament.status;
    final colors = _surfaceColors(tournament);

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
        child: ListTile(
          title: Text(title != null ? '$title: $name' : name),
          subtitle: Text(status),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            if (id.isEmpty) return;
            final qs = roomId.isNotEmpty ? '?room_id=$roomId' : '';
            context.push('/tornei/$id$qs');
          },
        ),
      ),
    );
  }
}
