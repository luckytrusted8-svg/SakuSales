import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/order.dart';
import '../../models/order_item.dart';

class OrderDetailScreen extends StatefulWidget {
  final Order order;

  const OrderDetailScreen({super.key, required this.order});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late Order _order;
  List<OrderItem> _items = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _fetchItems();
  }

  Future<void> _fetchItems() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await SupabaseService.instance.getOrderItems(_order.id);
      if (mounted) {
        setState(() {
          _items = items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat item pesanan: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _changeStatus(OrderStatus newStatus) async {
    try {
      await SupabaseService.instance.updateOrderStatus(_order.id, newStatus);
      setState(() {
        _order = Order(
          id: _order.id,
          poId: _order.poId,
          buyerName: _order.buyerName,
          buyerWa: _order.buyerWa,
          address: _order.address,
          pickup: _order.pickup,
          payment: _order.payment,
          note: _order.note,
          status: newStatus,
          total: _order.total,
          totalHpp: _order.totalHpp,
          createdAt: _order.createdAt,
        );
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status pesanan diubah ke: ${newStatus.label}')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengubah status: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _chatBuyerWa() async {
    var waNum = _order.buyerWa.replaceAll(RegExp(r'[^0-9]'), '');
    if (waNum.startsWith('0')) {
      waNum = '62${waNum.substring(1)}';
    }
    final uri = Uri.parse('https://wa.me/$waNum');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Color _getStatusColor(OrderStatus s) {
    switch (s) {
      case OrderStatus.baru:
        return AppColors.statusBaru;
      case OrderStatus.menunggu_bayar:
        return AppColors.statusMenungguBayar;
      case OrderStatus.lunas:
        return AppColors.statusLunas;
      case OrderStatus.diproses:
        return AppColors.statusDiproses;
      case OrderStatus.selesai:
        return AppColors.statusSelesai;
      case OrderStatus.batal:
        return AppColors.statusBatal;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(_order.status);
    final laba = _order.total - _order.totalHpp;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Pesanan'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.pinkSoft,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(_errorMessage!, style: const TextStyle(color: AppColors.pink)),
                    ),
                  // Status Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: statusColor, width: 1.5),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Status Pesanan',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _order.status.label,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Data Pembeli
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Data Pembeli',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              IconButton(
                                icon: const Icon(Icons.chat_outlined, color: Colors.green),
                                tooltip: 'Chat WhatsApp',
                                onPressed: _chatBuyerWa,
                              ),
                            ],
                          ),
                          const Divider(),
                          _buildInfoRow('Nama', _order.buyerName),
                          _buildInfoRow('WhatsApp', _order.buyerWa),
                          _buildInfoRow(
                            'Pengantaran',
                            _order.pickup ? 'Ambil Sendiri' : (_order.address ?? '-'),
                          ),
                          _buildInfoRow('Metode Bayar', _order.payment.label),
                          if (_order.note != null && _order.note!.isNotEmpty)
                            _buildInfoRow('Catatan', _order.note!),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Daftar Item
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Rincian Menu',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const Divider(),
                          if (_items.isEmpty)
                            const Text('Tidak ada item pada pesanan ini.')
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _items.length,
                              separatorBuilder: (_, __) => const Divider(height: 16),
                              itemBuilder: (ctx, idx) {
                                final item = _items[idx];
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${item.productName} (${item.sizeName}) x${item.qty}',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 14,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          CurrencyFormatter.format(item.unitPrice * item.qty),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.olive,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (item.glazeNames.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        'Glaze: ${item.glazeNames.join(", ")}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Theme.of(context).textTheme.bodySmall?.color,
                                        ),
                                      ),
                                    ],
                                    if (item.toppingNames.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        'Topping: ${item.toppingNames.join(", ")}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Theme.of(context).textTheme.bodySmall?.color,
                                        ),
                                      ),
                                    ],
                                    if (item.note != null && item.note!.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        'Catatan: ${item.note}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 4),
                                    Text(
                                      'HPP: ${CurrencyFormatter.format(item.unitHpp)} / porsi',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Total & HPP Ringkasan
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Kalkulasi Keuangan',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const Divider(),
                          _buildFinanceRow('Total Omzet (Harga Jual)', CurrencyFormatter.format(_order.total), isBold: true),
                          _buildFinanceRow('Total HPP (Biaya Bahan)', CurrencyFormatter.format(_order.totalHpp)),
                          const Divider(),
                          _buildFinanceRow(
                            'Estimasi Laba Kotor',
                            CurrencyFormatter.format(laba),
                            isBold: true,
                            color: laba >= 0 ? AppColors.olive : AppColors.pink,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Tombol Aksi Status
                  Text(
                    'Ubah Status Pesanan',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),

                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (_order.status == OrderStatus.baru)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.schedule_outlined, size: 18),
                          label: const Text('Menunggu Bayar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.statusMenungguBayar,
                            minimumSize: const Size(140, 44),
                          ),
                          onPressed: () => _changeStatus(OrderStatus.menunggu_bayar),
                        ),

                      if (_order.status == OrderStatus.baru || _order.status == OrderStatus.menunggu_bayar)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.check_circle_outline, size: 18),
                          label: Text(_order.payment == PaymentMethod.cash ? 'Tandai Lunas (Cash Diterima)' : 'Tandai Lunas (TF Dicek)'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.statusLunas,
                            minimumSize: const Size(140, 44),
                          ),
                          onPressed: () => _changeStatus(OrderStatus.lunas),
                        ),

                      if (_order.status == OrderStatus.lunas)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.soup_kitchen_outlined, size: 18),
                          label: const Text('Mulai Diproses'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.statusDiproses,
                            minimumSize: const Size(140, 44),
                          ),
                          onPressed: () => _changeStatus(OrderStatus.diproses),
                        ),

                      if (_order.status == OrderStatus.diproses)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.done_all, size: 18),
                          label: const Text('Tandai Selesai'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.statusSelesai,
                            minimumSize: const Size(140, 44),
                          ),
                          onPressed: () => _changeStatus(OrderStatus.selesai),
                        ),

                      if (_order.status != OrderStatus.selesai && _order.status != OrderStatus.batal)
                        OutlinedButton.icon(
                          icon: const Icon(Icons.cancel_outlined, size: 18, color: AppColors.pink),
                          label: const Text('Batalkan Pesanan', style: TextStyle(color: AppColors.pink)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.pink),
                            minimumSize: const Size(140, 44),
                          ),
                          onPressed: () => _changeStatus(OrderStatus.batal),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinanceRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
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
              fontSize: 14,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
