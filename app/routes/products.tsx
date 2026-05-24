import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/products';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency } from '~/lib/currency';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Produk - Transaksi Kuota' },
    { name: 'description', content: 'Daftar produk kuota' },
  ];
}

interface Product {
  id: string;
  name: string;
  provider: string | null;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    filterProducts();
  }, [products, search, filter]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(p => p.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(p => !p.is_active);
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.provider?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Produk" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header 
        title="Produk" 
        action={
          <Link to="/products/new">
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
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'inactive'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Nonaktif
          </button>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500 py-8">
                {search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {product.name}
                          </p>
                          {!product.is_active && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        {product.provider && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {product.provider}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div>
                            <p className="text-xs text-gray-500">Modal</p>
                            <p className="text-sm font-medium text-gray-700">
                              {formatCurrency(product.cost_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Jual</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(product.selling_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Laba</p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(product.selling_price - product.cost_price)}
                            </p>
                          </div>
                        </div>
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
