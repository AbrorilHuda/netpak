import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/dashboard';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';
import { formatDateShort, getCurrentMonth, getMonthName, getMonthRange } from '~/lib/date';
import { getPaymentStatusLabel, getPaymentStatusColor } from '~/lib/calculations';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Dashboard - Transaksi Kuota' },
    { name: 'description', content: 'Dashboard transaksi kuota premium' },
  ];
}

interface DashboardStats {
  totalRevenue: number;
  totalReceived: number;
  totalDebt: number;
  totalProfit: number;
  totalTransactions: number;
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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalReceived: 0,
    totalDebt: 0,
    totalProfit: 0,
    totalTransactions: 0,
  });
  const [profile, setProfile] = useState<{ full_name: string; business_name: string } | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { year, month } = getCurrentMonth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const { start, end } = getMonthRange(year, month);
      
      // Load monthly stats
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('selling_price, cost_price, paid_amount, remaining_amount, profit_amount')
        .eq('user_id', user?.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .neq('payment_status', 'cancelled');

      if (transError) throw transError;

      const stats: DashboardStats = {
        totalRevenue: transactions?.reduce((sum, t) => sum + t.selling_price, 0) || 0,
        totalReceived: transactions?.reduce((sum, t) => sum + t.paid_amount, 0) || 0,
        totalDebt: transactions?.reduce((sum, t) => sum + t.remaining_amount, 0) || 0,
        totalProfit: transactions?.reduce((sum, t) => sum + t.profit_amount, 0) || 0,
        totalTransactions: transactions?.length || 0,
      };

      setStats(stats);

      // Load profile details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, business_name')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Load total customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setTotalCustomers(customersCount || 0);

      // Load today's transactions
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await supabase
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
        .eq('transaction_date', today)
        .order('created_at', { ascending: false })
        .limit(5);

      if (todayError) throw todayError;

      const formattedTodayData = (todayData || []).map((t: any) => ({
        ...t,
        customer: Array.isArray(t.customer) ? t.customer[0] : t.customer,
      })) as unknown as Transaction[];

      setTodayTransactions(formattedTodayData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header 
        title="Dashboard" 
        action={
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
            {getMonthName(month)} {year}
          </span>
        }
      />

      <div className="p-5 space-y-6 animate-fade-in-up">
        {/* Welcome Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Halo, {profile?.full_name || 'Admin'}</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Kelola kuota & pantau arus kas Anda.</p>
          </div>
          <div className="w-10 h-10 bg-slate-100 border border-slate-200/50 rounded-full flex items-center justify-center font-bold text-slate-700 text-sm">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>

        {/* Premium Wallet Credit Card (Net Profit) */}
        <div className="relative overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl shadow-indigo-950/20 border border-slate-800">
          {/* Subtle glow layer */}
          <div className="absolute top-[-50%] right-[-30%] w-64 h-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Laba Bersih</p>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1.5">
                {formatCurrency(stats.totalProfit)}
              </h3>
            </div>
            {/* Elegant Chip Icon */}
            <div className="w-10 h-8 bg-gradient-to-br from-amber-300 to-amber-500 rounded-lg opacity-85 shadow-sm" />
          </div>

          <div className="mt-8 flex justify-between items-end relative z-10 border-t border-white/10 pt-4">
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Pemilik Layanan</p>
              <p className="text-xs font-semibold text-slate-200 mt-1 uppercase tracking-wider">{profile?.business_name || 'Premium Member'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Masa Transaksi</p>
              <p className="text-xs font-bold text-slate-200 mt-1">{getMonthName(month)} {year}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry Mini-Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white border-slate-100/50">
            <CardBody className="p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Omzet</span>
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
              <p className="text-base font-extrabold text-slate-900 mt-2">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </CardBody>
          </Card>

          <Card className="bg-white border-slate-100/50">
            <CardBody className="p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diterima</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-base font-extrabold text-emerald-600 mt-2">
                {formatCurrency(stats.totalReceived)}
              </p>
            </CardBody>
          </Card>

          <Card className="bg-white border-slate-100/50">
            <CardBody className="p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hutang</span>
                <div className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <p className="text-base font-extrabold text-rose-600 mt-2">
                {formatCurrency(stats.totalDebt)}
              </p>
            </CardBody>
          </Card>

          <Card className="bg-white border-slate-100/50">
            <CardBody className="p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaksi</span>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-base font-extrabold text-slate-900 mt-2">
                {stats.totalTransactions} <span className="text-xs text-slate-400 font-medium">kali</span>
              </p>
            </CardBody>
          </Card>

          <Card className="bg-white border-slate-100/50 col-span-2">
            <CardBody className="p-4.5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Total Pelanggan</span>
                <p className="text-base font-extrabold text-slate-900 mt-1.5">
                  {totalCustomers} <span className="text-xs text-slate-400 font-medium">orang</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Action Trigger */}
        <Link to="/transactions/new" className="block">
          <Button fullWidth size="lg" className="shadow-lg">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            Transaksi Baru
          </Button>
        </Link>

        {/* Today's Transactions Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Transaksi Hari Ini</h3>
            <Link to="/transactions" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
              Lihat Semua
            </Link>
          </div>

          {todayTransactions.length === 0 ? (
            <Card className="bg-white border-slate-100/50">
              <CardBody className="py-8">
                <p className="text-center text-xs text-slate-400 font-medium">
                  Belum ada transaksi hari ini
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayTransactions.map((transaction) => {
                // Map status badges
                const statusColor = 
                  transaction.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                  transaction.payment_status === 'debt' ? 'bg-rose-50 text-rose-700' :
                  transaction.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600';

                return (
                  <Card key={transaction.id} className="bg-white hover:border-indigo-100 transition-colors">
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Circular User Avatar Badge */}
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50/70 border border-indigo-100/30 flex items-center justify-center font-bold text-indigo-600 text-sm">
                            {transaction.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {transaction.customer.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {transaction.product_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-slate-900">
                            {formatCurrency(transaction.selling_price)}
                          </p>
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1.5 ${statusColor}`}>
                            {getPaymentStatusLabel(transaction.payment_status)}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
