class Glaze {
  final String id;
  final String name;
  final int hpp;
  final bool active;

  Glaze({
    required this.id,
    required this.name,
    required this.hpp,
    required this.active,
  });

  factory Glaze.fromJson(Map<String, dynamic> json) {
    return Glaze(
      id: json['id'] as String,
      name: json['name'] as String,
      hpp: json['hpp'] as int? ?? 0,
      active: json['active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'hpp': hpp,
      'active': active,
    };
  }
}
