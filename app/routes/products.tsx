import { useEffect, useMemo, useState } from 'react';
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
import type { Product } from '~/types';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Produk - Transaksi Kuota' },
    { name: 'description', content: 'Daftar produk kuota' },
  ];
}


export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  // Derive filtered products during render
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (filter === 'active') filtered = filtered.filter(p => p.is_active);
    else if (filter === 'inactive') filtered = filtered.filter(p => !p.is_active);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.provider?.toLowerCase().includes(q)
      );
    }
    return filtered;
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


  if (loading) {
    return (
      <AppShell>
        <Header title="Produk" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600" />
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
        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
          {([['all', 'Semua'], ['active', 'Aktif'], ['inactive', 'Nonaktif']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all duration-200 ${
                filter === value
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs border border-slate-100 dark:border-slate-800'
                  : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <Card className="border-slate-100 dark:border-slate-800/50">
            <CardBody className="py-8">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                {search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card className="hover:bg-slate-50/50 transition-colors duration-200 border-slate-100 dark:border-slate-800/50 shadow-xs active:scale-[0.99]">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-800 dark:text-slate-100">
                            {product.name}
                          </p>
                          {!product.is_active && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        {product.provider && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            {product.provider}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-slate-50">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Modal</p>
                            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
                              {formatCurrency(product.cost_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Jual</p>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-50 mt-0.5">
                              {formatCurrency(product.selling_price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Laba</p>
                            <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                              {formatCurrency(product.selling_price - product.cost_price)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 ml-2 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
