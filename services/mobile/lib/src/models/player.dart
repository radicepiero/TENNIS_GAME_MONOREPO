import '../utils/json_utils.dart';

class PlayerDto {
  final String id;
  final String name;
  final String? country;
  final String? imageSrc;
  final String? imageAlt;

  const PlayerDto({
    required this.id,
    required this.name,
    required this.country,
    required this.imageSrc,
    required this.imageAlt,
  });

  factory PlayerDto.fromJson(Map<String, dynamic> json) {
    return PlayerDto(
      id: JsonUtils.asString(json['id']),
      name: JsonUtils.asString(json['name']),
      country: (() {
        final v = JsonUtils.asString(json['country']);
        return v.isEmpty ? null : v;
      })(),
      imageSrc: (() {
        final v = JsonUtils.asString(json['image_src']);
        return v.isEmpty ? null : v;
      })(),
      imageAlt: (() {
        final v = JsonUtils.asString(json['image_alt']);
        return v.isEmpty ? null : v;
      })(),
    );
  }
}
