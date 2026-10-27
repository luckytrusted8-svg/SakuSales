import 'package:flutter/material.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/order.dart';
import '../../models/po_session.dart';

class PoRecapScreen extends StatefulWidget {
  final PoSession poSession;

  const PoRecapScreen({super.key, required this.poSession});

  @override
  State<PoRecapScreen> createState() => _PoRecapScreenState();
}

class _PoRecapScreenState extends State<PoRecapScreen> {
  List<Order> _orders = [];
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
      if (mounted) {
        setState(() {
          _orders = orders;
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
    // Kalkulasi rekap
    // Pesanan yang dibatalkan tidak dihitung ke omzet/HPP aktif
    final activeOrders = _orders.where((o) => o.status != OrderStatus.batal).toList();
    final totalOmzet = activeOrders.fold<int>(0, (sum, o) => sum + o.total);
    final totalHpp = activeOrders.fold<int>(0, (sum, o) => sum + o.totalHpp);
    final totalLaba = totalOmzet - totalHpp;

    final unfulfilledCount = _orders.where(
      (o) => o.status == OrderStatus.baru || o.status == OrderStatus.menunggu_bayar,
    ).length;

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

                    // Ringkasan Finansial Utama
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

                    // Kartu Status Pembayaran
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

                    // Rincian per Status
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
