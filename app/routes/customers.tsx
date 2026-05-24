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
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user]);

  useEffect(() => {
    filterCustomers();
  }, [customers, search]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!search) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase())
    );
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

      <div className="p-4 space-y-4">
        {/* Search */}
        <Input
          type="search"
          placeholder="Cari pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Customers List */}
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500 py-8">
                {search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <Link key={customer.id} to={`/customers/${customer.id}`}>
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {customer.name}
                        </p>
                        {customer.phone && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {customer.phone}
                          </p>
                        )}
                        {customer.address && (
                          <p className="text-xs text-gray-500 mt-1">
                            {customer.address}
                          </p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
