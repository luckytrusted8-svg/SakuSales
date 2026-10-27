import 'package:flutter/material.dart';
import '../../core/services/supabase_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/currency_formatter.dart';
import '../../models/size_item.dart';
import '../../models/ingredient.dart';
import '../../models/recipe_line.dart';

class RecipesScreen extends StatefulWidget {
  final SizeItem sizeItem;
  final String productName;

  const RecipesScreen({
    super.key,
    required this.sizeItem,
    required this.productName,
  });

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends State<RecipesScreen> {
  List<RecipeLine> _recipeLines = [];
  List<Ingredient> _ingredients = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        SupabaseService.instance.getRecipesForSize(widget.sizeItem.id),
        SupabaseService.instance.getIngredients(),
      ]);

      if (mounted) {
        setState(() {
          _recipeLines = results[0] as List<RecipeLine>;
          _ingredients = results[1] as List<Ingredient>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat resep: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  void _showAddOrEditLineDialog([RecipeLine? existing]) {
    String? selectedIngredientId = existing?.ingredientId ?? (_ingredients.isNotEmpty ? _ingredients.first.id : null);
    final qtyController = TextEditingController(text: existing != null ? existing.qty.toString() : '1');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final currentIng = _ingredients.firstWhere(
            (ing) => ing.id == selectedIngredientId,
            orElse: () => _ingredients.first,
          );

          return AlertDialog(
            title: Text(existing == null ? 'Tambah Bahan Resep' : 'Ubah Takaran'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (existing == null) ...[
                  const Text('Pilih Bahan', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedIngredientId,
                    isExpanded: true,
                    items: _ingredients.map((ing) {
                      return DropdownMenuItem(
                        value: ing.id,
                        child: Text('${ing.name} (${ing.unit})'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setDialogState(() {
                        selectedIngredientId = val;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  'Jumlah Takaran (${currentIng.unit})',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: qtyController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    hintText: 'Contoh: 8 atau 0.5',
                    suffixText: currentIng.unit,
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(minimumSize: const Size(100, 44)),
                onPressed: () async {
                  final qty = double.tryParse(qtyController.text.trim()) ?? 0;
                  if (qty <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Takaran harus lebih dari 0.')),
                    );
                    return;
                  }

                  if (selectedIngredientId == null) return;

                  try {
                    await SupabaseService.instance.upsertRecipeLine(
                      widget.sizeItem.id,
                      selectedIngredientId!,
                      qty,
                    );
                    if (ctx.mounted) Navigator.pop(ctx);
                    _loadData();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Gagal menyimpan resep: ${e.toString()}')),
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

  Future<void> _deleteLine(RecipeLine line) async {
    try {
      await SupabaseService.instance.deleteRecipeLine(widget.sizeItem.id, line.ingredientId);
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal menghapus baris resep: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Hitung total HPP dasar dari resep
    double totalHppResep = 0;
    for (final line in _recipeLines) {
      final cost = line.ingredientCostPerUnit ?? 0;
      totalHppResep += line.qty * cost;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Resep: ${widget.sizeItem.name}'),
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
                  // Info Ukuran & HPP Dasar
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${widget.productName} · ${widget.sizeItem.name}',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Harga Jual: ${CurrencyFormatter.format(widget.sizeItem.price)}',
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.olive),
                          ),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total HPP Bahan Dasar:'),
                              Text(
                                CurrencyFormatter.format(totalHppResep.round()),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Komposisi Bahan',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Tambah Bahan', style: TextStyle(fontSize: 13)),
                        style: ElevatedButton.styleFrom(minimumSize: const Size(120, 38)),
                        onPressed: _ingredients.isEmpty
                            ? () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Tambahkan data bahan baku terlebih dahulu di tab Bahan.')),
                                );
                              }
                            : () => _showAddOrEditLineDialog(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_recipeLines.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Text(
                          'Belum ada bahan pada resep ukuran ini.\nKlik tombol di atas untuk menambah bahan.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14),
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _recipeLines.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final line = _recipeLines[index];
                        final costPerUnit = line.ingredientCostPerUnit ?? 0;
                        final subtotal = (line.qty * costPerUnit).round();

                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        line.ingredientName ?? 'Bahan',
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Takaran: ${line.qty} ${line.ingredientUnit ?? ""} · @${CurrencyFormatter.format(costPerUnit)}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Theme.of(context).textTheme.bodySmall?.color,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      CurrencyFormatter.format(subtotal),
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                    ),
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.edit_outlined, size: 18),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          onPressed: () => _showAddOrEditLineDialog(line),
                                        ),
                                        const SizedBox(width: 12),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.pink),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          onPressed: () => _deleteLine(line),
                                        ),
                                      ],
                                    ),
                                  ],
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
