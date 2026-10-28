import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/order.dart';
import '../../models/po_session.dart';
import '../po/po_screen.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  final VoidCallback? onSwitchToPo;
  const OrdersScreen({super.key, this.onSwitchToPo});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  OrderStatus? _selectedStatus;
  String? _selectedPoId;
  List<PoSession> _poList = [];
  bool _isLoadingPo = true;

  @override
  void initState() {
    super.initState();
    _loadPoSessions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPoSessions() async {
    try {
      final sessions = await SupabaseService.instance.getPoSessions();
      if (mounted) {
        setState(() {
          _poList = sessions;
          _isLoadingPo = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingPo = false;
        });
      }
    }
  }

  Color _getStatusBgColor(OrderStatus s) {
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Pesanan Masuk',
          style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 20),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            tooltip: 'Segarkan PO',
            onPressed: _loadPoSessions,
          ),
        ],
        elevation: 0,
      ),
      body: StreamBuilder<List<Order>>(
        stream: SupabaseService.instance.streamOrders(
          poId: _selectedPoId,
        ),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Text(
                  'Gagal memuat pesanan: ${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.nunito(color: AppColors.danger),
                ),
              ),
            );
          }

          final allOrders = snapshot.data ?? [];
          final statusFiltered = _selectedStatus == null
              ? allOrders
              : allOrders.where((o) => o.status == _selectedStatus).toList();

          final filteredOrders = statusFiltered.where((o) {
            if (_searchQuery.isEmpty) return true;
            final q = _searchQuery.toLowerCase();
            final nameMatch = o.buyerName.toLowerCase().contains(q);
            final waMatch = o.buyerWa.contains(q);
            return nameMatch || waMatch;
          }).toList();

          return Column(
            children: [
              // Filter Bar
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                  border: Border(
                    bottom: BorderSide(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Kolom Pencarian Cepat Nama & WhatsApp
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                      child: TextField(
                        controller: _searchController,
                        style: GoogleFonts.nunito(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Cari nama pemesan atau nomor WA...',
                          hintStyle: GoogleFonts.nunito(
                            fontSize: 13,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                          prefixIcon: const Icon(Icons.search_rounded, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, size: 18),
                                  onPressed: () {
                                    setState(() {
                                      _searchController.clear();
                                      _searchQuery = '';
                                    });
                                  },
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                          ),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF252936) : Colors.white,
                        ),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val.trim();
                          });
                        },
                      ),
                    ),

                    // PO Selector Dropdown
                    if (!_isLoadingPo && _poList.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF252936) : Colors.white,
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String?>(
                              value: _selectedPoId,
                              isExpanded: true,
                              hint: const Text('Semua Sesi PO', style: TextStyle(fontSize: 14)),
                              items: [
                                const DropdownMenuItem<String?>(
                                  value: null,
                                  child: Text('Semua Sesi PO', style: TextStyle(fontWeight: FontWeight.w600)),
                                ),
                                ..._poList.map((po) => DropdownMenuItem<String?>(
                                      value: po.id,
                                      child: Text('${po.title} (${po.open ? "Buka" : "Tutup"})'),
                                    )),
                              ],
                              onChanged: (val) {
                                setState(() {
                                  _selectedPoId = val;
                                });
                              },
                            ),
                          ),
                        ),
                      ),

                    // Scrollable Filter Chips (Pill-shaped, Dark Mode Styled)
                    ScrollConfiguration(
                      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
                        child: Row(
                          children: [
                            _buildFilterChip('Semua', null, allOrders.length),
                            ...OrderStatus.values.map(
                              (s) => _buildFilterChip(
                                s.label,
                                s,
                                allOrders.where((o) => o.status == s).length,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Realtime Orders Stream List
              Expanded(
                child: filteredOrders.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.receipt_long_outlined,
                                size: 52,
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                              ),
                              const SizedBox(height: 14),
                              Text(
                                _selectedStatus != null
                                    ? 'Tidak ada pesanan dengan status "${_selectedStatus!.label}".'
                                    : 'Belum ada pesanan. Bagikan link PO ke grup.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.nunito(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppColors.lightText,
                                ),
                              ),
                              const SizedBox(height: 18),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                                ),
                                icon: const Icon(Icons.share_outlined, size: 18),
                                label: Text(
                                  'Buka Menu Pre Order',
                                  style: GoogleFonts.fredoka(fontWeight: FontWeight.w700),
                                ),
                                onPressed: () {
                                  if (widget.onSwitchToPo != null) {
                                    widget.onSwitchToPo!();
                                  } else {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(builder: (_) => const PoScreen()),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: filteredOrders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final order = filteredOrders[index];
                          final statusBg = _getStatusBgColor(order.status);

                          return InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => OrderDetailScreen(order: order),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Theme.of(context).cardColor,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: Theme.of(context).brightness == Brightness.dark
                                      ? AppColors.darkBorder
                                      : AppColors.lightBorder,
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Main Info
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              order.buyerName,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 15,
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            if (order.pickup)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.gold.withValues(alpha: 0.18),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text(
                                                  'Ambil Sendiri',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w700,
                                                    color: AppColors.gold,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Text(
                                              order.payment.label,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Theme.of(context).textTheme.bodySmall?.color,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '·',
                                              style: TextStyle(
                                                color: Theme.of(context).textTheme.bodySmall?.color,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              _formatTime(order.createdAt),
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Theme.of(context).textTheme.bodySmall?.color,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Total & Status Chip
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        CurrencyFormatter.format(order.total),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15,
                                          color: AppColors.olive,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: statusBg,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          order.status.label,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterChip(String label, OrderStatus? status, int count) {
    final isSelected = _selectedStatus == status;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Spesifikasi Warna:
    // Chip Aktif: background #FF5722, teks putih bold
    // Chip Non-Aktif: background #2A2D3A, teks #A0A0A0
    final bgColor = isSelected
        ? const Color(0xFFFF5722)
        : (isDark ? const Color(0xFF2A2D3A) : const Color(0xFFE8ECEF));

    final textColor = isSelected
        ? Colors.white
        : (isDark ? const Color(0xFFA0A0A0) : const Color(0xFF5A6275));

    final badgeText = count > 0 ? ' ($count)' : '';

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            setState(() {
              _selectedStatus = status;
            });
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(20),
              // Hapus garis tepi (border) yang kaku
            ),
            child: Text(
              '$label$badgeText',
              style: GoogleFonts.nunito(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: textColor,
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    final hour = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final mon = _getMonthName(local.month);
    return '$day $mon $hour:$min';
  }

  String _getMonthName(int m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[m - 1];
  }
}
