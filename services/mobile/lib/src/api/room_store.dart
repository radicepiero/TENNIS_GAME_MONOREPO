import 'package:shared_preferences/shared_preferences.dart';

class RoomStore {
  static const _kSelectedRoomId = 'selected_room_id';

  Future<String?> readSelectedRoomId() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getString(_kSelectedRoomId);
    if (v == null || v.trim().isEmpty) return null;
    return v;
  }

  Future<void> writeSelectedRoomId(String? roomId) async {
    final prefs = await SharedPreferences.getInstance();
    if (roomId == null || roomId.trim().isEmpty) {
      await prefs.remove(_kSelectedRoomId);
      return;
    }
    await prefs.setString(_kSelectedRoomId, roomId);
  }
}
