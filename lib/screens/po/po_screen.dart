import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/constants/app_config.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../models/po_session.dart';
import 'po_recap_screen.dart';

class PoScreen extends StatefulWidget {
  const PoScreen({super.key});

  @override
  State<PoScreen> createState() => _PoScreenState();
}

class _PoScreenState extends State<PoScreen> {
  List<PoSession> _poList = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadPoList();
  }

  Future<void> _loadPoList() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await SupabaseService.instance.getPoSessions();
      if (mounted) {
        setState(() {
          _poList = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat sesi PO: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _togglePoStatus(PoSession po, bool newStatus) async {
    try {
      await SupabaseService.instance.updatePoStatus(po.id, newStatus);
      _loadPoList();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('PO "${po.title}" ${newStatus ? "dibuka" : "ditutup"}.')),
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

  void _showCreatePoDialog() {
    final titleController = TextEditingController();
    final slugController = TextEditingController();
    bool openImmediate = true;
    DateTime? selectedDate;
    TimeOfDay? selectedTime;

    void updateSlug(String text) {
      final slug = text
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9\s]'), '')
          .replaceAll(RegExp(r'\s+'), '_');
      slugController.text = slug;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            title: const Text('Buat Sesi PO Baru'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Judul PO', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(hintText: 'Contoh: PO Batch 1 Sabtu'),
                    onChanged: updateSlug,
                  ),
                  const SizedBox(height: 12),
                  const Text('Kode Link / Slug', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: slugController,
                    decoration: const InputDecoration(hintText: 'contoh: po_batch_1_sabtu'),
                  ),
                  const SizedBox(height: 12),
                  const Text('Batas Waktu Tutup (Opsional)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 6),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today_outlined, size: 16),
                    label: Text(
                      selectedDate == null
                          ? 'Pilih Batas Waktu'
                          : '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year} ${selectedTime != null ? "${selectedTime!.hour.toString().padLeft(2, '0')}:${selectedTime!.minute.toString().padLeft(2, '0')}" : ""}',
                      style: const TextStyle(fontSize: 13),
                    ),
                    onPressed: () async {
                      final pickedDate = await showDatePicker(
                        context: ctx,
                        initialDate: DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (pickedDate != null && ctx.mounted) {
                        final pickedTime = await showTimePicker(
                          context: ctx,
                          initialTime: const TimeOfDay(hour: 20, minute: 0),
                        );
                        setDialogState(() {
                          selectedDate = pickedDate;
                          selectedTime = pickedTime;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Buka PO Sekarang', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    value: openImmediate,
                    // ignore: deprecated_member_use
                    activeColor: AppColors.olive,
                    onChanged: (val) {
                      setDialogState(() {
                        openImmediate = val;
                      });
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
                onPressed: () async {
                  final title = titleController.text.trim();
                  final slug = slugController.text.trim();

                  if (title.isEmpty || slug.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Judul dan kode link wajib diisi.')),
                    );
                    return;
                  }

                  DateTime? closesAt;
                  if (selectedDate != null) {
                    closesAt = DateTime(
                      selectedDate!.year,
                      selectedDate!.month,
                      selectedDate!.day,
                      selectedTime?.hour ?? 23,
                      selectedTime?.minute ?? 59,
                    );
                  }

                  try {
                    await SupabaseService.instance.createPoSession(
                      title: title,
                      slug: slug,
                      open: openImmediate,
                      closesAt: closesAt,
                    );
                    if (ctx.mounted) Navigator.pop(ctx);
                    _loadPoList();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Sesi PO berhasil dibuat.')),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Gagal membuat PO: ${e.toString()}')),
                      );
                    }
                  }
                },
                child: const Text('Simpan'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _sharePoLink(PoSession po) {
    final link = '${AppConfig.webBaseUrl}/?slug=${po.slug}';
    Clipboard.setData(ClipboardData(text: link));
    Share.share(
      'Halo! Pre Order "${po.title}" sudah dibuka. Pesan sekarang di: $link',
      subject: 'Link Pre Order SakuSales',
    );
  }

  void _showEditPoDialog(PoSession po) {
    final titleController = TextEditingController(text: po.title);
    final slugController = TextEditingController(text: po.slug);
    DateTime? selectedDate = po.closesAt;
    TimeOfDay? selectedTime = po.closesAt != null
        ? TimeOfDay(hour: po.closesAt!.hour, minute: po.closesAt!.minute)
        : null;
    bool isOpen = po.open;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            title: const Text('Edit Sesi Pre Order'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Judul Sesi PO',
                      hintText: 'Contoh: PO Batch 2 Akhir Pekan',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: slugController,
                    decoration: const InputDecoration(
                      labelText: 'Kode Link Web (Slug)',
                      hintText: 'Contoh: po_batch2',
                      helperText: 'Huruf kecil, angka, atau garis bawah',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.event_outlined, size: 18),
                    label: Text(
                      selectedDate == null
                          ? 'Atur Batas Waktu Tutup (Opsional)'
                          : 'Tutup: ${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year} ${selectedTime != null ? "${selectedTime!.hour.toString().padLeft(2, '0')}:${selectedTime!.minute.toString().padLeft(2, '0')}" : ""}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    onPressed: () async {
                      final pickedDate = await showDatePicker(
                        context: ctx,
                        initialDate: selectedDate ?? DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (pickedDate != null && ctx.mounted) {
                        final pickedTime = await showTimePicker(
                          context: ctx,
                          initialTime: selectedTime ?? const TimeOfDay(hour: 20, minute: 0),
                        );
                        setDialogState(() {
                          selectedDate = pickedDate;
                          selectedTime = pickedTime;
                        });
                      }
                    },
                  ),
                  if (selectedDate != null)
                    TextButton(
                      onPressed: () {
                        setDialogState(() {
                          selectedDate = null;
                          selectedTime = null;
                        });
                      },
                      child: const Text('Hapus Batas Waktu', style: TextStyle(fontSize: 12, color: AppColors.pink)),
                    ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Status PO Buka', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    value: isOpen,
                    activeThumbColor: AppColors.olive,
                    onChanged: (val) {
                      setDialogState(() {
                        isOpen = val;
                      });
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
                onPressed: () async {
                  final title = titleController.text.trim();
                  final slug = slugController.text.trim();

                  if (title.isEmpty || slug.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Judul dan kode link wajib diisi.')),
                    );
                    return;
                  }

                  DateTime? closesAt;
                  if (selectedDate != null) {
                    closesAt = DateTime(
                      selectedDate!.year,
                      selectedDate!.month,
                      selectedDate!.day,
                      selectedTime?.hour ?? 23,
                      selectedTime?.minute ?? 59,
                    );
                  }

                  try {
                    await SupabaseService.instance.updatePoSession(
                      id: po.id,
                      title: title,
                      slug: slug,
                      open: isOpen,
                      closesAt: closesAt,
                    );
                    if (ctx.mounted) Navigator.pop(ctx);
                    _loadPoList();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Sesi PO berhasil diperbarui.')),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Gagal memperbarui PO: ${e.toString()}')),
                      );
                    }
                  }
                },
                child: const Text('Simpan'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeletePo(PoSession po) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Sesi PO?'),
        content: Text(
          'Apakah Anda yakin ingin menghapus sesi PO "${po.title}"?\n\n'
          'Seluruh pesanan di dalam sesi ini juga akan terhapus secara permanen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.pink,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await SupabaseService.instance.deletePoSession(po.id);
                _loadPoList();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Sesi PO "${po.title}" berhasil dihapus.')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Gagal menghapus PO: ${e.toString()}')),
                  );
                }
              }
            },
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manajemen Pre Order'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Buat Sesi PO',
            onPressed: _showCreatePoDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _poList.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Belum ada sesi PO. Buat sesi baru untuk mulai jualan.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Buat Sesi PO Pertama'),
                          onPressed: _showCreatePoDialog,
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadPoList,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _poList.length + (_errorMessage != null ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (_errorMessage != null && index == 0) {
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.pinkSoft,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(_errorMessage!, style: const TextStyle(color: AppColors.pink)),
                        );
                      }
                      final poIndex = _errorMessage != null ? index - 1 : index;
                      final po = _poList[poIndex];

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          po.title,
                                          style: Theme.of(context).textTheme.titleLarge,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Kode: ${po.slug}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: AppColors.olive,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 20),
                                    tooltip: 'Edit Sesi PO',
                                    visualDensity: VisualDensity.compact,
                                    onPressed: () => _showEditPoDialog(po),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.pink),
                                    tooltip: 'Hapus Sesi PO',
                                    visualDensity: VisualDensity.compact,
                                    onPressed: () => _confirmDeletePo(po),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  if (po.closesAt != null)
                                    Text(
                                      'Batas: ${po.closesAt!.day}/${po.closesAt!.month}/${po.closesAt!.year} ${po.closesAt!.hour.toString().padLeft(2, '0')}:${po.closesAt!.minute.toString().padLeft(2, '0')}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Theme.of(context).textTheme.bodySmall?.color,
                                      ),
                                    )
                                  else
                                    const Text('Tanpa batas waktu', style: TextStyle(fontSize: 11)),
                                  Row(
                                    children: [
                                      Text(
                                        po.open ? 'Buka' : 'Tutup',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: po.open ? AppColors.olive : AppColors.pink,
                                        ),
                                      ),
                                      Switch(
                                        value: po.open,
                                        activeThumbColor: AppColors.olive,
                                        onChanged: (val) => _togglePoStatus(po, val),
                                      ),
                                    ],
                                  ),
                                ],
                              ),

                              const Divider(height: 20),

                              // Tombol Aksi: Salin Link & Lihat Rekap
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      icon: const Icon(Icons.share_outlined, size: 16),
                                      label: const Text('Salin Link PO', style: TextStyle(fontSize: 13)),
                                      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                                      onPressed: () => _sharePoLink(po),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      icon: const Icon(Icons.analytics_outlined, size: 16),
                                      label: const Text('Lihat Rekap', style: TextStyle(fontSize: 13)),
                                      style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
                                      onPressed: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => PoRecapScreen(poSession: po),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
