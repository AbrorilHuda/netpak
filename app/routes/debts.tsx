import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/debts';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';
import { formatDateShort } from '~/lib/date';
import { getPaymentStatusLabel, getPaymentStatusColor } from '~/lib/calculations';
import { normalizeJoin } from '~/lib/validators';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Hutang - Transaksi Kuota' },
  ];
}

interface DebtTransaction {
  id: string;
  transaction_date: string;
  product_name: string;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'debt' | 'partial';
  customer: {
    id: string;
    name: string;
  };
}

type AgeFilter = 'all' | 'week' | 'month' | 'overdue';

function getDebtAge(txDate: string): number {
  const now = new Date();
  const date = new Date(txDate);
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Debts() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);
  const [debtorCount, setDebtorCount] = useState(0);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');

  useEffect(() => {
    if (user) {
      loadDebts();
    }
  }, [user]);

  // Filter by debt age
  const filteredTransactions = useMemo(() => {
    if (ageFilter === 'all') return transactions;
    return transactions.filter(t => {
      const days = getDebtAge(t.transaction_date);
      if (ageFilter === 'week') return days <= 7;
      if (ageFilter === 'month') return days > 7 && days <= 30;
      if (ageFilter === 'overdue') return days > 30;
      return true;
    });
  }, [transactions, ageFilter]);

  const loadDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          product_name,
          selling_price,
          paid_amount,
          remaining_amount,
          payment_status,
          customer:customers(id, name)
        `)
        .eq('user_id', user!.id)
        .in('payment_status', ['debt', 'partial'])
        .gt('remaining_amount', 0)
        .order('remaining_amount', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((t: any) => ({
        ...t,
        customer: normalizeJoin(t.customer),
      })) as DebtTransaction[];

      setTransactions(formattedData);

      const total = formattedData.reduce((sum, t) => sum + t.remaining_amount, 0);
      setTotalDebt(total);

      const uniqueCustomers = new Set(formattedData.map(t => t.customer.id));
      setDebtorCount(uniqueCustomers.size);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Hutang" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Hutang" />

      <div className="p-4 space-y-4">
        {/* Premium Summary Cards */}
        <Card className="overflow-hidden bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 border-0 shadow-lg">
          <CardBody className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Total Hutang Aktif</p>
            <p className="text-3xl font-extrabold text-white mt-2 tracking-tight">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-white/70 mt-2">{debtorCount} pelanggan berhutang</p>
          </CardBody>
        </Card>

        {/* Age Filter Tabs */}
        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
          {([['all', 'Semua'], ['week', '≤ 7 Hari'], ['month', '8-30 Hari'], ['overdue', '> 30 Hari']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setAgeFilter(value)}
              className={`flex-1 py-2 text-[10px] font-bold text-center rounded-xl transition-all duration-200 ${
                ageFilter === value
                  ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs border border-slate-100 dark:border-slate-800'
                  : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Debts List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3">
            Daftar Hutang
          </h2>

          {filteredTransactions.length === 0 ? (
            <Card className="border-slate-100 dark:border-slate-800/50">
              <CardBody className="py-8">
                <div className="text-center">
                  <svg className="w-14 h-14 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-bold text-slate-700 dark:text-slate-200">Tidak ada hutang!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Semua transaksi sudah lunas
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((transaction) => {
                const days = getDebtAge(transaction.transaction_date);
                const ageLabel = days <= 7 ? `${days}h` : days <= 30 ? `${Math.floor(days / 7)}mgg` : `${Math.floor(days / 30)}bln`;
                const ageColor = days <= 7 ? 'bg-amber-50 text-amber-600' : days <= 30 ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600';

                return (
                  <Link key={transaction.id} to={`/transactions/${transaction.id}`}>
                    <Card className="hover:bg-slate-50/50 transition-colors duration-200 border-slate-100 dark:border-slate-800/50 shadow-xs active:scale-[0.99]">
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{transaction.customer.name}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${ageColor}`}>{ageLabel}</span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{transaction.product_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">{formatDateShort(transaction.transaction_date)}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                              <span className="text-slate-400 dark:text-slate-500">Total: <span className="text-slate-700 dark:text-slate-200">{formatCurrency(transaction.selling_price)}</span></span>
                              <span className="text-slate-400 dark:text-slate-500">Dibayar: <span className="text-emerald-600">{formatCurrency(transaction.paid_amount)}</span></span>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end shrink-0">
                            <div className="text-right mb-2">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sisa</p>
                              <p className="text-base font-extrabold text-rose-600 mt-0.5">{formatCurrency(transaction.remaining_amount)}</p>
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusColor(transaction.payment_status)}`}>
                              {getPaymentStatusLabel(transaction.payment_status)}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
