import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/transactions';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';
import { formatDateShort } from '~/lib/date';
import { getPaymentStatusLabel, getPaymentStatusColor } from '~/lib/calculations';
import { normalizeJoin } from '~/lib/validators';
import type { TransactionWithCustomer, PaymentStatus } from '~/types';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Transaksi - Transaksi Kuota' },
  ];
}


export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  // Derive filtered data during render (no useEffect needed)
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.payment_status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.customer.name.toLowerCase().includes(q) ||
        t.product_name.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [transactions, search, statusFilter]);

  const loadTransactions = async () => {
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
          customer:customers(name)
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map((t: any) => ({
        ...t,
        customer: normalizeJoin(t.customer),
      })) as TransactionWithCustomer[];

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <AppShell>
        <Header title="Transaksi" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header 
        title="Transaksi" 
        action={
          <Link to="/transactions/new">
            <Button size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Baru
            </Button>
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <Input
          type="search"
          placeholder="Cari transaksi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
          {([['all', 'Semua'], ['paid', 'Lunas'], ['partial', 'Sebagian'], ['debt', 'Hutang']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all duration-200 ${
                statusFilter === value
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs border border-slate-100 dark:border-slate-800'
                  : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card className="border-slate-100 dark:border-slate-800/50">
            <CardBody className="py-8">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                {search ? 'Transaksi tidak ditemukan' : 'Belum ada transaksi'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <Link key={transaction.id} to={`/transactions/${transaction.id}`}>
                <Card className="hover:bg-slate-50/50 transition-colors duration-200 border-slate-100 dark:border-slate-800/50 shadow-xs active:scale-[0.99] mb-2">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50/70 border border-indigo-100/30 flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0">
                          {transaction.customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {transaction.customer.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {transaction.product_name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                            {formatDateShort(transaction.transaction_date)}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold">
                            <span className="text-slate-400 dark:text-slate-500">Total: <span className="text-slate-700 dark:text-slate-200">{formatCurrency(transaction.selling_price)}</span></span>
                            <span className="text-slate-400 dark:text-slate-500">Bayar: <span className="text-emerald-600">{formatCurrency(transaction.paid_amount)}</span></span>
                            {transaction.remaining_amount > 0 && (
                              <span className="text-rose-500">Sisa: {formatCurrency(transaction.remaining_amount)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-3 flex flex-col items-end shrink-0">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusColor(transaction.payment_status)}`}>
                          {getPaymentStatusLabel(transaction.payment_status)}
                        </span>
                        <svg className="w-4 h-4 text-slate-300 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
