class SizeItem {
  final String id;
  final String productId;
  final String name;
  final int pieces;
  final int price;
  final int includedGlaze;
  final int extraGlazePrice;
  final bool active;

  SizeItem({
    required this.id,
    required this.productId,
    required this.name,
    required this.pieces,
    required this.price,
    required this.includedGlaze,
    required this.extraGlazePrice,
    required this.active,
  });

  factory SizeItem.fromJson(Map<String, dynamic> json) {
    return SizeItem(
      id: json['id'] as String,
      productId: json['product_id'] as String,
      name: json['name'] as String,
      pieces: json['pieces'] as int? ?? 1,
      price: json['price'] as int? ?? 0,
      includedGlaze: json['included_glaze'] as int? ?? 1,
      extraGlazePrice: json['extra_glaze_price'] as int? ?? 2000,
      active: json['active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'name': name,
      'pieces': pieces,
      'price': price,
      'included_glaze': includedGlaze,
      'extra_glaze_price': extraGlazePrice,
      'active': active,
    };
  }
}
