import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/transactions.new';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Select } from '~/components/ui/Select';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency, parseCurrency } from '~/lib/currency';
import { formatDateInput } from '~/lib/date';
import { calculatePaymentStatus, calculateRemainingAmount, calculateProfit } from '~/lib/calculations';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Transaksi Baru - Transaksi Kuota' },
  ];
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Product {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  duration_weeks: number;
}

export default function NewTransaction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState({
    transaction_date: formatDateInput(new Date()),
    customer_id: '',
    product_id: '',
    product_name: '',
    cost_price: '',
    selling_price: '',
    paid_amount: '',
    payment_method: 'cash',
    notes: '',
    duration_weeks: 1,
  });

  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => {
    const query = searchCustomerQuery.trim().toLowerCase();
    if (!query) return true;
    
    const isFourDigits = /^\d{4}$/.test(query);
    if (isFourDigits && c.phone) {
      const cleanedPhone = c.phone.replace(/[^\d]/g, '');
      return cleanedPhone.endsWith(query);
    }
    
    const nameMatch = c.name.toLowerCase().includes(query);
    const phoneMatch = c.phone ? c.phone.replace(/[^\d]/g, '').includes(query) : false;
    return nameMatch || phoneMatch;
  });

  useEffect(() => {
    if (user) {
      loadCustomers();
      loadProducts();
    }
  }, [user]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, cost_price, selling_price, duration_weeks')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        product_id: productId,
        product_name: product.name,
        cost_price: product.cost_price.toString(),
        selling_price: product.selling_price.toString(),
        paid_amount: product.selling_price.toString(),
        duration_weeks: product.duration_weeks || 1,
      });
    } else {
      setFormData({
        ...formData,
        product_id: '',
        product_name: '',
        cost_price: '',
        selling_price: '',
        paid_amount: '',
        duration_weeks: 1,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const costPrice = parseFloat(formData.cost_price) || 0;
      const sellingPrice = parseFloat(formData.selling_price) || 0;
      const paidAmount = parseFloat(formData.paid_amount) || 0;

      if (!formData.customer_id) {
        setError('Pilih pelanggan terlebih dahulu');
        setLoading(false);
        return;
      }

      if (!formData.product_name) {
        setError('Pilih produk terlebih dahulu');
        setLoading(false);
        return;
      }

      if (sellingPrice <= 0) {
        setError('Harga jual harus lebih dari 0');
        setLoading(false);
        return;
      }

      const remainingAmount = calculateRemainingAmount(sellingPrice, paidAmount);
      const profitAmount = calculateProfit(sellingPrice, costPrice);
      const paymentStatus = calculatePaymentStatus(sellingPrice, paidAmount);

      const renewalHistory: Record<string, string | null> = {};
      if (formData.duration_weeks > 1) {
        for (let w = 1; w <= formData.duration_weeks; w++) {
          renewalHistory[w.toString()] = w === 1 ? formData.transaction_date : null;
        }
      }

      // Insert transaction and return the new row's ID (no race condition)
      const { data: insertedTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id!,
          customer_id: formData.customer_id,
          product_id: formData.product_id || null,
          transaction_date: formData.transaction_date,
          product_name: formData.product_name,
          cost_price: costPrice,
          selling_price: sellingPrice,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          profit_amount: profitAmount,
          payment_status: paymentStatus,
          payment_method: formData.payment_method === 'debt' ? null : (formData.payment_method as any),
          notes: formData.notes || null,
          duration_weeks: formData.duration_weeks,
          completed_weeks: 1,
          renewal_history: renewalHistory,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // If there's a payment, record it using the returned ID
      if (paidAmount > 0 && insertedTransaction) {
        await supabase
          .from('payments')
          .insert({
            user_id: user?.id!,
            transaction_id: insertedTransaction.id,
            payment_date: formData.transaction_date,
            amount: paidAmount,
            payment_method: formData.payment_method as any,
            notes: 'Pembayaran awal',
          });
      }

      navigate('/transactions');
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError('Gagal menyimpan transaksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const sellingPrice = parseFloat(formData.selling_price) || 0;
  const paidAmount = parseFloat(formData.paid_amount) || 0;
  const remainingAmount = calculateRemainingAmount(sellingPrice, paidAmount);

  return (
    <AppShell>
      <Header 
        title="Transaksi Baru" 
        action={
          <button onClick={() => navigate(-1)} className="text-indigo-600">
            Batal
          </button>
        }
      />

      <div className="p-4">
        <Card>
          <CardBody>
            {error && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="date"
                label="Tanggal Transaksi"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
                disabled={loading}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1.5 ml-1">
                  Pelanggan <span className="text-rose-500 ml-1">*</span>
                </label>
                <div 
                  onClick={() => !loading && setShowCustomerModal(true)}
                  className="w-full px-4 py-3.5 text-sm bg-slate-50/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl cursor-pointer flex justify-between items-center hover:bg-slate-50/90 active:scale-[0.99] transition-all duration-200"
                >
                  <span className={selectedCustomer ? 'text-slate-800 dark:text-slate-100 font-bold' : 'text-slate-400 dark:text-slate-500 font-semibold'}>
                    {selectedCustomer 
                      ? `${selectedCustomer.name} ${selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}` 
                      : '-- Pilih Pelanggan --'}
                  </span>
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <Select
                  label="Produk"
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  options={[
                    { value: '', label: '-- Pilih Produk --' },
                    ...products.map(p => ({ value: p.id, label: `${p.name} - ${formatCurrency(p.selling_price)}` }))
                  ]}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate('/products/new')}
                >
                  + Tambah Produk Baru
                </Button>
              </div>

              <Input
                type="number"
                label="Harga Modal"
                placeholder="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                required
                disabled={loading}
              />

              <Input
                type="number"
                label="Harga Jual"
                placeholder="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
                disabled={loading}
              />

              <Input
                type="number"
                label="Jumlah Dibayar"
                placeholder="0"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                required
                disabled={loading || formData.payment_method === 'debt'}
                helperText={remainingAmount > 0 ? `Sisa: ${formatCurrency(remainingAmount)}` : undefined}
              />

              <Select
                label="Metode Pembayaran"
                value={formData.payment_method}
                onChange={(e) => {
                  const method = e.target.value;
                  if (method === 'debt') {
                    setFormData({ ...formData, payment_method: method, paid_amount: '0' });
                  } else {
                    setFormData({ 
                      ...formData, 
                      payment_method: method, 
                      paid_amount: formData.paid_amount === '0' ? formData.selling_price : formData.paid_amount 
                    });
                  }
                }}
                options={[
                  { value: 'cash', label: 'Tunai' },
                  { value: 'transfer', label: 'Transfer' },
                  { value: 'qris', label: 'QRIS' },
                  { value: 'debt', label: 'Hutang' },
                  { value: 'other', label: 'Lainnya' },
                ]}
                disabled={loading}
              />

              <Input
                label="Catatan"
                placeholder="Catatan tambahan (opsional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                >
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Searchable Customer Selector Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in-up">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
            
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Pilih Pelanggan</h3>
              <button 
                type="button"
                className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 px-3 py-1.5 bg-slate-100 rounded-full"
                onClick={() => {
                  setShowCustomerModal(false);
                  setSearchCustomerQuery('');
                }}
              >
                Tutup
              </button>
            </div>

            {/* Search Bar */}
            <Input
              placeholder="Cari nama atau 4 digit terakhir nomor..."
              value={searchCustomerQuery}
              onChange={(e) => setSearchCustomerQuery(e.target.value)}
              autoFocus
            />

            {/* Customer List Container */}
            <div className="overflow-y-auto no-scrollbar flex-1 divide-y divide-slate-50 min-h-[220px]">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium py-12">
                  Pelanggan tidak ditemukan
                </p>
              ) : (
                filteredCustomers.map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setFormData({ ...formData, customer_id: c.id });
                      setShowCustomerModal(false);
                      setSearchCustomerQuery('');
                    }}
                    className="py-3 px-2.5 hover:bg-slate-50 dark:bg-slate-800/50 active:bg-slate-100 rounded-2xl cursor-pointer transition-colors flex items-center gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/30 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{c.phone}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowCustomerModal(false);
                  navigate('/customers/new');
                }}
              >
                + Tambah Pelanggan Baru
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
