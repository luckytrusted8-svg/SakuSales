class PoSession {
  final String id;
  final String title;
  final String slug;
  final bool open;
  final DateTime? closesAt;
  final DateTime createdAt;

  PoSession({
    required this.id,
    required this.title,
    required this.slug,
    required this.open,
    this.closesAt,
    required this.createdAt,
  });

  factory PoSession.fromJson(Map<String, dynamic> json) {
    return PoSession(
      id: json['id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      open: json['open'] as bool? ?? false,
      closesAt: json['closes_at'] != null ? DateTime.tryParse(json['closes_at'].toString()) : null,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'slug': slug,
      'open': open,
      'closes_at': closesAt?.toIso8601String(),
    };
  }
}
