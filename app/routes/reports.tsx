import { useEffect, useState } from 'react';
import type { Route } from './+types/reports';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Select } from '~/components/ui/Select';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';
import { getCurrentMonth, getMonthName, getMonthRange } from '~/lib/date';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Laporan - Transaksi Kuota' },
  ];
}

interface MonthlyReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalReceived: number;
  totalDebt: number;
  totalTransactions: number;
  uniqueCustomers: number;
}

interface ProductSales {
  product_name: string;
  total_sold: number;
  total_revenue: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MonthlyReport>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalReceived: 0,
    totalDebt: 0,
    totalTransactions: 0,
    uniqueCustomers: 0,
  });
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  
  const currentDate = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(currentDate.year.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month.toString());

  useEffect(() => {
    if (user) {
      loadReport();
    }
  }, [user, selectedYear, selectedMonth]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const { start, end } = getMonthRange(year, month);

      // Load transactions for the month
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('selling_price, cost_price, profit_amount, paid_amount, remaining_amount, customer_id, product_name')
        .eq('user_id', user?.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .neq('payment_status', 'cancelled');

      if (error) throw error;

      // Calculate report
      const report: MonthlyReport = {
        totalRevenue: transactions?.reduce((sum, t) => sum + t.selling_price, 0) || 0,
        totalCost: transactions?.reduce((sum, t) => sum + t.cost_price, 0) || 0,
        totalProfit: transactions?.reduce((sum, t) => sum + t.profit_amount, 0) || 0,
        totalReceived: transactions?.reduce((sum, t) => sum + t.paid_amount, 0) || 0,
        totalDebt: transactions?.reduce((sum, t) => sum + t.remaining_amount, 0) || 0,
        totalTransactions: transactions?.length || 0,
        uniqueCustomers: new Set(transactions?.map(t => t.customer_id)).size,
      };

      setReport(report);

      // Calculate top products
      const productSales = new Map<string, ProductSales>();
      transactions?.forEach(t => {
        const existing = productSales.get(t.product_name);
        if (existing) {
          existing.total_sold += 1;
          existing.total_revenue += t.selling_price;
        } else {
          productSales.set(t.product_name, {
            product_name: t.product_name,
            total_sold: 1,
            total_revenue: t.selling_price,
          });
        }
      });

      const sortedProducts = Array.from(productSales.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: getMonthName(i + 1),
  }));

  if (loading) {
    return (
      <AppShell>
        <Header title="Laporan" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Laporan Bulanan" />

      <div className="p-4 space-y-4">
        {/* Month Selector */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Bulan"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={months}
              />
              <Select
                label="Tahun"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={years}
              />
            </div>
          </CardBody>
        </Card>

        {/* Financial Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Ringkasan Keuangan
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Omzet</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(report.totalRevenue)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Modal</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatCurrency(report.totalCost)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Laba Kotor</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {formatCurrency(report.totalProfit)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Uang Diterima</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {formatCurrency(report.totalReceived)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Sisa Hutang</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {formatCurrency(report.totalDebt)}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-gray-600">Jumlah Transaksi</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {report.totalTransactions}
                </p>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Customer Stats */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pelanggan Aktif</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {report.uniqueCustomers}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Top Products */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Produk Terlaris
          </h2>
          {topProducts.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-center text-gray-500 py-4">
                  Belum ada data penjualan
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <Card key={product.product_name}>
                  <CardBody>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {product.product_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {product.total_sold} transaksi
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(product.total_revenue)}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
