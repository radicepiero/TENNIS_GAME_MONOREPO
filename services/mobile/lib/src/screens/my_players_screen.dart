import 'package:flutter/material.dart';

import '../api/api_context.dart';
import '../api/room_store.dart';
import '../models/home_friend.dart';
import '../widgets/async_view.dart';
import '../widgets/debug_json_tile.dart';

class MyPlayersScreen extends StatefulWidget {
  final String? roomId;

  const MyPlayersScreen({super.key, this.roomId});

  @override
  State<MyPlayersScreen> createState() => _MyPlayersScreenState();
}

class _MyPlayersScreenState extends State<MyPlayersScreen> {
  final _roomStore = RoomStore();
  String? _roomId;

  @override
  void initState() {
    super.initState();
    _initRoom();
  }

  Future<void> _initRoom() async {
    final stored = await _roomStore.readSelectedRoomId();
    if (!mounted) return;
    setState(() => _roomId = widget.roomId ?? stored);
  }

  String _formatRole(String raw) {
    final v = raw.trim().toLowerCase();
    if (v == 'winner') return 'Vincitore';
    if (v == 'semifinalist') return 'Semifinalista';
    return raw;
  }

  String _fmtPoints(int? v) => v == null ? 'N/D' : v.toString();

  @override
  Widget build(BuildContext context) {
    final api = ApiContext.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('I miei tennisti')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: api.getMobileFriendHome(roomId: _roomId),
        builder: (context, snapshot) {
          return AsyncView<Map<String, dynamic>>(
            snapshot: snapshot,
            builder: (json) {
              final dto = HomeFriendResponseDto.fromApiJson(json);
              final rows = dto.dashboard.myPlayers;

              return RefreshIndicator(
                onRefresh: () async => setState(() {}),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (rows.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Nessun tennista trovato'),
                        ),
                      )
                    else
                      for (final r in rows)
                        Card(
                          child: ExpansionTile(
                            title: Text(r.player.name),
                            subtitle: Text('Tornei: ${r.tournaments.length}'),
                            children: [
                              if (r.tournaments.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Text('Nessun torneo'),
                                )
                              else
                                for (final t in r.tournaments)
                                  ListTile(
                                    title: Text(t.tournamentNickname),
                                    subtitle: Text('Ruolo: ${_formatRole(t.role)}'),
                                    trailing: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('P: ${t.predictedPoints}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                        Text('R: ${_fmtPoints(t.realizedPoints)}'),
                                      ],
                                    ),
                                  ),
                            ],
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
