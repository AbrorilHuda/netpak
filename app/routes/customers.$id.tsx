import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import type { Route } from './+types/customers.$id';
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
    { title: 'Detail Pelanggan - Transaksi Kuota' },
  ];
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'edit'>('history');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (user && id) {
      loadCustomerAndHistory();
    }
  }, [user, id]);

  const loadCustomerAndHistory = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch customer details
      const { data: custData, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      if (custData) {
        setCustomer(custData);
        setFormData({
          name: custData.name === 'Tanpa Nama' ? '' : custData.name,
          phone: custData.phone || '',
          address: custData.address || '',
          notes: custData.notes || '',
        });
      }

      // 2. Fetch customer transactions
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', id)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);

    } catch (err) {
      console.error('Error loading customer details and history:', err);
      setError('Gagal memuat detail pelanggan dan riwayat transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (formData.phone) {
        const cleanedPhone = formData.phone.replace(/[^\d+]/g, '');
        const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;
        if (!phoneRegex.test(cleanedPhone)) {
          setError('Format nomor HP tidak valid. Nomor HP Indonesia harus memiliki 10-13 digit dan diawali dengan 08, 628, atau +628.');
          setSaving(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim() || 'Tanpa Nama',
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Reload data and switch back to history tab
      await loadCustomerAndHistory();
      setActiveTab('history');
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setDeleting(true);

    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      navigate('/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Gagal menghapus pelanggan. Pastikan pelanggan tidak memiliki transaksi terkait.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleWeek = async (transactionId: string, weekIndex: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const currentCompleted = transaction.completed_weeks || 1;
    const duration = transaction.duration_weeks || 1;
    const history = { ...(transaction.renewal_history || {}) };

    let newCompleted = currentCompleted;

    // Logic:
    // If click on highest completed week, allow to uncheck (toggle back to previous) except week 1.
    if (weekIndex === currentCompleted && weekIndex > 1) {
      newCompleted = weekIndex - 1;
      history[weekIndex.toString()] = null;
    } 
    // If click on next consecutive week, allow to check.
    else if (weekIndex === currentCompleted + 1 && weekIndex <= duration) {
      newCompleted = weekIndex;
      history[weekIndex.toString()] = new Date().toISOString();
    } 
    // Otherwise, do nothing
    else {
      return;
    }

    // Optimistic Update
    const originalTransactions = [...transactions];
    const updatedTransactions = transactions.map(t => {
      if (t.id === transactionId) {
        return {
          ...t,
          completed_weeks: newCompleted,
          renewal_history: history
        };
      }
      return t;
    });
    setTransactions(updatedTransactions);

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          completed_weeks: newCompleted,
          renewal_history: history,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating renewal week:', err);
      setError('Gagal menyimpan perubahan perpanjangan paket.');
      // Rollback
      setTransactions(originalTransactions);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Detail Pelanggan" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <Header title="Detail Pelanggan" />
        <div className="p-5 text-center">
          <p className="text-slate-500">Pelanggan tidak ditemukan.</p>
        </div>
      </AppShell>
    );
  }

  // Calculate Metrics
  const validTransactions = transactions.filter(t => t.payment_status !== 'cancelled');
  const totalTransactionsCount = validTransactions.length;
  const totalSpent = validTransactions.reduce((sum, t) => sum + (t.selling_price || 0), 0);
  const totalDebt = validTransactions.reduce((sum, t) => sum + (t.remaining_amount || 0), 0);

  // Filter 4-week active packages
  const activeFourWeekPackages = transactions.filter(t => 
    t.duration_weeks && t.duration_weeks > 1 && t.payment_status !== 'cancelled'
  );

  return (
    <AppShell>
      <Header 
        title={customer.name} 
        action={
          <button onClick={() => navigate('/customers')} className="text-sm font-bold text-slate-500 hover:text-slate-700">
            Kembali
          </button>
        }
      />

      <div className="p-4 space-y-5 animate-fade-in-up">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
            <p className="text-xs font-semibold text-rose-600 leading-normal">{error}</p>
          </div>
        )}

        {/* Customer Quick Profile Info */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center font-extrabold text-white text-base shadow-md shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-slate-800 truncate">{customer.name}</h2>
            {customer.phone && (
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{customer.phone}</p>
            )}
            {customer.address && (
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{customer.address}</p>
            )}
          </div>
        </div>

        {/* Financial Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-slate-100/50 shadow-xs">
            <CardBody className="p-3 text-center">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Belanja</span>
              <span className="block text-xs font-extrabold text-slate-900 mt-1 truncate">
                {formatCurrency(totalSpent)}
              </span>
            </CardBody>
          </Card>
          <Card className={`border-slate-100/50 shadow-xs ${totalDebt > 0 ? 'bg-rose-50/20 border-rose-100/60' : ''}`}>
            <CardBody className="p-3 text-center">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Hutang</span>
              <span className={`block text-xs font-extrabold mt-1 truncate ${totalDebt > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatCurrency(totalDebt)}
              </span>
            </CardBody>
          </Card>
          <Card className="border-slate-100/50 shadow-xs">
            <CardBody className="p-3 text-center">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Transaksi</span>
              <span className="block text-xs font-extrabold text-slate-900 mt-1">
                {totalTransactionsCount}
              </span>
            </CardBody>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 gap-1.5 p-1 bg-slate-50 rounded-2xl">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Riwayat & Perpanjangan
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2.5 text-xs font-bold text-center rounded-xl transition-all duration-200 ${
              activeTab === 'edit'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Edit Profil
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' ? (
          <div className="space-y-6">
            
            {/* 4-Week Package Renewal Tracking Section */}
            {activeFourWeekPackages.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Kontrol Paket 4 Mingguan
                  </h3>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {activeFourWeekPackages.filter(p => p.completed_weeks < p.duration_weeks).length} Aktif
                  </span>
                </div>

                <div className="space-y-3">
                  {activeFourWeekPackages.map((pkg) => {
                    const duration = pkg.duration_weeks || 4;
                    const completed = pkg.completed_weeks || 1;
                    const history = pkg.renewal_history || {};
                    const isFullyCompleted = completed >= duration;

                    return (
                      <Card key={pkg.id} className={`border-slate-100/60 shadow-sm ${isFullyCompleted ? 'bg-emerald-50/10 border-emerald-100/40' : ''}`}>
                        <CardBody className="p-4 space-y-4">
                          {/* Package Header */}
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-800 leading-tight">
                                {pkg.product_name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                Dibeli: {formatDateShort(pkg.transaction_date)}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              isFullyCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700 animate-pulse'
                            }`}>
                              {completed}/{duration} Minggu
                            </span>
                          </div>

                          {/* Interactive Week Circle Checklist */}
                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                            {Array.from({ length: duration }).map((_, i) => {
                              const weekNum = i + 1;
                              const isChecked = weekNum <= completed;
                              const isClickable = weekNum === completed || weekNum === completed + 1;
                              const dateChecked = history[weekNum.toString()];

                              let statusClass = 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed';
                              if (isChecked) {
                                statusClass = 'bg-indigo-600 border-indigo-600 text-white scale-102';
                              } else if (isClickable) {
                                statusClass = 'bg-white border-indigo-200 text-indigo-600 hover:border-indigo-400 cursor-pointer border-dashed border-2';
                              }

                              return (
                                <div key={weekNum} className="flex flex-col items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => isClickable && handleToggleWeek(pkg.id, weekNum)}
                                    disabled={!isClickable}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all duration-200 active:scale-95 ${statusClass}`}
                                  >
                                    {isChecked ? (
                                      <svg className="w-5 h-5 stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    ) : (
                                      `W${weekNum}`
                                    )}
                                  </button>
                                  <span className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-wide">
                                    {isChecked ? (
                                      dateChecked ? formatDateShort(dateChecked).split(' ')[0] : 'Selesai'
                                    ) : (
                                      'Belum'
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {isFullyCompleted && (
                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 animate-fade-in-up">
                              <svg className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                              </svg>
                              <span className="text-[10px] font-bold text-emerald-700 leading-none">
                                Paket telah diselesaikan penuh! Pelanggan dapat membeli paket baru kembali.
                              </span>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete Transaction History List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Riwayat Pembelian & Transaksi
              </h3>

              {transactions.length === 0 ? (
                <Card className="border-slate-100/50 shadow-xs">
                  <CardBody className="py-8 text-center">
                    <p className="text-slate-400 text-xs font-medium">Belum ada riwayat transaksi pelanggan.</p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((trans) => {
                    const statusColor = getPaymentStatusColor(trans.payment_status);
                    return (
                      <Link key={trans.id} to={`/transactions/${trans.id}`}>
                        <Card className="border-slate-100/50 shadow-xs hover:bg-slate-50/50 transition-colors active:scale-[0.99] duration-200">
                          <CardBody className="p-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-slate-800 truncate">
                                  {trans.product_name}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                  {formatDateShort(trans.transaction_date)}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusColor}`}>
                                {getPaymentStatusLabel(trans.payment_status)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                              <span>Total: <span className="text-slate-700">{formatCurrency(trans.selling_price)}</span></span>
                              {trans.remaining_amount > 0 && (
                                <span className="text-rose-500">Sisa: {formatCurrency(trans.remaining_amount)}</span>
                              )}
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
        ) : (
          /* Profile Editing Tab */
          <Card className="border-slate-100/60 shadow-sm animate-fade-in-up">
            <CardBody className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Nama Pelanggan"
                  placeholder="Masukkan nama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={saving || deleting}
                  required
                />

                <Input
                  label="Nomor HP"
                  type="tel"
                  placeholder="08xx xxxx xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={saving || deleting}
                />

                <Input
                  label="Alamat"
                  placeholder="Alamat lengkap (opsional)"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={saving || deleting}
                />

                <Input
                  label="Catatan"
                  placeholder="Catatan tambahan (opsional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={saving || deleting}
                />

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={saving}
                    disabled={deleting}
                  >
                    Simpan Perubahan
                  </Button>

                  {!showConfirmDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      fullWidth
                      size="lg"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-2xl font-bold"
                      onClick={() => setShowConfirmDelete(true)}
                      disabled={saving || deleting}
                    >
                      Hapus Pelanggan
                    </Button>
                  ) : (
                    <div className="p-4 border border-rose-100 bg-rose-50/30 rounded-2xl space-y-3 animate-fade-in-up">
                      <p className="text-xs font-bold text-rose-700 text-center">
                        Apakah Anda yakin ingin menghapus pelanggan ini? Seluruh transaksi terkait akan ikut terhapus.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="danger"
                          fullWidth
                          onClick={handleDelete}
                          loading={deleting}
                        >
                          Ya, Hapus
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          fullWidth
                          onClick={() => setShowConfirmDelete(false)}
                          disabled={deleting}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
