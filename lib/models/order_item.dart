class OrderItem {
  final String id;
  final String orderId;
  final String? sizeId;
  final String productName;
  final String sizeName;
  final int qty;
  final int unitPrice;
  final int unitHpp;
  final List<String> glazeNames;
  final List<String> toppingNames;
  final String? note;

  OrderItem({
    required this.id,
    required this.orderId,
    this.sizeId,
    required this.productName,
    required this.sizeName,
    required this.qty,
    required this.unitPrice,
    required this.unitHpp,
    required this.glazeNames,
    required this.toppingNames,
    this.note,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic val) {
      if (val == null) return [];
      if (val is List) return val.map((e) => e.toString()).toList();
      return [];
    }

    return OrderItem(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      sizeId: json['size_id'] as String?,
      productName: json['product_name'] as String? ?? '',
      sizeName: json['size_name'] as String? ?? '',
      qty: json['qty'] as int? ?? 1,
      unitPrice: json['unit_price'] as int? ?? 0,
      unitHpp: json['unit_hpp'] as int? ?? 0,
      glazeNames: parseList(json['glaze_names']),
      toppingNames: parseList(json['topping_names']),
      note: json['note'] as String?,
    );
  }
}
