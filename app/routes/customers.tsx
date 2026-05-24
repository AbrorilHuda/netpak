import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/customers';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Pelanggan - Transaksi Kuota' },
  ];
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  activePackage?: {
    product_name: string;
    completed_weeks: number;
    duration_weeks: number;
  } | null;
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'active_package'>('all');

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user]);

  useEffect(() => {
    filterCustomers();
  }, [customers, search, filterType]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch customers
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (custError) throw custError;

      // 2. Fetch all multi-week transactions (not cancelled)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('customer_id, product_name, completed_weeks, duration_weeks, payment_status')
        .eq('user_id', user?.id)
        .gt('duration_weeks', 1)
        .neq('payment_status', 'cancelled');

      const transactionsList = transData || [];

      // 3. Map active packages to customers
      const mappedCustomers = (custData || []).map((customer: any) => {
        const activePkg = transactionsList.find(
          t => t.customer_id === customer.id && (t.completed_weeks || 1) < (t.duration_weeks || 1)
        );

        return {
          ...customer,
          activePackage: activePkg
            ? {
                product_name: activePkg.product_name,
                completed_weeks: activePkg.completed_weeks,
                duration_weeks: activePkg.duration_weeks,
              }
            : null,
        } as Customer;
      });

      setCustomers(mappedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (filterType === 'active_package') {
      filtered = filtered.filter(c => !!c.activePackage);
    }

    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Pelanggan" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header 
        title="Pelanggan" 
        action={
          <Link to="/customers/new">
            <Button size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah
            </Button>
          </Link>
        }
      />

      <div className="p-4 space-y-4 animate-fade-in-up">
        {/* Search */}
        <Input
          type="search"
          placeholder="Cari pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter Tab Pills */}
        <div className="flex gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all duration-200 ${
              filterType === 'all'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Semua Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setFilterType('active_package')}
            className={`flex-1 py-2 text-xs font-bold text-center rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 ${
              filterType === 'active_package'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-100'
                : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${filterType === 'active_package' ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-400'}`} />
            Paket 4 Mgg Aktif
          </button>
        </div>

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500 py-8 text-xs font-medium">
                {search || filterType !== 'all' ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <Link key={customer.id} to={`/customers/${customer.id}`}>
                <Card className="hover:bg-slate-50/50 transition-colors duration-200 border-slate-100/50 shadow-xs">
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-800">
                            {customer.name}
                          </p>
                          {customer.activePackage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider bg-indigo-50 border border-indigo-100/30 text-indigo-700 leading-none shrink-0 shadow-3xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                              Pkt Aktif: W{customer.activePackage.completed_weeks}/{customer.activePackage.duration_weeks}
                            </span>
                          )}
                        </div>
                        {customer.phone && (
                          <p className="text-xs text-slate-500 mt-1 font-semibold">
                            {customer.phone}
                          </p>
                        )}
                        {customer.address && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                            {customer.address}
                          </p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
