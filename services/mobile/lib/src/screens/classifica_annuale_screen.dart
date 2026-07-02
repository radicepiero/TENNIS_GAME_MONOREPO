import 'package:flutter/material.dart';

import '../api/api_context.dart';
import '../api/room_store.dart';

class ClassificaAnnualeScreen extends StatefulWidget {
  final int? initialYear;
  final String? roomId;

  const ClassificaAnnualeScreen({super.key, this.initialYear, this.roomId});

  @override
  State<ClassificaAnnualeScreen> createState() => _ClassificaAnnualeScreenState();
}

class _AnnualUser {
  final String uuid;
  final String soprannome;

  const _AnnualUser({required this.uuid, required this.soprannome});
}

class _AnnualTournament {
  final String id;
  final String nickname;
  final String status;

  const _AnnualTournament({required this.id, required this.nickname, required this.status});
}

class _AnnualRankingData {
  final int year;
  final List<_AnnualUser> users;
  final List<_AnnualTournament> tournaments;
  final Map<String, Map<String, int>> pointsByTournamentUser;
  final Map<String, int> totalsByUser;
  final Map<String, int> rowMaxByTournament;

  const _AnnualRankingData({
    required this.year,
    required this.users,
    required this.tournaments,
    required this.pointsByTournamentUser,
    required this.totalsByUser,
    required this.rowMaxByTournament,
  });
}

class _ClassificaAnnualeScreenState extends State<ClassificaAnnualeScreen> {
  final _roomStore = RoomStore();
  String? _roomId;

  int _year = DateTime.now().year;
  Future<_AnnualRankingData>? _loadFuture;
  String? _loadKey;

  final ScrollController _rowsController = ScrollController();
  final ScrollController _pinnedController = ScrollController();
  final ScrollController _horizontalController = ScrollController();

  @override
  void initState() {
    super.initState();
    _year = widget.initialYear ?? DateTime.now().year;
    _initRoom();

    _rowsController.addListener(() {
      if (!_pinnedController.hasClients) return;
      final target = _rowsController.offset;
      final max = _pinnedController.position.maxScrollExtent;
      final clamped = target.clamp(0.0, max);
      if ((_pinnedController.offset - clamped).abs() < 0.5) return;
      _pinnedController.jumpTo(clamped);
    });
  }

  @override
  void dispose() {
    _rowsController.dispose();
    _pinnedController.dispose();
    _horizontalController.dispose();
    super.dispose();
  }

  Future<void> _initRoom() async {
    final stored = await _roomStore.readSelectedRoomId();
    if (!mounted) return;
    setState(() => _roomId = widget.roomId ?? stored);
  }

  List<int> _years() {
    final now = DateTime.now().year;
    return [for (var y = now; y >= now - 6; y--) y];
  }

  Future<_AnnualRankingData> _load(int year, String? roomId) async {
    final api = ApiContext.of(context);
    final json = await api.getAnnualRanking(year: year, roomId: roomId);
    final data = (json['data'] is Map) ? (json['data'] as Map) : <String, dynamic>{};

    final y = (data['year'] is num) ? (data['year'] as num).toInt() : int.tryParse((data['year'] ?? '').toString()) ?? year;

    final usersRaw = (data['users'] is List) ? (data['users'] as List) : const <dynamic>[];
    final users = usersRaw
        .whereType<Map>()
        .map((u) => _AnnualUser(
              uuid: (u['uuid'] ?? '').toString(),
              soprannome: ((u['soprannome'] ?? u['nickname'] ?? u['email'] ?? '')).toString(),
            ))
        .where((u) => u.uuid.isNotEmpty)
        .toList();

    final tournamentsRaw = (data['tournaments'] is List) ? (data['tournaments'] as List) : const <dynamic>[];
    final tournaments = tournamentsRaw
        .whereType<Map>()
        .map((t) => _AnnualTournament(
              id: (t['id'] ?? '').toString(),
              nickname: ((t['nickname'] ?? t['name'] ?? '')).toString(),
              status: ((t['status'] ?? '')).toString(),
            ))
        .where((t) => t.id.isNotEmpty)
        .toList();

    final totals = <String, int>{};
    final totalsRaw = data['totals'];
    if (totalsRaw is Map) {
      for (final e in totalsRaw.entries) {
        final key = e.key.toString();
        final raw = e.value;
        final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
        totals[key] = n ?? 0;
      }
    }

    final rowMax = <String, int>{};
    final rowMaxRaw = data['rowMax'];
    if (rowMaxRaw is Map) {
      for (final e in rowMaxRaw.entries) {
        final key = e.key.toString();
        final raw = e.value;
        final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
        rowMax[key] = n ?? 0;
      }
    }

    final pointsByTournamentUser = <String, Map<String, int>>{};
    final pointsRaw = data['points'];
    if (pointsRaw is Map) {
      for (final e in pointsRaw.entries) {
        final tid = e.key.toString();
        final inner = <String, int>{};
        final m = e.value;
        if (m is Map) {
          for (final ee in m.entries) {
            final uid = ee.key.toString();
            final raw = ee.value;
            final n = (raw is num) ? raw.toInt() : int.tryParse(raw?.toString() ?? '');
            inner[uid] = n ?? 0;
          }
        }
        pointsByTournamentUser[tid] = inner;
      }
    }

    final orderedUsers = users.toList();
    orderedUsers.sort((a, b) {
      final ta = totals[a.uuid] ?? 0;
      final tb = totals[b.uuid] ?? 0;
      final diff = tb - ta;
      if (diff != 0) return diff;
      return a.soprannome.toLowerCase().compareTo(b.soprannome.toLowerCase());
    });

    return _AnnualRankingData(
      year: y,
      users: orderedUsers,
      tournaments: tournaments,
      pointsByTournamentUser: pointsByTournamentUser,
      totalsByUser: totals,
      rowMaxByTournament: rowMax,
    );
  }

  Color _cellBg(BuildContext context, int value, int rowMax, String tournamentStatus) {
    final st = tournamentStatus.trim().toLowerCase();
    if (rowMax > 0 && value == rowMax) {
      return Theme.of(context).colorScheme.primaryContainer;
    }
    if (st == 'excluded') {
      return Theme.of(context).colorScheme.surfaceContainerHighest;
    }
    return Theme.of(context).colorScheme.surface;
  }

  @override
  Widget build(BuildContext context) {
    final rid = (_roomId ?? '').trim();
    final key = '$_year|$rid';
    if (_loadFuture == null || _loadKey != key) {
      _loadKey = key;
      _loadFuture = _load(_year, rid.isNotEmpty ? rid : null);
    }

    return FutureBuilder<_AnnualRankingData>(
      future: _loadFuture,
      builder: (context, snapshot) {
        final title = 'Classifica ${_year.toString()}';

        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(title: Text(title)),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: Text(title)),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(snapshot.error.toString()),
              ),
            ),
          );
        }

        final data = snapshot.data;
        if (data == null) {
          return Scaffold(
            appBar: AppBar(title: Text(title)),
            body: const Center(child: Text('Nessun dato')),
          );
        }

        const tournamentColW = 140.0;
        const userColW = 96.0;
        const rowH = 44.0;

        final tableW = userColW * data.users.length;

        Widget headerCell(String text, double width) {
          return SizedBox(
            width: width,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ),
          );
        }

        Widget valueCell({required int value, required int rowMax, required String status}) {
          return SizedBox(
            width: userColW,
            height: rowH,
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _cellBg(context, value, rowMax, status),
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Text(value.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          );
        }

        Widget tournamentCell(_AnnualTournament t) {
          return SizedBox(
            width: tournamentColW,
            height: rowH,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    t.nickname,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    t.status,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10),
                  ),
                ],
              ),
            ),
          );
        }

        Widget totalsCell(String userUuid) {
          final total = data.totalsByUser[userUuid] ?? 0;
          return SizedBox(
            width: userColW,
            height: rowH,
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Text(total.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(title),
            actions: [
              IconButton(
                icon: const Icon(Icons.calendar_month),
                tooltip: 'Seleziona anno',
                onPressed: () async {
                  final years = _years();
                  final chosen = await showModalBottomSheet<int>(
                    context: context,
                    showDragHandle: true,
                    builder: (ctx) {
                      return SafeArea(
                        child: ListView(
                          children: [
                            for (final y in years)
                              ListTile(
                                title: Text(y.toString()),
                                trailing: (y == _year) ? const Icon(Icons.check) : null,
                                onTap: () => Navigator.of(ctx).pop(y),
                              ),
                          ],
                        ),
                      );
                    },
                  );
                  if (chosen == null || chosen == _year) return;
                  setState(() {
                    _year = chosen;
                    _loadFuture = null;
                  });
                },
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    border: Border(
                      bottom: BorderSide(color: Theme.of(context).dividerColor),
                    ),
                  ),
                  child: Row(
                    children: [
                      headerCell('TORNEO', tournamentColW),
                      Expanded(
                        child: SingleChildScrollView(
                          controller: _horizontalController,
                          scrollDirection: Axis.horizontal,
                          child: SizedBox(
                            width: tableW,
                            child: Row(
                              children: [
                                for (final u in data.users) headerCell(u.soprannome, userColW),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Row(
                    children: [
                      SizedBox(
                        width: tournamentColW,
                        child: ListView.builder(
                          controller: _pinnedController,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: data.tournaments.length + 1,
                          itemBuilder: (context, index) {
                            if (index == data.tournaments.length) {
                              return headerCell('TOTALE', tournamentColW);
                            }
                            return tournamentCell(data.tournaments[index]);
                          },
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          controller: _horizontalController,
                          scrollDirection: Axis.horizontal,
                          child: SizedBox(
                            width: tableW,
                            child: ListView.builder(
                              controller: _rowsController,
                              itemCount: data.tournaments.length + 1,
                              itemBuilder: (context, index) {
                                if (index == data.tournaments.length) {
                                  return Row(
                                    children: [
                                      for (final u in data.users) totalsCell(u.uuid),
                                    ],
                                  );
                                }

                                final t = data.tournaments[index];
                                final rowMax = data.rowMaxByTournament[t.id] ?? 0;
                                final rowPoints = data.pointsByTournamentUser[t.id] ?? const <String, int>{};

                                return Row(
                                  children: [
                                    for (final u in data.users)
                                      valueCell(
                                        value: rowPoints[u.uuid] ?? 0,
                                        rowMax: rowMax,
                                        status: t.status,
                                      ),
                                  ],
                                );
                              },
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
