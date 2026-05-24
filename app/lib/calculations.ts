export type PaymentStatus = 'paid' | 'debt' | 'partial' | 'cancelled';

export function calculatePaymentStatus(
  sellingPrice: number,
  paidAmount: number
): PaymentStatus {
  if (paidAmount <= 0) {
    return 'debt';
  }
  if (paidAmount >= sellingPrice) {
    return 'paid';
  }
  return 'partial';
}

export function calculateRemainingAmount(
  sellingPrice: number,
  paidAmount: number
): number {
  const remaining = sellingPrice - paidAmount;
  return remaining > 0 ? remaining : 0;
}

export function calculateProfit(
  sellingPrice: number,
  costPrice: number
): number {
  return sellingPrice - costPrice;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: 'Lunas',
    debt: 'Hutang',
    partial: 'Sebagian',
    cancelled: 'Dibatalkan',
  };
  return labels[status] || status;
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    debt: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
