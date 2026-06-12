import { useEffect, useState } from 'react';
import type { Route } from './+types/reports';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Select } from '~/components/ui/Select';
import { Button } from '~/components/ui/Button';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';
import { getCurrentMonth, getMonthName, getMonthRange } from '~/lib/date';
import type { MonthlyReport, ProductSales } from '~/types';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Laporan - Transaksi Kuota' },
  ];
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
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: number; revenue: number }[]>([]);
  
  const currentDate = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(currentDate.year.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month.toString());

  useEffect(() => {
    if (user) {
      loadReport();
      loadMonthlyTrend();
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

  const loadMonthlyTrend = async () => {
    const year = parseInt(selectedYear);
    const { start } = getMonthRange(year, 1);
    const { end } = getMonthRange(year, 12);

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, selling_price')
      .eq('user_id', user!.id)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .neq('payment_status', 'cancelled');

    if (error || !data) return;

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 }));
    data.forEach((t) => {
      const txMonth = new Date(t.transaction_date).getMonth() + 1;
      const entry = monthly.find((m) => m.month === txMonth);
      if (entry) entry.revenue += t.selling_price;
    });

    setMonthlyTrend(monthly);
  };

  const exportCSV = async () => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const { start, end } = getMonthRange(year, month);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('transaction_date, product_name, selling_price, cost_price, profit_amount, paid_amount, remaining_amount, payment_status, payment_method, notes, customer:customers(name, phone)')
      .eq('user_id', user!.id)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .neq('payment_status', 'cancelled')
      .order('transaction_date', { ascending: true });

    if (error || !transactions) return;

    const headers = ['Tanggal', 'Pelanggan', 'Produk', 'Harga Jual', 'Modal', 'Laba', 'Dibayar', 'Sisa', 'Status', 'Metode', 'Catatan'];
    const rows = transactions.map((t: any) => {
      const customer = Array.isArray(t.customer) ? t.customer[0] : t.customer;
      return [
        t.transaction_date,
        customer?.name || '',
        t.product_name,
        t.selling_price,
        t.cost_price,
        t.profit_amount,
        t.paid_amount,
        t.remaining_amount,
        t.payment_status,
        t.payment_method || '',
        (t.notes || '').replace(/,/g, ' '),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${getMonthName(month)}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Laporan Bulanan" />

      <div className="p-4 space-y-4">
        {/* Sales Trend Chart */}
        <Card className="border-slate-100 dark:border-slate-800/50 shadow-sm overflow-visible">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tren Penjualan</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{selectedYear}</p>
              </div>
              {(() => {
                const valid = monthlyTrend.filter((m) => m.revenue > 0);
                if (valid.length < 2) return null;
                const first = valid[0].revenue;
                const last = valid[valid.length - 1].revenue;
                const change = ((last - first) / first) * 100;
                const up = change >= 0;
                return (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                    up ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                    </svg>
                    {Math.abs(change).toFixed(0)}%
                  </span>
                );
              })()}
            </div>

            {monthlyTrend.every((m) => m.revenue === 0) ? (
              <div className="h-36 flex items-center justify-center">
                <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada data tren</p>
              </div>
            ) : (
              <svg viewBox="0 0 360 140" className="w-full" style={{ overflow: 'visible' }}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <line key={ratio} x1="28" y1={10 + 90 * ratio} x2="360" y2={10 + 90 * ratio}
                    stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="0.5" />
                ))}
                {(() => {
                  const maxRev = Math.max(...monthlyTrend.map((m) => m.revenue));
                  if (maxRev === 0) return null;
                  const barWidth = 20;
                  const chartH = 90;
                  const baseY = 100;
                  const startX = 32;
                  const gap = (328 - startX) / 11;
                  return monthlyTrend.map((m, i) => {
                    const barH = (m.revenue / maxRev) * chartH;
                    const x = startX + i * gap - barWidth / 2;
                    const y = baseY - barH;
                    const isSelected = m.month === parseInt(selectedMonth);
                    return (
                      <g key={m.month}
                        onClick={() => setSelectedMonth(m.month.toString())}
                        style={{ cursor: 'pointer' }}>
                        <rect x={x} y={Math.max(y, 10)} width={barWidth}
                          height={Math.max(barH, 2)} rx="4"
                          className={`transition-colors duration-200 ${isSelected ? 'fill-indigo-500' : 'fill-slate-300 dark:fill-slate-600 hover:fill-slate-400 dark:hover:fill-slate-500'}`} />
                        <text x={startX + i * gap} y="118" textAnchor="middle"
                          className={`text-[8px] font-semibold ${
                            isSelected ? 'fill-indigo-600 dark:fill-indigo-400' : 'fill-slate-400 dark:fill-slate-500'
                          }`}>
                          {getMonthName(m.month).slice(0, 3)}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            )}
            <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 mt-2">Ketuk bar untuk pilih bulan</p>
          </CardBody>
        </Card>

        {/* Month Selector */}
        <Card className="border-slate-100 dark:border-slate-800/50 shadow-xs">
          <CardBody className="p-5">
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

        {/* Premium Financial Summary */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3">
            Ringkasan Keuangan
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900 border-slate-100 dark:border-slate-800/50">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Omzet</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(report.totalRevenue)}</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100/30 dark:from-slate-900 dark:to-slate-900 border-slate-100 dark:border-slate-800/50">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Modal</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{formatCurrency(report.totalCost)}</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50/50 to-emerald-50/20 dark:from-emerald-950/20 dark:to-emerald-950/10 border-emerald-100/30 dark:border-emerald-900/30">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">Laba Kotor</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(report.totalProfit)}</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50/50 to-indigo-50/20 dark:from-indigo-950/20 dark:to-indigo-950/10 border-indigo-100/30 dark:border-indigo-900/30">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Uang Diterima</p>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(report.totalReceived)}</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-rose-50/50 to-rose-50/20 dark:from-rose-950/20 dark:to-rose-950/10 border-rose-100/30 dark:border-rose-900/30">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Sisa Hutang</p>
                <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(report.totalDebt)}</p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-slate-900 border-slate-100 dark:border-slate-800/50">
              <CardBody className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Transaksi</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{report.totalTransactions}</p>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Customer Stats */}
        <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Pelanggan Aktif</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{report.uniqueCustomers}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Bulan {getMonthName(parseInt(selectedMonth))} {selectedYear}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Export CSV */}
        <Button onClick={exportCSV} variant="secondary" size="sm" className="w-full">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </Button>

        {/* Top Products */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3">
            Produk Terlaris
          </h2>
          {topProducts.length === 0 ? (
            <Card className="border-slate-100 dark:border-slate-800/50">
              <CardBody className="py-8">
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">Belum ada data penjualan</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((product, index) => (
                <Card key={product.product_name} className="border-slate-100 dark:border-slate-800/50 shadow-xs">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{product.product_name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{product.total_sold} transaksi</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{formatCurrency(product.total_revenue)}</p>
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
