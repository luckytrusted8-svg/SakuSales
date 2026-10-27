import 'package:flutter_test/flutter_test.dart';
import 'package:sakusales/core/utils/currency_formatter.dart';

void main() {
  test('CurrencyFormatter formats rupiah correctly without em-dash', () {
    expect(CurrencyFormatter.format(11000), 'Rp 11.000');
    expect(CurrencyFormatter.format(2000), 'Rp 2.000');
    expect(CurrencyFormatter.format(0), 'Rp 0');
  });
}
