import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants/app_config.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../models/po_session.dart';

class CreatePoScreen extends StatefulWidget {
  final PoSession? poToEdit;

  const CreatePoScreen({super.key, this.poToEdit});

  @override
  State<CreatePoScreen> createState() => _CreatePoScreenState();
}

class _CreatePoScreenState extends State<CreatePoScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _slugController;

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _isOpen = true;
  bool _isSaving = false;
  bool _isAutoSlug = true;

  bool get _isEdit => widget.poToEdit != null;

  @override
  void initState() {
    super.initState();
    final po = widget.poToEdit;
    _titleController = TextEditingController(text: po?.title ?? '');
    _slugController = TextEditingController(text: po?.slug ?? '');
    _isOpen = po?.open ?? true;
    _isAutoSlug = po == null;

    if (po?.closesAt != null) {
      _selectedDate = po!.closesAt;
      _selectedTime = TimeOfDay(hour: po.closesAt!.hour, minute: po.closesAt!.minute);
    }

    _titleController.addListener(_onTitleChanged);
  }

  @override
  void dispose() {
    _titleController.removeListener(_onTitleChanged);
    _titleController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  void _onTitleChanged() {
    if (_isAutoSlug && !_isEdit) {
      final text = _titleController.text.trim().toLowerCase();
      final slug = text
          .replaceAll(RegExp(r'[^a-z0-9\s_]'), '')
          .replaceAll(RegExp(r'\s+'), '_');
      _slugController.text = slug;
    }
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now.add(const Duration(days: 1)),
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 180)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
              primary: AppColors.primary,
              onPrimary: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedDate != null && mounted) {
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: _selectedTime ?? const TimeOfDay(hour: 20, minute: 0),
        builder: (context, child) {
          return Theme(
            data: Theme.of(context).copyWith(
              colorScheme: Theme.of(context).colorScheme.copyWith(
                primary: AppColors.primary,
                onPrimary: Colors.white,
              ),
            ),
            child: child!,
          );
        },
      );

      setState(() {
        _selectedDate = pickedDate;
        _selectedTime = pickedTime ?? const TimeOfDay(hour: 23, minute: 59);
      });
    }
  }

  void _clearDateTime() {
    setState(() {
      _selectedDate = null;
      _selectedTime = null;
    });
  }

  Future<void> _savePo() async {
    if (!_formKey.currentState!.validate()) return;

    final title = _titleController.text.trim();
    final slug = _slugController.text.trim();

    DateTime? closesAt;
    if (_selectedDate != null) {
      closesAt = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime?.hour ?? 23,
        _selectedTime?.minute ?? 59,
      );
    }

    setState(() => _isSaving = true);

    try {
      if (_isEdit) {
        await SupabaseService.instance.updatePoSession(
          id: widget.poToEdit!.id,
          title: title,
          slug: slug,
          open: _isOpen,
          closesAt: closesAt,
        );
      } else {
        await SupabaseService.instance.createPoSession(
          title: title,
          slug: slug,
          open: _isOpen,
          closesAt: closesAt,
        );
      }

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.success,
            content: Text(
              _isEdit ? 'Sesi PO berhasil diperbarui!' : 'Sesi PO baru berhasil dibuat!',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.danger,
            content: Text('Gagal menyimpan PO: ${e.toString()}'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    final currentSlug = _slugController.text.trim();
    final previewUrl = '${AppConfig.webBaseUrl}/?slug=${currentSlug.isNotEmpty ? currentSlug : "..."}';

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: 'Kembali',
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _isEdit ? 'Edit Sesi Pre Order' : 'Buat Sesi Pre Order',
          style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  minimumSize: const Size(0, 36),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                onPressed: _isSaving ? null : _savePo,
                child: _isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        'Simpan',
                        style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ================= KARTU 1: INFORMASI UTAMA =================
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cardBorder, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.storefront_rounded, size: 18, color: AppColors.primary),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Informasi Sesi',
                            style: GoogleFonts.fredoka(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Input 1: Judul PO
                      Text(
                        'Judul Sesi PO *',
                        style: GoogleFonts.nunito(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _titleController,
                        style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w600),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.campaign_outlined, size: 20, color: AppColors.primary),
                          hintText: 'Contoh: PO Akhir Pekan Keju Aroma',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary, width: 2),
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Judul PO tidak boleh kosong';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 16),

                      // Input 2: Kode Link / Slug
                      Text(
                        'Kode Link Web (Slug) *',
                        style: GoogleFonts.nunito(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _slugController,
                        onChanged: (_) {
                          _isAutoSlug = false;
                          setState(() {});
                        },
                        style: GoogleFonts.nunito(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.link_rounded, size: 20, color: AppColors.primary),
                          hintText: 'contoh: po_keju_sabtu',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: cardBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary, width: 2),
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Kode link wajib diisi';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 10),

                      // Live Preview URL Banner
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF14151A) : const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: cardBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.public_rounded, size: 16, color: AppColors.success),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                previewUrl,
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.success,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // ================= KARTU 2: BATAS WAKTU TUTUP =================
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cardBorder, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: AppColors.accent.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.schedule_rounded, size: 18, color: AppColors.accent),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Batas Waktu Tutup',
                                style: GoogleFonts.fredoka(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          if (_selectedDate != null)
                            TextButton.icon(
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                              icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.danger),
                              label: Text(
                                'Hapus',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.danger,
                                ),
                              ),
                              onPressed: _clearDateTime,
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Opsional. Jika diisi, web pembeli otomatis menolak pesanan setelah batas waktu berakhir.',
                        style: GoogleFonts.nunito(fontSize: 12, color: textMuted),
                      ),
                      const SizedBox(height: 12),

                      InkWell(
                        onTap: _pickDateTime,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedDate != null
                                ? AppColors.primary.withValues(alpha: 0.08)
                                : (isDark ? const Color(0xFF14151A) : const Color(0xFFF8F9FA)),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _selectedDate != null ? AppColors.primary : cardBorder,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.calendar_month_rounded,
                                size: 22,
                                color: _selectedDate != null ? AppColors.primary : textMuted,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _selectedDate == null
                                          ? 'Pilih Batas Waktu Otomatis'
                                          : '${_selectedDate!.day} ${_namaBulan(_selectedDate!.month)} ${_selectedDate!.year}',
                                      style: GoogleFonts.nunito(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: _selectedDate != null ? AppColors.primary : null,
                                      ),
                                    ),
                                    if (_selectedDate != null)
                                      Text(
                                        'Pukul ${_selectedTime?.hour.toString().padLeft(2, "0")}:${_selectedTime?.minute.toString().padLeft(2, "0")} WIB',
                                        style: GoogleFonts.nunito(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: textMuted,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Icon(Icons.chevron_right_rounded, color: textMuted),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // ================= KARTU 3: STATUS BUKA PO (YA / NANTI) =================
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: cardBorder, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: (_isOpen ? AppColors.success : AppColors.accent).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              _isOpen ? Icons.lock_open_rounded : Icons.lock_clock_rounded,
                              size: 18,
                              color: _isOpen ? AppColors.success : AppColors.accent,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Status Sesi Pre Order',
                            style: GoogleFonts.fredoka(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Pilih apakah sesi ini langsung menerima pesanan dari pembeli sekarang atau disimpan dahulu:',
                        style: GoogleFonts.nunito(fontSize: 12, color: textMuted),
                      ),
                      const SizedBox(height: 12),

                      // Segmented Card Pilihan (Ya / Nanti)
                      Row(
                        children: [
                          // Opsi 1: Buka Sekarang (Ya)
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _isOpen = true),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                                decoration: BoxDecoration(
                                  color: _isOpen
                                      ? AppColors.primary
                                      : (isDark ? const Color(0xFF14151A) : const Color(0xFFF8F9FA)),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: _isOpen ? AppColors.primary : cardBorder,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.bolt_rounded,
                                      size: 24,
                                      color: _isOpen ? Colors.white : textMuted,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Buka Sekarang',
                                      style: GoogleFonts.fredoka(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: _isOpen ? Colors.white : null,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Bisa langsung pesan',
                                      style: GoogleFonts.nunito(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: _isOpen ? Colors.white.withValues(alpha: 0.85) : textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Opsi 2: Nanti Saja (Draf)
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _isOpen = false),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                                decoration: BoxDecoration(
                                  color: !_isOpen
                                      ? AppColors.primary
                                      : (isDark ? const Color(0xFF14151A) : const Color(0xFFF8F9FA)),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !_isOpen ? AppColors.primary : cardBorder,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.pause_circle_outline_rounded,
                                      size: 24,
                                      color: !_isOpen ? Colors.white : textMuted,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Simpan Draf',
                                      style: GoogleFonts.fredoka(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: !_isOpen ? Colors.white : null,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Buka saat siap',
                                      style: GoogleFonts.nunito(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: !_isOpen ? Colors.white.withValues(alpha: 0.85) : textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Tombol Simpan Hero di Bawah
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_rounded, size: 20),
                  label: Text(
                    _isSaving
                        ? 'Menyimpan...'
                        : (_isEdit ? 'Perbarui Sesi Pre Order' : 'Terbitkan Sesi Pre Order'),
                    style: GoogleFonts.fredoka(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  onPressed: _isSaving ? null : _savePo,
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _namaBulan(int bulan) {
    const bulanList = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (bulan >= 1 && bulan <= 12) return bulanList[bulan];
    return '';
  }
}
