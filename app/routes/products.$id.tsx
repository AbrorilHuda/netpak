import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Route } from './+types/products.$id';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { parseCurrency } from '~/lib/currency';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Edit Produk - Transaksi Kuota' },
  ];
}

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    cost_price: '',
    selling_price: '',
    description: '',
  });

  useEffect(() => {
    if (user && id) {
      loadProduct();
    }
  }, [user, id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setFormData({
          name: data.name || '',
          provider: data.provider || '',
          cost_price: data.cost_price.toString(),
          selling_price: data.selling_price.toString(),
          description: data.description || '',
        });
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Gagal memuat data produk.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const costPrice = parseCurrency(formData.cost_price);
      const sellingPrice = parseCurrency(formData.selling_price);

      if (sellingPrice < costPrice) {
        setError('Harga jual tidak boleh lebih kecil dari harga modal');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name.trim(),
          provider: formData.provider || null,
          cost_price: costPrice,
          selling_price: sellingPrice,
          description: formData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      navigate('/products');
    } catch (err) {
      console.error('Error updating product:', err);
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
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      navigate('/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Gagal menghapus produk. Pastikan produk tidak terikat pada transaksi apa pun.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Edit Produk" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header 
        title="Edit Produk" 
        action={
          <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-500 hover:text-slate-700">
            Batal
          </button>
        }
      />

      <div className="p-5 space-y-6 animate-fade-in-up">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
            <p className="text-xs font-semibold text-rose-600 leading-normal">{error}</p>
          </div>
        )}

        <Card>
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nama Produk"
                placeholder="Contoh: Kuota 10 GB"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={saving || deleting}
              />

              <Input
                label="Provider"
                placeholder="Contoh: Telkomsel, XL, Axis"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                disabled={saving || deleting}
              />

              <Input
                label="Harga Modal"
                type="number"
                placeholder="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                required
                disabled={saving || deleting}
              />

              <Input
                label="Harga Jual"
                type="number"
                placeholder="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
                disabled={saving || deleting}
              />

              <Input
                label="Deskripsi"
                placeholder="Catatan tambahan (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    Hapus Produk
                  </Button>
                ) : (
                  <div className="p-4 border border-rose-100 bg-rose-50/30 rounded-2xl space-y-3 animate-fade-in-up">
                    <p className="text-xs font-bold text-rose-700 text-center">
                      Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan.
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
      </div>
    </AppShell>
  );
}
