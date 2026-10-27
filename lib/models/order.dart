enum OrderStatus {
  baru,
  // ignore: constant_identifier_names
  menunggu_bayar,
  lunas,
  diproses,
  selesai,
  batal;

  String get label {
    switch (this) {
      case OrderStatus.baru:
        return 'Baru';
      case OrderStatus.menunggu_bayar:
        return 'Menunggu Bayar';
      case OrderStatus.lunas:
        return 'Lunas';
      case OrderStatus.diproses:
        return 'Diproses';
      case OrderStatus.selesai:
        return 'Selesai';
      case OrderStatus.batal:
        return 'Batal';
    }
  }

  static OrderStatus fromString(String val) {
    switch (val.toLowerCase()) {
      case 'baru':
        return OrderStatus.baru;
      case 'menunggu_bayar':
        return OrderStatus.menunggu_bayar;
      case 'lunas':
        return OrderStatus.lunas;
      case 'diproses':
        return OrderStatus.diproses;
      case 'selesai':
        return OrderStatus.selesai;
      case 'batal':
        return OrderStatus.batal;
      default:
        return OrderStatus.baru;
    }
  }
}

enum PaymentMethod {
  qris,
  cash;

  String get label {
    switch (this) {
      case PaymentMethod.qris:
        return 'QRIS';
      case PaymentMethod.cash:
        return 'Cash';
    }
  }

  static PaymentMethod fromString(String val) {
    return val.toLowerCase() == 'cash' ? PaymentMethod.cash : PaymentMethod.qris;
  }
}

class Order {
  final String id;
  final String poId;
  final String buyerName;
  final String buyerWa;
  final String? address;
  final bool pickup;
  final PaymentMethod payment;
  final String? note;
  final OrderStatus status;
  final int total;
  final int totalHpp;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.poId,
    required this.buyerName,
    required this.buyerWa,
    this.address,
    required this.pickup,
    required this.payment,
    this.note,
    required this.status,
    required this.total,
    required this.totalHpp,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      poId: json['po_id'] as String,
      buyerName: json['buyer_name'] as String,
      buyerWa: json['buyer_wa'] as String,
      address: json['address'] as String?,
      pickup: json['pickup'] as bool? ?? false,
      payment: PaymentMethod.fromString(json['payment']?.toString() ?? 'qris'),
      note: json['note'] as String?,
      status: OrderStatus.fromString(json['status']?.toString() ?? 'baru'),
      total: json['total'] as int? ?? 0,
      totalHpp: json['total_hpp'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
