import 'package:go_router/go_router.dart';

import 'screens/albero_pronostico_screen.dart';
import 'screens/classifica_annuale_screen.dart';
import 'screens/home_friend_screen.dart';
import 'screens/login_screen.dart';
import 'screens/my_players_screen.dart';
import 'screens/pronostico_screen.dart';
import 'screens/sviluppo_screen.dart';
import 'screens/torneo_screen.dart';

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/tornei/friends',
        builder: (context, state) => const HomeFriendScreen(),
      ),
      GoRoute(
        path: '/classifica',
        builder: (context, state) {
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          final yearRaw = state.uri.queryParameters['year'];
          final year = int.tryParse((yearRaw ?? '').trim());
          return ClassificaAnnualeScreen(initialYear: year, roomId: roomId);
        },
      ),
      GoRoute(
        path: '/my-players',
        builder: (context, state) {
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          return MyPlayersScreen(roomId: roomId);
        },
      ),
      GoRoute(
        path: '/tornei/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          return TorneoScreen(tournamentId: id, roomId: roomId);
        },
      ),
      GoRoute(
        path: '/tornei/:id/sviluppo',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          return SviluppoScreen(tournamentId: id, roomId: roomId);
        },
      ),
      GoRoute(
        path: '/tornei/:id/pronostico',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          return PronosticoScreen(tournamentId: id, roomId: roomId);
        },
      ),
      GoRoute(
        path: '/tornei/:id/albero-pronostico',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          final roomId = state.uri.queryParameters['room_id'] ?? state.uri.queryParameters['roomId'];
          return AlberoPronosticoScreen(tournamentId: id, roomId: roomId);
        },
      ),
    ],
  );
}
