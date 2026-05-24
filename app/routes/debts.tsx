import { useEffect, useState } from 'react';
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

export default function Debts() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);
  const [debtorCount, setDebtorCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadDebts();
    }
  }, [user]);

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
        .eq('user_id', user?.id)
        .in('payment_status', ['debt', 'partial'])
        .gt('remaining_amount', 0)
        .order('remaining_amount', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((t: any) => ({
        ...t,
        customer: Array.isArray(t.customer) ? t.customer[0] : t.customer,
      })) as unknown as DebtTransaction[];

      const transactions = formattedData;
      setTransactions(transactions);

      // Calculate totals
      const total = transactions.reduce((sum, t) => sum + t.remaining_amount, 0);
      setTotalDebt(total);

      // Count unique customers with debt
      const uniqueCustomers = new Set(transactions.map(t => t.customer.id));
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Hutang" />

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-sm text-gray-600">Total Hutang</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {formatCurrency(totalDebt)}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm text-gray-600">Pelanggan Berhutang</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {debtorCount}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Debts List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Daftar Hutang
          </h2>

          {transactions.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-900 font-medium">Tidak ada hutang!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Semua transaksi sudah lunas
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
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
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          <div className="text-right mb-2">
                            <p className="text-xs text-gray-500">Sisa</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(transaction.remaining_amount)}
                            </p>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(transaction.payment_status)}`}>
                            {getPaymentStatusLabel(transaction.payment_status)}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
