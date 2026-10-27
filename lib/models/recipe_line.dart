class RecipeLine {
  final String sizeId;
  final String ingredientId;
  final double qty;
  final String? ingredientName;
  final String? ingredientUnit;
  final double? ingredientCostPerUnit;

  RecipeLine({
    required this.sizeId,
    required this.ingredientId,
    required this.qty,
    this.ingredientName,
    this.ingredientUnit,
    this.ingredientCostPerUnit,
  });

  factory RecipeLine.fromJson(Map<String, dynamic> json) {
    return RecipeLine(
      sizeId: json['size_id'] as String,
      ingredientId: json['ingredient_id'] as String,
      qty: (json['qty'] as num?)?.toDouble() ?? 0.0,
      ingredientName: json['ingredients'] != null ? json['ingredients']['name'] as String? : null,
      ingredientUnit: json['ingredients'] != null ? json['ingredients']['unit'] as String? : null,
      ingredientCostPerUnit: json['ingredients'] != null
          ? (json['ingredients']['cost_per_unit'] as num?)?.toDouble()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'size_id': sizeId,
      'ingredient_id': ingredientId,
      'qty': qty,
    };
  }
}
