import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/product.dart';
import '../../models/size_item.dart';
import '../../models/glaze.dart';
import '../../models/topping.dart';
import '../../models/ingredient.dart';
import '../recipes/recipes_screen.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<Product> _products = [];
  List<SizeItem> _sizes = [];
  List<Glaze> _glazes = [];
  List<Topping> _toppings = [];
  List<Ingredient> _ingredients = [];
  final Set<String> _expandedProductIds = {};

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _isLoading = true);
    try {
      final res = await Future.wait([
        SupabaseService.instance.getProducts(),
        SupabaseService.instance.getSizes(),
        SupabaseService.instance.getGlazes(),
        SupabaseService.instance.getToppings(),
        SupabaseService.instance.getIngredients(),
      ]);

      if (mounted) {
        setState(() {
          _products = res[0] as List<Product>;
          _sizes = res[1] as List<SizeItem>;
          _glazes = res[2] as List<Glaze>;
          _toppings = res[3] as List<Topping>;
          _ingredients = res[4] as List<Ingredient>;
          if (_expandedProductIds.isEmpty && _products.isNotEmpty) {
            _expandedProductIds.add(_products.first.id);
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat katalog: ${e.toString()}')),
        );
      }
    }
  }

  // ================= KONFIRMASI HAPUS =================
  Future<void> _confirmDeleteProduct(Product p) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Produk?'),
        content: Text('Apakah Anda yakin ingin menghapus produk "${p.name}"?\nSeluruh pilihan ukuran dan resep terkait akan ikut terhapus.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await SupabaseService.instance.deleteProduct(p.id);
        _loadAll();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal menghapus produk: $e')));
        }
      }
    }
  }

  Future<void> _confirmDeleteSize(SizeItem s) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Ukuran Kemasan?'),
        content: Text('Apakah Anda yakin ingin menghapus ukuran "${s.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await SupabaseService.instance.deleteSize(s.id);
        _loadAll();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal menghapus ukuran: $e')));
        }
      }
    }
  }

  Future<void> _confirmDeleteGlaze(Glaze g) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Glaze / Rasa?'),
        content: Text('Apakah Anda yakin ingin menghapus glaze "${g.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await SupabaseService.instance.deleteGlaze(g.id);
        _loadAll();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal menghapus glaze: $e')));
        }
      }
    }
  }

  Future<void> _confirmDeleteTopping(Topping t) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Topping?'),
        content: Text('Apakah Anda yakin ingin menghapus topping "${t.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await SupabaseService.instance.deleteTopping(t.id);
        _loadAll();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal menghapus topping: $e')));
        }
      }
    }
  }

  Future<void> _confirmDeleteIngredient(Ingredient ing) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Bahan Baku?'),
        content: Text('Apakah Anda yakin ingin menghapus bahan baku "${ing.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await SupabaseService.instance.deleteIngredient(ing.id);
        _loadAll();
      } catch (e) {
        if (mounted) {
          final errStr = e.toString().toLowerCase();
          String userMsg = 'Gagal menghapus bahan: $e';
          if (errStr.contains('foreign key') || errStr.contains('recipes') || errStr.contains('restrict')) {
            userMsg = 'Bahan baku "${ing.name}" tidak dapat dihapus karena masih digunakan di dalam resep produk. Hapus bahan ini dari resep terlebih dahulu.';
          }
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppColors.danger,
              duration: const Duration(seconds: 4),
              content: Text(userMsg),
            ),
          );
        }
      }
    }
  }

  // ================= 1. PRODUK & UKURAN =================
  void _showAddOrEditProduct([Product? p]) {
    final nameCtrl = TextEditingController(text: p?.name ?? '');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final handleColor = isDark ? const Color(0xFF43495B) : const Color(0xFFD0D5DD);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: handleColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        p == null ? 'Tambah Produk' : 'Ubah Nama Produk',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 22),
                        tooltip: 'Batal',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameCtrl,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nama Produk',
                      hintText: 'Contoh: Keju Aroma',
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      if (name.isEmpty) return;
                      if (p == null) {
                        await SupabaseService.instance.createProduct(name);
                      } else {
                        await SupabaseService.instance.updateProduct(p.id, name, p.active);
                      }
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadAll();
                    },
                    child: const Text(
                      'Simpan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showAddOrEditSize(String productId, [SizeItem? s]) {
    final nameCtrl = TextEditingController(text: s?.name ?? 'Isi 8 + 1 glaze');
    final piecesCtrl = TextEditingController(text: (s?.pieces ?? 8).toString());
    final priceCtrl = TextEditingController(text: (s?.price ?? 11000).toString());
    final incGlazeCtrl = TextEditingController(text: (s?.includedGlaze ?? 1).toString());
    final extraGlazeCtrl = TextEditingController(text: (s?.extraGlazePrice ?? 2000).toString());
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final handleColor = isDark ? const Color(0xFF43495B) : const Color(0xFFD0D5DD);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: handleColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        s == null ? 'Tambah Ukuran' : 'Ubah Ukuran',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 22),
                        tooltip: 'Batal',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Nama Ukuran (contoh: Isi 8 + 1 glaze)'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: piecesCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah Isi (pcs)'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: priceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Harga Dasar (Rupiah)'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: incGlazeCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Glaze Termasuk di Harga'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: extraGlazeCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Biaya Tambahan per Glaze (Rupiah)'),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      final pieces = int.tryParse(piecesCtrl.text) ?? 1;
                      final price = int.tryParse(priceCtrl.text) ?? 0;
                      final incGlaze = int.tryParse(incGlazeCtrl.text) ?? 1;
                      final extraGlaze = int.tryParse(extraGlazeCtrl.text) ?? 2000;

                      if (name.isEmpty) return;

                      final item = SizeItem(
                        id: s?.id ?? '',
                        productId: productId,
                        name: name,
                        pieces: pieces,
                        price: price,
                        includedGlaze: incGlaze,
                        extraGlazePrice: extraGlaze,
                        active: s?.active ?? true,
                      );

                      if (s == null) {
                        await SupabaseService.instance.createSize(item);
                      } else {
                        await SupabaseService.instance.updateSize(item);
                      }

                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadAll();
                    },
                    child: const Text(
                      'Simpan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ================= 2. GLAZES =================
  void _showAddOrEditGlaze([Glaze? g]) {
    final nameCtrl = TextEditingController(text: g?.name ?? '');
    final hppCtrl = TextEditingController(text: (g?.hpp ?? 0).toString());
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final handleColor = isDark ? const Color(0xFF43495B) : const Color(0xFFD0D5DD);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: handleColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        g == null ? 'Tambah Pilihan Glaze' : 'Ubah Glaze',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 22),
                        tooltip: 'Batal',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameCtrl,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nama Glaze (contoh: Greentea, Coklat)',
                      hintText: 'Contoh: Greentea',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: hppCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'HPP Bahan per Glaze (Rupiah)',
                      hintText: '0',
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      final hpp = int.tryParse(hppCtrl.text) ?? 0;
                      if (name.isEmpty) return;

                      if (g == null) {
                        await SupabaseService.instance.createGlaze(name, hpp);
                      } else {
                        await SupabaseService.instance.updateGlaze(g.id, name, hpp, g.active);
                      }
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadAll();
                    },
                    child: const Text(
                      'Simpan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ================= 3. TOPPINGS =================
  void _showAddOrEditTopping([Topping? t]) {
    final nameCtrl = TextEditingController(text: t?.name ?? '');
    final extraCtrl = TextEditingController(text: (t?.extraPrice ?? 2000).toString());
    final hppCtrl = TextEditingController(text: (t?.hpp ?? 0).toString());
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final handleColor = isDark ? const Color(0xFF43495B) : const Color(0xFFD0D5DD);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: handleColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        t == null ? 'Tambah Topping' : 'Ubah Topping',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 22),
                        tooltip: 'Batal',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameCtrl,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nama Topping (contoh: Oreo, Keju)',
                      hintText: 'Contoh: Oreo',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: extraCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Harga Tambahan Jual (Rupiah)',
                      hintText: '2000',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: hppCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'HPP Bahan Topping (Rupiah)',
                      hintText: '0',
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      final extra = int.tryParse(extraCtrl.text) ?? 2000;
                      final hpp = int.tryParse(hppCtrl.text) ?? 0;
                      if (name.isEmpty) return;

                      if (t == null) {
                        await SupabaseService.instance.createTopping(name, extra, hpp);
                      } else {
                        await SupabaseService.instance.updateTopping(t.id, name, extra, hpp, t.active);
                      }
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadAll();
                    },
                    child: const Text(
                      'Simpan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ================= 4. BAHAN BAKU =================
  void _showAddOrEditIngredient([Ingredient? ing]) {
    final nameCtrl = TextEditingController(text: ing?.name ?? '');
    final unitCtrl = TextEditingController(text: ing?.unit ?? 'gram');
    final costCtrl = TextEditingController(text: (ing?.costPerUnit ?? 0).toString());
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final handleColor = isDark ? const Color(0xFF43495B) : const Color(0xFFD0D5DD);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: handleColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ing == null ? 'Tambah Bahan Baku' : 'Ubah Bahan Baku',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 22),
                        tooltip: 'Batal',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameCtrl,
                    autofocus: true,
                    decoration: const InputDecoration(
                      labelText: 'Nama Bahan',
                      hintText: 'Contoh: Kulit Lumpia, Keju Cheddar',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: unitCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Satuan (gram, ml, pcs)',
                      hintText: 'Contoh: gram, ml, pcs',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: costCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Harga per Satuan (Rupiah)',
                      hintText: '0.0',
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      final unit = unitCtrl.text.trim();
                      final cost = double.tryParse(costCtrl.text) ?? 0.0;
                      if (name.isEmpty || unit.isEmpty) return;

                      if (ing == null) {
                        await SupabaseService.instance.createIngredient(name, unit, cost);
                      } else {
                        await SupabaseService.instance.updateIngredient(ing.id, name, unit, cost);
                      }
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadAll();
                    },
                    child: const Text(
                      'Simpan',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget? _buildFab() {
    if (_isLoading) return null;

    final index = _tabController.index;
    VoidCallback? onPressed;
    String tooltip = '';

    if (index == 0 && _products.isNotEmpty) {
      onPressed = () => _showAddOrEditProduct();
      tooltip = 'Tambah Produk';
    } else if (index == 1 && _glazes.isNotEmpty) {
      onPressed = () => _showAddOrEditGlaze();
      tooltip = 'Tambah Glaze';
    } else if (index == 2 && _toppings.isNotEmpty) {
      onPressed = () => _showAddOrEditTopping();
      tooltip = 'Tambah Topping';
    } else if (index == 3 && _ingredients.isNotEmpty) {
      onPressed = () => _showAddOrEditIngredient();
      tooltip = 'Tambah Bahan Baku';
    }

    if (onPressed == null) return null;

    return FloatingActionButton(
      heroTag: 'catalog_fab_$index',
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 4,
      shape: const CircleBorder(),
      onPressed: onPressed,
      tooltip: tooltip,
      child: const Icon(Icons.add, size: 28),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String description,
    required String buttonLabel,
    required VoidCallback onButtonPressed,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, size: 36, color: AppColors.primary),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      title,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.65),
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 20),
                      label: Text(
                        buttonLabel,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      onPressed: onButtonPressed,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Katalog & Resep HPP'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(54),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Container(
              height: 44,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2028),
                borderRadius: BorderRadius.circular(22),
              ),
              child: TabBar(
                controller: _tabController,
                isScrollable: false,
                dividerColor: Colors.transparent,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(18),
                ),
                labelColor: Colors.white,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
                unselectedLabelColor: Colors.white.withValues(alpha: 0.55),
                unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
                tabs: const [
                  Tab(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('Produk & Ukuran'),
                    ),
                  ),
                  Tab(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('Glaze / Rasa'),
                    ),
                  ),
                  Tab(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('Topping'),
                    ),
                  ),
                  Tab(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('Bahan Baku'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildProductsTab(),
                _buildGlazesTab(),
                _buildToppingsTab(),
                _buildIngredientsTab(),
              ],
            ),
      floatingActionButton: _buildFab(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }

  // ---------------- TAB 1: PRODUK & UKURAN (ACCORDION / EXPANDABLE) ----------------
  Widget _buildProductsTab() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: _products.isEmpty
          ? _buildEmptyState(
              icon: Icons.inventory_2_outlined,
              title: 'Belum Ada Produk',
              description: 'Tambahkan produk utama seperti Keju Aroma beserta variasi ukurannya.',
              buttonLabel: 'Tambah Produk Baru',
              onButtonPressed: () => _showAddOrEditProduct(),
            )
          : SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ..._products.map((p) {
                    final prodSizes = _sizes.where((s) => s.productId == p.id).toList();
                    final isExpanded = _expandedProductIds.contains(p.id);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Header Kartu Produk (Accordion Trigger)
                          InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () {
                              setState(() {
                                if (isExpanded) {
                                  _expandedProductIds.remove(p.id);
                                } else {
                                  _expandedProductIds.add(p.id);
                                }
                              });
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  // Nama Produk & Badge Ukuran
                                  Expanded(
                                    child: Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            p.name,
                                            style: GoogleFonts.nunito(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w800,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isDark ? const Color(0xFF2A2D3A) : const Color(0xFFE8ECEF),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            '${prodSizes.length} Ukuran',
                                            style: GoogleFonts.nunito(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: textMuted,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Kontrol Atas (Toggle Switch Proporsional, Aksi, & Chevron)
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // Toggle Switch Proporsional (Kecil & Rapi)
                                      Transform.scale(
                                        scale: 0.75,
                                        child: Switch(
                                          value: p.active,
                                          activeThumbColor: Colors.white,
                                          activeTrackColor: AppColors.primary,
                                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          onChanged: (val) async {
                                            await SupabaseService.instance.updateProduct(p.id, p.name, val);
                                            _loadAll();
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined, size: 18),
                                        color: textMuted,
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                                        tooltip: 'Ubah Produk',
                                        onPressed: () => _showAddOrEditProduct(p),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                        color: AppColors.danger,
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(minWidth: 30, minHeight: 30),
                                        tooltip: 'Hapus Produk',
                                        onPressed: () => _confirmDeleteProduct(p),
                                      ),
                                      const SizedBox(width: 2),
                                      Icon(
                                        isExpanded
                                            ? Icons.keyboard_arrow_up_rounded
                                            : Icons.keyboard_arrow_down_rounded,
                                        color: textMuted,
                                        size: 22,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Konten Pilihan Ukuran (Hanya Terbuka Saat Accordion Aktif)
                          if (isExpanded) ...[
                            Divider(height: 1, color: cardBorder),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (prodSizes.isEmpty)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      child: Text(
                                        'Belum ada variasi ukuran pada produk ini.',
                                        style: GoogleFonts.nunito(fontSize: 12, color: textMuted),
                                      ),
                                    )
                                  else
                                    ...prodSizes.map((s) {
                                      return Container(
                                        margin: const EdgeInsets.only(bottom: 8),
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF14151A) : const Color(0xFFF8F9FA),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: cardBorder, width: 0.8),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            // Baris Atas Ukuran: Nama & Tombol Resep HPP
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    '${s.name} (${s.pieces} pcs)',
                                                    style: GoogleFonts.nunito(
                                                      fontWeight: FontWeight.w800,
                                                      fontSize: 14,
                                                    ),
                                                  ),
                                                ),
                                                InkWell(
                                                  borderRadius: BorderRadius.circular(6),
                                                  onTap: () {
                                                    Navigator.of(context).push(
                                                      MaterialPageRoute(
                                                        builder: (_) => RecipesScreen(
                                                          sizeItem: s,
                                                          productName: p.name,
                                                        ),
                                                      ),
                                                    );
                                                  },
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.primary.withValues(alpha: 0.12),
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        const Icon(
                                                          Icons.menu_book_rounded,
                                                          size: 14,
                                                          color: AppColors.primary,
                                                        ),
                                                        const SizedBox(width: 4),
                                                        Text(
                                                          'Resep HPP',
                                                          style: GoogleFonts.nunito(
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.w700,
                                                            color: AppColors.primary,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),

                                            // Baris Bawah Ukuran: Harga & Aksi Edit/Hapus di Kanan Bawah
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(
                                                        CurrencyFormatter.format(s.price),
                                                        style: GoogleFonts.fredoka(
                                                          fontWeight: FontWeight.w700,
                                                          fontSize: 14,
                                                          color: AppColors.primary,
                                                        ),
                                                      ),
                                                      const SizedBox(height: 2),
                                                      Text(
                                                        'Termasuk ${s.includedGlaze} glaze (ekstra ${CurrencyFormatter.format(s.extraGlazePrice)})',
                                                        style: GoogleFonts.nunito(
                                                          fontSize: 11,
                                                          color: textMuted,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    IconButton(
                                                      icon: const Icon(Icons.edit_outlined, size: 16),
                                                      color: textMuted,
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                                      tooltip: 'Ubah Ukuran',
                                                      onPressed: () => _showAddOrEditSize(p.id, s),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    IconButton(
                                                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                                                      color: AppColors.danger,
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                                      tooltip: 'Hapus Ukuran',
                                                      onPressed: () => _confirmDeleteSize(s),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      );
                                    }),

                                  const SizedBox(height: 8),
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.add_rounded, size: 16),
                                    label: Text(
                                      '+ Tambah Ukuran untuk ${p.name}',
                                      style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w700),
                                    ),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                                      minimumSize: const Size.fromHeight(38),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    onPressed: () => _showAddOrEditSize(p.id),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }

  // ---------------- TAB 2: GLAZES (CLEAN CARD RESTRUCTURED) ----------------
  Widget _buildGlazesTab() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: _glazes.isEmpty
          ? _buildEmptyState(
              icon: Icons.palette_outlined,
              title: 'Belum Ada Glaze / Rasa',
              description: 'Tambahkan varian seperti Greentea, Tiramisu, Coklat, Taro, dll.',
              buttonLabel: 'Tambah Glaze / Rasa Baru',
              onButtonPressed: () => _showAddOrEditGlaze(),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
              itemCount: _glazes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final g = _glazes[idx];

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardBorder, width: 1.0),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Baris Atas: Nama Glaze & Toggle Switch Proporsional
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              g.name,
                              style: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          Transform.scale(
                            scale: 0.75,
                            child: Switch(
                              value: g.active,
                              activeThumbColor: Colors.white,
                              activeTrackColor: AppColors.primary,
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              onChanged: (val) async {
                                await SupabaseService.instance.updateGlaze(g.id, g.name, g.hpp, val);
                                _loadAll();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Baris Bawah: Harga HPP & Ikon Aksi di Pojok Kanan Bawah
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'HPP: ${CurrencyFormatter.format(g.hpp)} / glaze',
                                style: GoogleFonts.fredoka(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Biaya bahan baku per glaze',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  color: textMuted,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                color: textMuted,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Ubah Glaze',
                                onPressed: () => _showAddOrEditGlaze(g),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                color: AppColors.danger,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Hapus Glaze',
                                onPressed: () => _confirmDeleteGlaze(g),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  // ---------------- TAB 3: TOPPINGS (CLEAN CARD RESTRUCTURED) ----------------
  Widget _buildToppingsTab() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: _toppings.isEmpty
          ? _buildEmptyState(
              icon: Icons.cookie_outlined,
              title: 'Belum Ada Topping',
              description: 'Tambahkan topping tambahan seperti Oreo, Keju, Sprinkle, dll.',
              buttonLabel: 'Tambah Topping Baru',
              onButtonPressed: () => _showAddOrEditTopping(),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
              itemCount: _toppings.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final t = _toppings[idx];

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardBorder, width: 1.0),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Baris Atas: Nama Topping & Toggle Switch Proporsional
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              t.name,
                              style: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          Transform.scale(
                            scale: 0.75,
                            child: Switch(
                              value: t.active,
                              activeThumbColor: Colors.white,
                              activeTrackColor: AppColors.primary,
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              onChanged: (val) async {
                                await SupabaseService.instance.updateTopping(
                                  t.id,
                                  t.name,
                                  t.extraPrice,
                                  t.hpp,
                                  val,
                                );
                                _loadAll();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Baris Bawah: Harga Tambah & Ikon Aksi di Pojok Kanan Bawah
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '+${CurrencyFormatter.format(t.extraPrice)}',
                                style: GoogleFonts.fredoka(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'HPP Bahan: ${CurrencyFormatter.format(t.hpp)}',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  color: textMuted,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                color: textMuted,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Ubah Topping',
                                onPressed: () => _showAddOrEditTopping(t),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                color: AppColors.danger,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Hapus Topping',
                                onPressed: () => _confirmDeleteTopping(t),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  // ---------------- TAB 4: BAHAN BAKU (CLEAN CARD RESTRUCTURED) ----------------
  Widget _buildIngredientsTab() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2028) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2F3340) : const Color(0xFFE8ECEF);
    final textMuted = isDark ? const Color(0xFFA0AEC0) : const Color(0xFF5A6275);

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: _ingredients.isEmpty
          ? _buildEmptyState(
              icon: Icons.egg_outlined,
              title: 'Belum Ada Bahan Baku',
              description: 'Belum ada bahan baku. Tambahkan Kulit Lumpia, Keju, Minyak, dll.',
              buttonLabel: 'Tambah Bahan Baku Baru',
              onButtonPressed: () => _showAddOrEditIngredient(),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
              itemCount: _ingredients.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final ing = _ingredients[idx];

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardBorder, width: 1.0),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Baris Atas: Nama Bahan Baku & Badge Satuan
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              ing.name,
                              style: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2A2D3A) : const Color(0xFFE8ECEF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              ing.unit,
                              style: GoogleFonts.nunito(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Baris Bawah: Biaya per Satuan & Ikon Aksi di Pojok Kanan Bawah
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${CurrencyFormatter.format(ing.costPerUnit.round())} / ${ing.unit}',
                                style: GoogleFonts.fredoka(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Biaya modal per unit',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  color: textMuted,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                color: textMuted,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Ubah Bahan',
                                onPressed: () => _showAddOrEditIngredient(ing),
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                color: AppColors.danger,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                tooltip: 'Hapus Bahan',
                                onPressed: () => _confirmDeleteIngredient(ing),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
