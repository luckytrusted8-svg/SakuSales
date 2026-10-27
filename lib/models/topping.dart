class Topping {
  final String id;
  final String name;
  final int extraPrice;
  final int hpp;
  final bool active;

  Topping({
    required this.id,
    required this.name,
    required this.extraPrice,
    required this.hpp,
    required this.active,
  });

  factory Topping.fromJson(Map<String, dynamic> json) {
    return Topping(
      id: json['id'] as String,
      name: json['name'] as String,
      extraPrice: json['extra_price'] as int? ?? 2000,
      hpp: json['hpp'] as int? ?? 0,
      active: json['active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'extra_price': extraPrice,
      'hpp': hpp,
      'active': active,
    };
  }
}
