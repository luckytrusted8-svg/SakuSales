import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/product.dart';
import '../../models/size_item.dart';
import '../../models/glaze.dart';
import '../../models/topping.dart';
import '../../models/ingredient.dart';
import '../../models/recipe_line.dart';
import '../../models/po_session.dart';
import '../../models/order.dart';
import '../../models/order_item.dart';
import 'sound_service.dart';

class SupabaseService {
  SupabaseService._();
  static final SupabaseService instance = SupabaseService._();

  SupabaseClient get client => Supabase.instance.client;

  // ---------------- AUTH ----------------
  User? get currentUser => client.auth.currentUser;
  bool get isAuthenticated => currentUser != null;

  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  // ---------------- PRODUK ----------------
  Future<List<Product>> getProducts() async {
    final res = await client.from('products').select().order('created_at');
    return (res as List).map((j) => Product.fromJson(j)).toList();
  }

  Future<void> createProduct(String name) async {
    await client.from('products').insert({'name': name.trim(), 'active': true});
  }

  Future<void> updateProduct(String id, String name, bool active) async {
    await client.from('products').update({'name': name.trim(), 'active': active}).eq('id', id);
  }

  Future<void> deleteProduct(String id) async {
    await client.from('products').delete().eq('id', id);
  }

  // ---------------- UKURAN (SIZES) ----------------
  Future<List<SizeItem>> getSizes({String? productId}) async {
    var query = client.from('sizes').select();
    if (productId != null) {
      query = query.eq('product_id', productId);
    }
    final res = await query.order('price');
    return (res as List).map((j) => SizeItem.fromJson(j)).toList();
  }

  Future<void> createSize(SizeItem size) async {
    await client.from('sizes').insert(size.toJson());
  }

  Future<void> updateSize(SizeItem size) async {
    await client.from('sizes').update(size.toJson()).eq('id', size.id);
  }

  Future<void> deleteSize(String id) async {
    await client.from('sizes').delete().eq('id', id);
  }

  // ---------------- GLAZES ----------------
  Future<List<Glaze>> getGlazes() async {
    final res = await client.from('glazes').select().order('name');
    return (res as List).map((j) => Glaze.fromJson(j)).toList();
  }

  Future<void> createGlaze(String name, int hpp) async {
    await client.from('glazes').insert({'name': name.trim(), 'hpp': hpp, 'active': true});
  }

  Future<void> updateGlaze(String id, String name, int hpp, bool active) async {
    await client.from('glazes').update({'name': name.trim(), 'hpp': hpp, 'active': active}).eq('id', id);
  }

  Future<void> deleteGlaze(String id) async {
    await client.from('glazes').delete().eq('id', id);
  }

  // ---------------- TOPPINGS ----------------
  Future<List<Topping>> getToppings() async {
    final res = await client.from('toppings').select().order('name');
    return (res as List).map((j) => Topping.fromJson(j)).toList();
  }

  Future<void> createTopping(String name, int extraPrice, int hpp) async {
    await client.from('toppings').insert({
      'name': name.trim(),
      'extra_price': extraPrice,
      'hpp': hpp,
      'active': true,
    });
  }

  Future<void> updateTopping(String id, String name, int extraPrice, int hpp, bool active) async {
    await client.from('toppings').update({
      'name': name.trim(),
      'extra_price': extraPrice,
      'hpp': hpp,
      'active': active,
    }).eq('id', id);
  }

  Future<void> deleteTopping(String id) async {
    await client.from('toppings').delete().eq('id', id);
  }

  // ---------------- BAHAN BAKU (INGREDIENTS) ----------------
  Future<List<Ingredient>> getIngredients() async {
    final res = await client.from('ingredients').select().order('name');
    return (res as List).map((j) => Ingredient.fromJson(j)).toList();
  }

  Future<void> createIngredient(String name, String unit, double costPerUnit) async {
    await client.from('ingredients').insert({
      'name': name.trim(),
      'unit': unit.trim(),
      'cost_per_unit': costPerUnit,
    });
  }

  Future<void> updateIngredient(String id, String name, String unit, double costPerUnit) async {
    await client.from('ingredients').update({
      'name': name.trim(),
      'unit': unit.trim(),
      'cost_per_unit': costPerUnit,
    }).eq('id', id);
  }

  Future<void> deleteIngredient(String id) async {
    await client.from('ingredients').delete().eq('id', id);
  }

  // ---------------- RESEP (RECIPES) ----------------
  Future<List<RecipeLine>> getRecipesForSize(String sizeId) async {
    final res = await client
        .from('recipes')
        .select('size_id, ingredient_id, qty, ingredients(name, unit, cost_per_unit)')
        .eq('size_id', sizeId);
    return (res as List).map((j) => RecipeLine.fromJson(j)).toList();
  }

  Future<void> upsertRecipeLine(String sizeId, String ingredientId, double qty) async {
    await client.from('recipes').upsert({
      'size_id': sizeId,
      'ingredient_id': ingredientId,
      'qty': qty,
    });
  }

  Future<void> deleteRecipeLine(String sizeId, String ingredientId) async {
    await client
        .from('recipes')
        .delete()
        .eq('size_id', sizeId)
        .eq('ingredient_id', ingredientId);
  }

  // ---------------- PO SESSIONS ----------------
  Future<List<PoSession>> getPoSessions() async {
    final res = await client.from('po_sessions').select().order('created_at', ascending: false);
    return (res as List).map((j) => PoSession.fromJson(j)).toList();
  }

  Future<void> createPoSession({
    required String title,
    required String slug,
    required bool open,
    DateTime? closesAt,
  }) async {
    await client.from('po_sessions').insert({
      'title': title.trim(),
      'slug': slug.trim(),
      'open': open,
      'closes_at': closesAt?.toIso8601String(),
    });
  }

  Future<void> updatePoStatus(String id, bool open) async {
    await client.from('po_sessions').update({'open': open}).eq('id', id);
  }

  Future<void> updatePoSession({
    required String id,
    required String title,
    required String slug,
    required bool open,
    DateTime? closesAt,
  }) async {
    await client.from('po_sessions').update({
      'title': title.trim(),
      'slug': slug.trim(),
      'open': open,
      'closes_at': closesAt?.toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deletePoSession(String id) async {
    await client.from('po_sessions').delete().eq('id', id);
  }

  // ---------------- ORDERS & REALTIME ----------------
  Stream<List<Order>> streamOrders({String? poId, OrderStatus? status}) {
    var streamQuery = client.from('orders').stream(primaryKey: ['id']).order('created_at', ascending: false);

    return streamQuery.map((list) {
      var orders = list.map((j) => Order.fromJson(j)).toList();
      if (poId != null) {
        orders = orders.where((o) => o.poId == poId).toList();
      }
      if (status != null) {
        orders = orders.where((o) => o.status == status).toList();
      }
      return orders;
    });
  }

  Future<List<Order>> getOrders({String? poId, OrderStatus? status}) async {
    dynamic query = client.from('orders').select();
    if (poId != null) {
      query = query.eq('po_id', poId);
    }
    if (status != null) {
      query = query.eq('status', status.name);
    }
    final res = await query.order('created_at', ascending: false);
    return (res as List).map((j) => Order.fromJson(j)).toList();
  }

  Future<List<OrderItem>> getOrderItems(String orderId) async {
    final res = await client.from('order_items').select().eq('order_id', orderId);
    return (res as List).map((j) => OrderItem.fromJson(j)).toList();
  }

  Future<List<OrderItem>> getOrderItemsForOrders(List<String> orderIds) async {
    if (orderIds.isEmpty) return [];
    final res = await client.from('order_items').select().filter('order_id', 'in', orderIds);
    return (res as List).map((j) => OrderItem.fromJson(j)).toList();
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus newStatus) async {
    await client.from('orders').update({'status': newStatus.name}).eq('id', orderId);
  }

  // Setup Realtime Sound Trigger on INSERT
  RealtimeChannel? _ordersChannel;

  void subscribeToNewOrdersSound({void Function(Map<String, dynamic> record)? onNewOrder}) {
    _ordersChannel?.unsubscribe();
    _ordersChannel = client
        .channel('public:orders_realtime')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'orders',
          callback: (payload) {
            debugPrint('Realtime pesanan baru terdeteksi via Supabase Realtime: ${payload.newRecord}');
            SoundService.playNewOrderSound();
            HapticFeedback.heavyImpact();
            if (onNewOrder != null && payload.newRecord.isNotEmpty) {
              onNewOrder(payload.newRecord);
            }
          },
        )
        .subscribe();
  }

  void unsubscribeFromNewOrdersSound() {
    _ordersChannel?.unsubscribe();
    _ordersChannel = null;
  }
}
