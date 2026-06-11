// Shared types for Transaksi Kuota

export type PaymentStatus = 'paid' | 'debt' | 'partial' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'other';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  cost_price: number;
  selling_price: number;
  description: string | null;
  is_active: boolean;
  duration_weeks: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  customer_id: string;
  product_id: string | null;
  transaction_date: string;
  product_name: string;
  cost_price: number;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  profit_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  duration_weeks: number;
  completed_weeks: number;
  renewal_history: Record<string, string | null>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  transaction_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
}

export interface UserProfile {
  id?: string;
  full_name: string;
  business_name: string;
  phone: string;
}

// Joined types (for display with related data)
export interface TransactionWithCustomer {
  id: string;
  transaction_date: string;
  product_name: string;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  customer: {
    id?: string;
    name: string;
    phone?: string | null;
  };
}

export interface DashboardStats {
  totalRevenue: number;
  totalReceived: number;
  totalDebt: number;
  totalProfit: number;
  totalTransactions: number;
}

export interface MonthlyReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalReceived: number;
  totalDebt: number;
  totalTransactions: number;
  uniqueCustomers: number;
}

export interface ProductSales {
  product_name: string;
  total_sold: number;
  total_revenue: number;
}
