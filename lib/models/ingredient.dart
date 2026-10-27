class Ingredient {
  final String id;
  final String name;
  final String unit;
  final double costPerUnit;

  Ingredient({
    required this.id,
    required this.name,
    required this.unit,
    required this.costPerUnit,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      id: json['id'] as String,
      name: json['name'] as String,
      unit: json['unit'] as String,
      costPerUnit: (json['cost_per_unit'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'unit': unit,
      'cost_per_unit': costPerUnit,
    };
  }
}
