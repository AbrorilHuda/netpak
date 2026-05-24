import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/customers.new';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Tambah Pelanggan - Transaksi Kuota' },
  ];
}

export default function NewCustomer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.phone) {
        const cleanedPhone = formData.phone.replace(/[^\d+]/g, '');
        const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;
        if (!phoneRegex.test(cleanedPhone)) {
          setError('Format nomor HP tidak valid. Nomor HP Indonesia harus memiliki 10-13 digit dan diawali dengan 08, 628, atau +628.');
          setLoading(false);
          return;
        }
      }

      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          user_id: user?.id!,
          name: formData.name.trim() || 'Tanpa Nama',
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
        });

      if (insertError) throw insertError;

      navigate('/customers');
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Gagal menyimpan pelanggan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Header 
        title="Tambah Pelanggan" 
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
                label="Nama Pelanggan"
                placeholder="Masukkan nama (opsional, default: Tanpa Nama)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />

              <Input
                label="Nomor HP"
                type="tel"
                placeholder="08xx xxxx xxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />

              <Input
                label="Alamat"
                placeholder="Alamat lengkap (opsional)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  Simpan Pelanggan
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
