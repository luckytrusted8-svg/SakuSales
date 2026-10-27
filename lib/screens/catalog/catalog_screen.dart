import 'package:flutter/material.dart';
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

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
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

  // ================= 1. PRODUK & UKURAN =================
  void _showAddOrEditProduct([Product? p]) {
    final nameCtrl = TextEditingController(text: p?.name ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(p == null ? 'Tambah Produk' : 'Ubah Nama Produk'),
        content: TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(hintText: 'Contoh: Keju Aroma'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
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
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  void _showAddOrEditSize(String productId, [SizeItem? s]) {
    final nameCtrl = TextEditingController(text: s?.name ?? 'Isi 8 + 1 glaze');
    final piecesCtrl = TextEditingController(text: (s?.pieces ?? 8).toString());
    final priceCtrl = TextEditingController(text: (s?.price ?? 11000).toString());
    final incGlazeCtrl = TextEditingController(text: (s?.includedGlaze ?? 1).toString());
    final extraGlazeCtrl = TextEditingController(text: (s?.extraGlazePrice ?? 2000).toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s == null ? 'Tambah Ukuran' : 'Ubah Ukuran'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Nama Ukuran (contoh: Isi 8 + 1 glaze)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: piecesCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Jumlah Isi (pcs)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: priceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Harga Dasar (Rupiah)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: incGlazeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Glaze Termasuk di Harga'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: extraGlazeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Biaya Tambahan per Glaze'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
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
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  // ================= 2. GLAZES =================
  void _showAddOrEditGlaze([Glaze? g]) {
    final nameCtrl = TextEditingController(text: g?.name ?? '');
    final hppCtrl = TextEditingController(text: (g?.hpp ?? 0).toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(g == null ? 'Tambah Pilihan Glaze' : 'Ubah Glaze'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Nama Glaze (contoh: Greentea, Coklat)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: hppCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'HPP Bahan per Glaze (Rupiah)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
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
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  // ================= 3. TOPPINGS =================
  void _showAddOrEditTopping([Topping? t]) {
    final nameCtrl = TextEditingController(text: t?.name ?? '');
    final extraCtrl = TextEditingController(text: (t?.extraPrice ?? 2000).toString());
    final hppCtrl = TextEditingController(text: (t?.hpp ?? 0).toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t == null ? 'Tambah Topping' : 'Ubah Topping'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Nama Topping (contoh: Oreo, Keju)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: extraCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Harga Tambahan Jual (Rupiah)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: hppCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'HPP Bahan Topping (Rupiah)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
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
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  // ================= 4. BAHAN BAKU =================
  void _showAddOrEditIngredient([Ingredient? ing]) {
    final nameCtrl = TextEditingController(text: ing?.name ?? '');
    final unitCtrl = TextEditingController(text: ing?.unit ?? 'gram');
    final costCtrl = TextEditingController(text: (ing?.costPerUnit ?? 0).toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ing == null ? 'Tambah Bahan Baku' : 'Ubah Bahan Baku'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Nama Bahan (contoh: Kulit Lumpia, Keju Cheddar)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: unitCtrl,
              decoration: const InputDecoration(labelText: 'Satuan (gram, ml, pcs)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: costCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Harga per Satuan (Rupiah)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
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
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Katalog & Resep HPP'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: AppColors.olive,
          labelColor: AppColors.olive,
          unselectedLabelColor: Theme.of(context).textTheme.bodySmall?.color,
          tabs: const [
            Tab(text: 'Produk & Ukuran'),
            Tab(text: 'Glaze / Rasa'),
            Tab(text: 'Topping'),
            Tab(text: 'Bahan Baku'),
          ],
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
    );
  }

  // ---------------- TAB 1: PRODUK & UKURAN ----------------
  Widget _buildProductsTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah Produk Baru'),
              onPressed: () => _showAddOrEditProduct(),
            ),
            const SizedBox(height: 16),

            if (_products.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Text('Belum ada produk. Klik tombol di atas untuk menambah.'),
                ),
              )
            else
              ..._products.map((p) {
                final prodSizes = _sizes.where((s) => s.productId == p.id).toList();

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              p.name,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            Row(
                              children: [
                                Switch(
                                  value: p.active,
                                  activeThumbColor: AppColors.olive,
                                  onChanged: (val) async {
                                    await SupabaseService.instance.updateProduct(p.id, p.name, val);
                                    _loadAll();
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 18),
                                  onPressed: () => _showAddOrEditProduct(p),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.pink),
                                  onPressed: () async {
                                    await SupabaseService.instance.deleteProduct(p.id);
                                    _loadAll();
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Divider(height: 16),

                        // Sizes list
                        Text(
                          'Pilihan Ukuran:',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context).textTheme.bodySmall?.color,
                          ),
                        ),
                        const SizedBox(height: 6),

                        if (prodSizes.isEmpty)
                          const Text('Belum ada ukuran pada produk ini.', style: TextStyle(fontSize: 12))
                        else
                          ...prodSizes.map((s) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: Theme.of(context).scaffoldBackgroundColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${s.name} (${s.pieces} pcs)',
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                        ),
                                        Text(
                                          '${CurrencyFormatter.format(s.price)} · Termasuk ${s.includedGlaze} glaze (ekstra ${CurrencyFormatter.format(s.extraGlazePrice)})',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Theme.of(context).textTheme.bodySmall?.color,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Shortcut ke Resep HPP
                                  TextButton.icon(
                                    icon: const Icon(Icons.menu_book_outlined, size: 16),
                                    label: const Text('Resep HPP', style: TextStyle(fontSize: 11)),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => RecipesScreen(sizeItem: s, productName: p.name),
                                        ),
                                      );
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 16),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _showAddOrEditSize(p.id, s),
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.pink),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () async {
                                      await SupabaseService.instance.deleteSize(s.id);
                                      _loadAll();
                                    },
                                  ),
                                ],
                              ),
                            );
                          }),

                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Tambah Ukuran untuk Produk Ini', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(36)),
                          onPressed: () => _showAddOrEditSize(p.id),
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  // ---------------- TAB 2: GLAZES ----------------
  Widget _buildGlazesTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah Pilihan Glaze / Rasa'),
              onPressed: () => _showAddOrEditGlaze(),
            ),
            const SizedBox(height: 16),

            if (_glazes.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Text('Belum ada glaze. Tambahkan Greentea, Tiramisu, Coklat, Taro, dll.'),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _glazes.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, idx) {
                  final g = _glazes[idx];
                  return Card(
                    child: ListTile(
                      title: Text(g.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text('HPP Biaya: ${CurrencyFormatter.format(g.hpp)} / glaze'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Switch(
                            value: g.active,
                            activeThumbColor: AppColors.olive,
                            onChanged: (val) async {
                              await SupabaseService.instance.updateGlaze(g.id, g.name, g.hpp, val);
                              _loadAll();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => _showAddOrEditGlaze(g),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.pink),
                            onPressed: () async {
                              await SupabaseService.instance.deleteGlaze(g.id);
                              _loadAll();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ---------------- TAB 3: TOPPINGS ----------------
  Widget _buildToppingsTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah Pilihan Topping'),
              onPressed: () => _showAddOrEditTopping(),
            ),
            const SizedBox(height: 16),

            if (_toppings.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Text('Belum ada topping. Tambahkan Oreo, Keju, Sprinkle, dll.'),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _toppings.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, idx) {
                  final t = _toppings[idx];
                  return Card(
                    child: ListTile(
                      title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                        'Harga Tambah: +${CurrencyFormatter.format(t.extraPrice)} · HPP: ${CurrencyFormatter.format(t.hpp)}',
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Switch(
                            value: t.active,
                            activeThumbColor: AppColors.olive,
                            onChanged: (val) async {
                              await SupabaseService.instance.updateTopping(t.id, t.name, t.extraPrice, t.hpp, val);
                              _loadAll();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => _showAddOrEditTopping(t),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.pink),
                            onPressed: () async {
                              await SupabaseService.instance.deleteTopping(t.id);
                              _loadAll();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ---------------- TAB 4: BAHAN BAKU ----------------
  Widget _buildIngredientsTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tambah Bahan Baku Baru'),
              onPressed: () => _showAddOrEditIngredient(),
            ),
            const SizedBox(height: 16),

            if (_ingredients.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Text('Belum ada bahan baku. Tambahkan Kulit Lumpia, Keju, Minyak, dll.'),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _ingredients.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, idx) {
                  final ing = _ingredients[idx];
                  return Card(
                    child: ListTile(
                      title: Text(ing.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                        'Satuan: ${ing.unit} · Biaya: ${CurrencyFormatter.format(ing.costPerUnit.round())} / ${ing.unit}',
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            onPressed: () => _showAddOrEditIngredient(ing),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.pink),
                            onPressed: () async {
                              await SupabaseService.instance.deleteIngredient(ing.id);
                              _loadAll();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
