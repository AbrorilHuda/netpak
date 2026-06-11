import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/more';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';
import { useToast } from '~/components/ui/DynamicIsland';
import { isValidIndonesianPhone } from '~/lib/validators';
import type { UserProfile } from '~/types';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Lainnya - Transaksi Kuota' },
  ];
}


export default function More() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast, showConfirm } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  
  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    business_name: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          business_name: data.business_name || '',
          phone: data.phone || '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      showToast('Gagal memuat profil bisnis.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (formData.phone && !isValidIndonesianPhone(formData.phone)) {
          showToast('Format nomor HP tidak valid.', 'error');
          setSaving(false);
          return;
        }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id!,
          full_name: formData.full_name.trim(),
          business_name: formData.business_name.trim(),
          phone: formData.phone.trim(),
        });

      if (upsertError) throw upsertError;

      showToast('Profil bisnis berhasil diperbarui!', 'success');
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Gagal menyimpan profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm('Yakin ingin keluar dari aplikasi?');
    if (confirmed) {
      await signOut();
      window.location.href = '/login';
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const [customers, products, transactions, payments] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user!.id),
        supabase.from('products').select('*').eq('user_id', user!.id),
        supabase.from('transactions').select('*').eq('user_id', user!.id),
        supabase.from('payments').select('*').eq('user_id', user!.id),
      ]);

      const backup = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        user_id: user!.id,
        customers: customers.data || [],
        products: products.data || [],
        transactions: transactions.data || [],
        payments: payments.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-transaksi-kuota-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Backup error:', err);
      showToast('Gagal membuat backup.', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const confirmed = await showConfirm('PERHATIAN: Ini akan menggantikan data saat ini. Lanjutkan?');
      if (!confirmed) return;

      try {
        setBackingUp(true);
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.version || !backup.user_id) {
          showToast('File backup tidak valid.', 'error');
          return;
        }

        // Restore each table
        if (backup.customers?.length > 0) {
          await supabase.from('customers').upsert(backup.customers);
        }
        if (backup.products?.length > 0) {
          await supabase.from('products').upsert(backup.products);
        }
        if (backup.transactions?.length > 0) {
          await supabase.from('transactions').upsert(backup.transactions);
        }
        if (backup.payments?.length > 0) {
          await supabase.from('payments').upsert(backup.payments);
        }

        showToast('Data berhasil dipulihkan!', 'success');
      } catch (err) {
        console.error('Restore error:', err);
        showToast('Gagal memulihkan data. Pastikan file backup valid.', 'error');
      } finally {
        setBackingUp(false);
      }
    };
    input.click();
  };

  return (
    <AppShell>
      <Header title="Lainnya" />

      <div className="p-5 space-y-6 animate-fade-in-up">

        {/* User Card */}
        <Card className="border-slate-100 dark:border-slate-800/50">
          <CardBody className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center font-extrabold text-indigo-600 text-lg">
              {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {formData.full_name || 'Admin Toko'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{user?.email}</p>
              {formData.business_name && (
                <span className="inline-block mt-2 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full">
                  🏪 {formData.business_name}
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Profile Card View / Edit Form */}
        <Card className="border-slate-100 dark:border-slate-800/50">
          <CardBody className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Profil Bisnis / Toko</h3>
              {!isEditing && !loading && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profil
                </Button>
              )}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-100 border-t-indigo-600"></div>
              </div>
            ) : !isEditing ? (
              /* Read Only View of Profile */
              <div className="space-y-3.5 text-sm pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">Nama Pemilik</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formData.full_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">Nama Bisnis / Toko</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formData.business_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">No. HP Bisnis (Supplier)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formData.phone || '-'}</span>
                </div>
              </div>
            ) : (
              /* Editable Form */
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                <Input
                  label="Nama Lengkap"
                  placeholder="Masukkan nama lengkap Anda"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={saving}
                />

                <Input
                  label="Nama Bisnis / Toko"
                  placeholder="Contoh: Andi Cell, Maju Jaya Kuota"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  disabled={saving}
                />

                <Input
                  label="No. HP Bisnis (Supplier)"
                  placeholder="Contoh: 081234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={saving}
                />

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <Button
                    type="submit"
                    loading={saving}
                  >
                    Simpan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      loadProfile(); // reset fields
                    }}
                    disabled={saving}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Menu Items */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pengaturan Aplikasi</h3>
          
            {/* Dark Mode Toggle */}
            <Card className="border-slate-100 dark:border-slate-800/50 hover:border-indigo-100 transition-colors">
              <CardBody className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={theme === 'dark' ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" : "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Mode Gelap</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                      {theme === 'dark' ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                    theme === 'dark' ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow transition-transform duration-300 ${
                    theme === 'dark' ? 'translate-x-6' : ''
                  }`} />
                </button>
              </CardBody>
            </Card>
          
          <Link to="/products" className="block">
            <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 hover:border-indigo-100 transition-colors">
              <CardBody className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Kelola Produk</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Atur harga modal & jual kuota</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </CardBody>
            </Card>
          </Link>

          <Link to="/reports" className="block">
            <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 hover:border-indigo-100 transition-colors">
              <CardBody className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Laporan Penjualan</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Arus kas & margin laba bulanan</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                </svg>
              </CardBody>
            </Card>
          </Link>
        </div>

        {/* Backup & Restore */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Backup & Restore Data</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleBackup}
              loading={backingUp}
              variant="secondary"
              size="md"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Backup
            </Button>
            <Button
              onClick={handleRestore}
              variant="secondary"
              size="md"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Restore
            </Button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={handleLogout}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar Aplikasi
          </Button>
        </div>

        {/* App Info */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-semibold pt-4">
          <p>TRANSAKSI KUOTA v2.0.0</p>
          <p className="mt-1">© 2026 TRANSAKSI KUOTA • PREMIUM DOCK</p>
        </div>
      </div>
    </AppShell>
  );
}
