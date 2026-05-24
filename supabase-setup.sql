-- ============================================
-- Transaksi Kuota - Database Setup
-- ============================================
-- Jalankan script ini di Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  phone text,
  created_at timestamp with time zone default now()
);

-- Customers table
create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Products table
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text,
  cost_price numeric not null default 0,
  selling_price numeric not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Transactions table
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  product_id uuid references products(id) on delete set null,
  transaction_date date not null default current_date,
  product_name text not null,
  cost_price numeric not null default 0,
  selling_price numeric not null default 0,
  paid_amount numeric not null default 0,
  remaining_amount numeric not null default 0,
  profit_amount numeric not null default 0,
  payment_status text not null check (
    payment_status in ('paid', 'debt', 'partial', 'cancelled')
  ),
  payment_method text check (
    payment_method in ('cash', 'transfer', 'qris', 'other')
  ),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Payments table
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric not null check (amount > 0),
  payment_method text check (
    payment_method in ('cash', 'transfer', 'qris', 'other')
  ),
  notes text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_customers_user_id on customers(user_id);
create index idx_customers_name on customers(name);

create index idx_products_user_id on products(user_id);
create index idx_products_is_active on products(is_active);

create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_customer_id on transactions(customer_id);
create index idx_transactions_date on transactions(transaction_date);
create index idx_transactions_status on transactions(payment_status);

create index idx_payments_user_id on payments(user_id);
create index idx_payments_transaction_id on payments(transaction_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
alter table profiles enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table payments enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Customers policies
create policy "Users can view own customers"
  on customers for select
  using (auth.uid() = user_id);

create policy "Users can insert own customers"
  on customers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customers"
  on customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own customers"
  on customers for delete
  using (auth.uid() = user_id);

-- Products policies
create policy "Users can view own products"
  on products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own products"
  on products for delete
  using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- Payments policies
create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own payments"
  on payments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payments"
  on payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own payments"
  on payments for delete
  using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_customers_updated_at
  before update on customers
  for each row
  execute function update_updated_at_column();

create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column();

create trigger update_transactions_updated_at
  before update on transactions
  for each row
  execute function update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data after creating a user account

-- Insert sample customers
-- insert into customers (user_id, name, phone, address) values
--   ('your-user-id', 'Andi Wijaya', '081234567890', 'Jl. Merdeka No. 1'),
--   ('your-user-id', 'Budi Santoso', '081234567891', 'Jl. Sudirman No. 2'),
--   ('your-user-id', 'Citra Dewi', '081234567892', 'Jl. Gatot Subroto No. 3');

-- Insert sample products
-- insert into products (user_id, name, provider, cost_price, selling_price, is_active) values
--   ('your-user-id', 'Kuota 5 GB', 'Telkomsel', 25000, 30000, true),
--   ('your-user-id', 'Kuota 10 GB', 'Telkomsel', 42000, 50000, true),
--   ('your-user-id', 'Kuota 20 GB', 'Telkomsel', 78000, 90000, true),
--   ('your-user-id', 'Kuota 5 GB', 'XL', 23000, 28000, true),
--   ('your-user-id', 'Kuota 10 GB', 'XL', 40000, 48000, true);
