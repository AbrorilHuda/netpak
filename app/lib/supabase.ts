import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          business_name: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          business_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          business_name?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          provider: string | null;
          cost_price: number;
          selling_price: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          provider?: string | null;
          cost_price?: number;
          selling_price?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          provider?: string | null;
          cost_price?: number;
          selling_price?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
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
          payment_status: 'paid' | 'debt' | 'partial' | 'cancelled';
          payment_method: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          product_id?: string | null;
          transaction_date?: string;
          product_name: string;
          cost_price?: number;
          selling_price: number;
          paid_amount?: number;
          remaining_amount?: number;
          profit_amount?: number;
          payment_status: 'paid' | 'debt' | 'partial' | 'cancelled';
          payment_method?: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          product_id?: string | null;
          transaction_date?: string;
          product_name?: string;
          cost_price?: number;
          selling_price?: number;
          paid_amount?: number;
          remaining_amount?: number;
          profit_amount?: number;
          payment_status?: 'paid' | 'debt' | 'partial' | 'cancelled';
          payment_method?: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          payment_date: string;
          amount: number;
          payment_method: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          payment_date?: string;
          amount: number;
          payment_method?: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          payment_date?: string;
          amount?: number;
          payment_method?: 'cash' | 'transfer' | 'qris' | 'other' | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
