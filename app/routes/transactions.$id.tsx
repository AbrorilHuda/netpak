import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Route } from './+types/transactions.$id';
import { AppShell } from '~/components/layout/AppShell';
import { Header } from '~/components/layout/Header';
import { Card, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Select } from '~/components/ui/Select';
import { useAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatCurrency, parseCurrency } from '~/lib/currency';
import { formatDateShort, formatDateInput } from '~/lib/date';
import { getPaymentStatusLabel, getPaymentStatusColor } from '~/lib/calculations';
import { normalizeJoin, formatWhatsAppNumber } from '~/lib/validators';
import { useToast } from '~/components/ui/DynamicIsland';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Detail Transaksi - Transaksi Kuota' },
  ];
}

interface TransactionDetails {
  id: string;
  transaction_date: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'paid' | 'debt' | 'partial' | 'cancelled';
  payment_method: 'cash' | 'transfer' | 'qris' | 'other';
  notes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
}

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'qris' | 'other';
  notes: string | null;
  created_at: string;
}

export default function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [profilePhone, setProfilePhone] = useState('');

  // Payment form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user && id) {
      loadTransactionDetails();
    }
  }, [user, id]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);

      // 1. Fetch transaction
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers(id, name, phone)
        `)
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (transError) throw transError;

      if (transData) {
        setTransaction({
          ...transData,
          customer: normalizeJoin(transData.customer as any),
        } as TransactionDetails);

        // Prefill payment amount with remaining debt
        setPaymentAmount(transData.remaining_amount.toString());
      }

      // 2. Fetch payment records
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', id)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (payError) throw payError;
      setPayments(payData || []);

      // 3. Fetch profile phone details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user!.id)
        .maybeSingle();

      if (profileData?.phone) {
        setProfilePhone(profileData.phone);
      }

    } catch (err) {
      console.error('Error loading transaction details:', err);
      showToast('Gagal memuat detail transaksi.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSendWhatsApp = () => {
    if (!transaction || !profilePhone) return;
    
    const formattedPhone = formatWhatsAppNumber(profilePhone);
    const message = `Beli: ${transaction.product_name}\nNo. HP: ${transaction.customer.phone || '-'}`;
    
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setSubmittingPayment(true);

    try {
      const amountToPay = parseFloat(paymentAmount) || 0;

      if (amountToPay <= 0) {
        showToast('Jumlah pembayaran harus lebih besar dari 0', 'error');
        setSubmittingPayment(false);
        return;
      }

      if (amountToPay > transaction.remaining_amount) {
        showToast(`Jumlah pembayaran melebihi sisa hutang (${formatCurrency(transaction.remaining_amount)})`, 'error');
        setSubmittingPayment(false);
        return;
      }

      // 1. Insert into payments table
      const { error: payInsertError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id!,
          transaction_id: id,
          payment_date: formatDateInput(new Date()),
          amount: amountToPay,
          payment_method: paymentMethod as any,
          notes: paymentNotes || 'Cicilan pembayaran',
        });

      if (payInsertError) throw payInsertError;

      // 2. Update transaction paid & remaining amounts
      const newPaidAmount = transaction.paid_amount + amountToPay;
      const newRemainingAmount = transaction.remaining_amount - amountToPay;
      
      let newStatus: 'paid' | 'partial' = 'partial';
      if (newRemainingAmount <= 0) {
        newStatus = 'paid';
      }

      const { error: transUpdateError } = await supabase
        .from('transactions')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (transUpdateError) throw transUpdateError;

      // Clear input fields
      setPaymentNotes('');
      
      // Reload everything
      await loadTransactionDetails();
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Gagal mencatat pembayaran.', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeleteTransaction = async () => {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus transaksi ini? Seluruh riwayat pembayaran juga akan dihapus permanen.');
    if (!confirmed) return;

    setDeleting(true);

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      navigate('/transactions');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showToast('Gagal menghapus transaksi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Detail Transaksi" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600"></div>
        </div>
      </AppShell>
    );
  }

  if (!transaction) {
    return (
      <AppShell>
        <Header title="Detail Transaksi" />
        <div className="p-5 text-center">
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Transaksi tidak ditemukan.</p>
        </div>
      </AppShell>
    );
  }

  // Set style based on status
  const statusColor = 
    transaction.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
    transaction.payment_status === 'debt' ? 'bg-rose-50 text-rose-700' :
    transaction.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600';

  return (
    <AppShell>
      <Header 
        title="Detail Transaksi" 
        action={
          <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200">
            Kembali
          </button>
        }
      />

      <div className="p-5 space-y-6 animate-fade-in-up">
        {/* Transaction Summary Card */}
        <Card className="overflow-hidden border-slate-100 dark:border-slate-800/50">
          <CardBody className="p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nama Produk</p>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mt-1">
                  {transaction.product_name}
                </h2>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                {getPaymentStatusLabel(transaction.payment_status)}
              </span>
            </div>

            {/* Price Metrics Bar */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-50">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Tagihan</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50 mt-1">
                  {formatCurrency(transaction.selling_price)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Telah Dibayar</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">
                  {formatCurrency(transaction.paid_amount)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sisa Hutang</p>
                <p className="text-sm font-extrabold text-rose-600 mt-1">
                  {formatCurrency(transaction.remaining_amount)}
                </p>
              </div>
            </div>

            {/* Additional Info Table */}
            <div className="space-y-2.5 pt-3 border-t border-slate-50 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Pelanggan</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{transaction.customer.name}</span>
              </div>
              {transaction.customer.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">No. HP Pelanggan</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{transaction.customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Tanggal Transaksi</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatDateShort(transaction.transaction_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Metode Awal</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">{transaction.payment_method}</span>
              </div>
              {transaction.notes && (
                <div className="pt-2 border-t border-slate-50 text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Catatan</span>
                  {transaction.notes}
                </div>
              )}
            </div>

            {profilePhone && (
              <div className="pt-4 border-t border-slate-50">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  size="md"
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100/50 rounded-2xl text-xs font-bold"
                  onClick={handleSendWhatsApp}
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.579 1.966 14.11 1.01 11.488 1.01c-5.442 0-9.866 4.372-9.87 9.802 0 1.696.475 3.356 1.378 4.793l-.997 3.646 3.734-.967zm12.39-7.147c-.295-.147-1.74-.858-2.008-.956-.268-.099-.463-.147-.657.147-.196.295-.758.956-.93 1.15-.17.194-.342.218-.638.072-.295-.147-1.25-.46-2.38-1.466-.88-.784-1.474-1.753-1.647-2.05-.173-.294-.018-.454.13-.601.134-.132.296-.343.444-.514.148-.172.197-.294.295-.49.098-.197.05-.37-.024-.515-.074-.148-.658-1.585-.902-2.174-.236-.57-.497-.491-.68-.5-.17-.008-.365-.01-.56-.01-.196 0-.514.073-.783.366-.268.293-1.024 1.002-1.024 2.443 0 1.44 1.049 2.835 1.195 3.03.147.197 2.064 3.15 5.002 4.42.7.3 1.244.48 1.67.615.706.224 1.348.192 1.857.116.566-.085 1.74-.712 1.986-1.4.244-.686.244-1.274.17-1.4-.074-.125-.268-.196-.563-.344z"/>
                  </svg>
                  Kirim Transaksi ke HP Bisnis (WhatsApp)
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Debt Payment Form (Only visible if there is remaining debt) */}
        {transaction.remaining_amount > 0 && (
          <Card className="border-rose-100 bg-rose-50/10">
            <CardBody className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                Catat Pelunasan / Cicilan Hutang
              </h3>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <Input
                  type="number"
                  label="Jumlah Pembayaran (Rupiah)"
                  placeholder="Masukkan jumlah bayar"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  disabled={submittingPayment || deleting}
                  helperText={`Maksimal pembayaran: ${formatCurrency(transaction.remaining_amount)}`}
                />

                <Select
                  label="Metode Pembayaran"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'cash', label: 'Tunai' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'qris', label: 'QRIS' },
                    { value: 'other', label: 'Lainnya' },
                  ]}
                  disabled={submittingPayment || deleting}
                />

                <Input
                  label="Catatan Pembayaran"
                  placeholder="Contoh: Cicilan ke-2, Lunas penuh (opsional)"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={submittingPayment || deleting}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    loading={submittingPayment}
                    disabled={deleting}
                  >
                    Simpan Pembayaran
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Payment History / Ledger Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Riwayat Pembayaran (Ledger)</h3>
          
          {payments.length === 0 ? (
            <Card className="border-slate-100 dark:border-slate-800/50">
              <CardBody className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                Belum ada riwayat pembayaran yang tercatat.
              </CardBody>
            </Card>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4.5 pl-5 space-y-5 py-2">
              {payments.map((pay) => (
                <div key={pay.id} className="relative">
                  {/* Timeline circular dot indicator */}
                  <span className="absolute left-[-26px] top-1.5 w-3 h-3 bg-indigo-600 rounded-full ring-4 ring-white shadow-sm" />
                  
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                        {formatCurrency(pay.amount)}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {pay.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 font-medium leading-relaxed">
                      {pay.notes || 'Pembayaran'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                      {formatDateShort(pay.payment_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Transaction Area */}
        <div className="pt-4">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            size="lg"
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-700 rounded-2xl font-bold"
            onClick={handleDeleteTransaction}
            loading={deleting}
            disabled={submittingPayment}
          >
            Hapus / Batalkan Transaksi
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
