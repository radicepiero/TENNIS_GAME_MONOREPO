import '../utils/json_utils.dart';

class RoomDto {
  final String id;
  final String name;

  const RoomDto({required this.id, required this.name});

  factory RoomDto.fromJson(Map<String, dynamic> json) {
    return RoomDto(
      id: JsonUtils.asString(json['id']),
      name: JsonUtils.asString(json['name']),
    );
  }
}
