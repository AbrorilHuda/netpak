import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/products.new';
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
    { title: 'Tambah Produk - Transaksi Kuota' },
  ];
}

export default function NewProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    cost_price: '',
    selling_price: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const costPrice = parseCurrency(formData.cost_price);
      const sellingPrice = parseCurrency(formData.selling_price);

      if (sellingPrice < costPrice) {
        setError('Harga jual tidak boleh lebih kecil dari harga modal');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert({
          user_id: user?.id!,
          name: formData.name,
          provider: formData.provider || null,
          cost_price: costPrice,
          selling_price: sellingPrice,
          description: formData.description || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      navigate('/products');
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Gagal menyimpan produk. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Header 
        title="Tambah Produk" 
        action={
          <button onClick={() => navigate(-1)} className="text-blue-600">
            Batal
          </button>
        }
      />

      <div className="p-4">
        <Card>
          <CardBody>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nama Produk"
                placeholder="Contoh: Kuota 10 GB"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />

              <Input
                label="Provider"
                placeholder="Contoh: Telkomsel, XL, Axis"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                disabled={loading}
              />

              <Input
                label="Harga Modal"
                type="number"
                placeholder="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                required
                disabled={loading}
              />

              <Input
                label="Harga Jual"
                type="number"
                placeholder="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
                disabled={loading}
              />

              <Input
                label="Deskripsi"
                placeholder="Catatan tambahan (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                >
                  Simpan Produk
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
