import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/order.dart';
import '../../models/order_item.dart';
import '../../models/po_session.dart';

class PoRecapScreen extends StatefulWidget {
  final PoSession poSession;

  const PoRecapScreen({super.key, required this.poSession});

  @override
  State<PoRecapScreen> createState() => _PoRecapScreenState();
}

class _PoRecapScreenState extends State<PoRecapScreen> {
  List<Order> _orders = [];
  List<OrderItem> _orderItems = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadRecap();
  }

  Future<void> _loadRecap() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final orders = await SupabaseService.instance.getOrders(poId: widget.poSession.id);
      final activeOrderIds = orders
          .where((o) => o.status != OrderStatus.batal)
          .map((o) => o.id)
          .toList();
      final items = await SupabaseService.instance.getOrderItemsForOrders(activeOrderIds);

      if (mounted) {
        setState(() {
          _orders = orders;
          _orderItems = items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat rekap PO: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Kalkulasi rekap finansial
    // Pesanan yang dibatalkan tidak dihitung ke omzet/HPP aktif
    final activeOrders = _orders.where((o) => o.status != OrderStatus.batal).toList();
    final totalOmzet = activeOrders.fold<int>(0, (sum, o) => sum + o.total);
    final totalHpp = activeOrders.fold<int>(0, (sum, o) => sum + o.totalHpp);
    final totalLaba = totalOmzet - totalHpp;

    final unfulfilledCount = _orders.where(
      (o) => o.status == OrderStatus.baru || o.status == OrderStatus.menunggu_bayar,
    ).length;

    // Agregasi Menu, Glaze, dan Topping untuk Dapur
    final Map<String, int> menuSummary = {};
    final Map<String, int> glazeSummary = {};
    final Map<String, int> toppingSummary = {};

    for (final item in _orderItems) {
      final menuKey = '${item.productName} (${item.sizeName})';
      menuSummary[menuKey] = (menuSummary[menuKey] ?? 0) + item.qty;

      for (final g in item.glazeNames) {
        if (g.trim().isNotEmpty) {
          glazeSummary[g] = (glazeSummary[g] ?? 0) + item.qty;
        }
      }

      for (final t in item.toppingNames) {
        if (t.trim().isNotEmpty) {
          toppingSummary[t] = (toppingSummary[t] ?? 0) + item.qty;
        }
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Rekap: ${widget.poSession.title}'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadRecap,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_errorMessage!, style: const TextStyle(color: AppColors.pink)),
                      ),

                    // 1. Ringkasan Finansial Utama
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Ringkasan Keuangan PO',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Divider(height: 20),
                            _buildMetricRow('Total Omzet Penjualan', CurrencyFormatter.format(totalOmzet), isBold: true),
                            _buildMetricRow('Total HPP Bahan Baku', CurrencyFormatter.format(totalHpp)),
                            const Divider(height: 20),
                            _buildMetricRow(
                              'Total Laba Bersih PO',
                              CurrencyFormatter.format(totalLaba),
                              isBold: true,
                              valueColor: totalLaba >= 0 ? AppColors.olive : AppColors.pink,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 2. Kartu Rekap Produksi Dapur
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.soup_kitchen_outlined, color: AppColors.primary, size: 22),
                                const SizedBox(width: 8),
                                Text(
                                  'Rekap Produksi Dapur',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            Text(
                              'Porsi Menu yang Harus Dimasak:',
                              style: GoogleFonts.nunito(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Theme.of(context).textTheme.bodySmall?.color,
                              ),
                            ),
                            const SizedBox(height: 6),
                            if (menuSummary.isEmpty)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 4),
                                child: Text('Belum ada pesanan aktif.', style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
                              )
                            else
                              ...menuSummary.entries.map((e) => _buildMetricRow(e.key, '${e.value} box / porsi', isBold: true)),

                            if (glazeSummary.isNotEmpty) ...[
                              const Divider(height: 20),
                              Text(
                                'Kebutuhan Glaze / Rasa:',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                ),
                              ),
                              const SizedBox(height: 6),
                              ...glazeSummary.entries.map((e) => _buildMetricRow(e.key, '${e.value} porsi', valueColor: AppColors.primary)),
                            ],

                            if (toppingSummary.isNotEmpty) ...[
                              const Divider(height: 20),
                              Text(
                                'Kebutuhan Topping Tambahan:',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                ),
                              ),
                              const SizedBox(height: 6),
                              ...toppingSummary.entries.map((e) => _buildMetricRow(e.key, '${e.value} porsi', valueColor: AppColors.olive)),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3. Kartu Status Pembayaran
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Status Pelunasan',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Divider(height: 20),
                            _buildMetricRow('Total Seluruh Pesanan', '${_orders.length} pesanan'),
                            _buildMetricRow(
                              'Pesanan Belum Lunas',
                              '$unfulfilledCount pesanan',
                              valueColor: unfulfilledCount > 0 ? AppColors.statusMenungguBayar : AppColors.olive,
                              isBold: true,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 4. Rincian per Status
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Rincian per Status',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const Divider(height: 16),
                            ...OrderStatus.values.map((s) {
                              final count = _orders.where((o) => o.status == s).length;
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(s.label, style: const TextStyle(fontSize: 13)),
                                    Text(
                                      '$count pesanan',
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}
