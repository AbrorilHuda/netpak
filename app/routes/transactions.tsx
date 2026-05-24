import { useEffect, useState } from 'react';
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Transaksi - Transaksi Kuota' },
  ];
}

interface Transaction {
  id: string;
  transaction_date: string;
  product_name: string;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'paid' | 'debt' | 'partial' | 'cancelled';
  customer: {
    name: string;
  };
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    filterTransactions();
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
        customer: Array.isArray(t.customer) ? t.customer[0] : t.customer,
      })) as unknown as Transaction[];

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.payment_status === statusFilter);
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(t =>
        t.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        t.product_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Transaksi" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'paid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Lunas
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'partial'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sebagian
          </button>
          <button
            onClick={() => setStatusFilter('debt')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'debt'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hutang
          </button>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500 py-8">
                {search ? 'Transaksi tidak ditemukan' : 'Belum ada transaksi'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <Link key={transaction.id} to={`/transactions/${transaction.id}`}>
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {transaction.customer.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {transaction.product_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateShort(transaction.transaction_date)}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div>
                            <span className="text-gray-500">Total: </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(transaction.selling_price)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Dibayar: </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(transaction.paid_amount)}
                            </span>
                          </div>
                          {transaction.remaining_amount > 0 && (
                            <div>
                              <span className="text-gray-500">Sisa: </span>
                              <span className="font-medium text-red-600">
                                {formatCurrency(transaction.remaining_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(transaction.payment_status)}`}>
                          {getPaymentStatusLabel(transaction.payment_status)}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
