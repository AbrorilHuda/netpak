# Transaksi Kuota - Mobile-First PWA

Website transaksi kuota berbasis mobile-first untuk mencatat penjualan paket kuota, memantau pembayaran pelanggan, menghitung penghasilan bulanan, serta melihat daftar pelanggan yang masih memiliki hutang.

## Tech Stack

- **Frontend**: React v19
- **Styling**: Tailwind CSS V4
- **Routing**: React Router v7
- **Backend/Database**: Supabase
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Security**: Supabase Row Level Security
- **App Experience**: PWA

## Setup Instructions

### 1. Install Dependencies

```bash
bun install
# atau
npm install
```

### 2. Install Supabase Client

```bash
bun add @supabase/supabase-js
# atau
npm install @supabase/supabase-js
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Kemudian isi dengan kredensial Supabase Anda:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Setup Database

Jalankan SQL berikut di Supabase SQL Editor untuk membuat tabel dan RLS policies:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

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

-- Enable Row Level Security
alter table profiles enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table payments enable row level security;

-- RLS Policies for customers
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

-- RLS Policies for products
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

-- RLS Policies for transactions
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

-- RLS Policies for payments
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

-- RLS Policies for profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

### 5. Run Development Server

```bash
bun run dev
# atau
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## Fitur MVP

✅ **Auth**
- Login admin
- Logout
- Protected routes

✅ **Dashboard**
- Omzet bulan ini
- Uang diterima
- Total hutang
- Laba bulan ini
- Jumlah transaksi
- Transaksi hari ini

✅ **Manajemen Pelanggan**
- CRUD pelanggan
- Search pelanggan

✅ **Manajemen Produk**
- CRUD produk
- Filter aktif/nonaktif
- Search produk

✅ **Transaksi**
- Input transaksi baru
- Status pembayaran otomatis (Lunas/Hutang/Sebagian)
- Daftar transaksi
- Filter by status

✅ **Hutang**
- Daftar transaksi belum lunas
- Total hutang
- Jumlah pelanggan berhutang

✅ **Laporan Bulanan**
- Ringkasan keuangan
- Produk terlaris
- Filter by bulan/tahun

✅ **Mobile-First UI**
- Bottom navigation
- Responsive design
- Touch-friendly buttons

## Struktur Folder

```
app/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── lib/
│   ├── auth.tsx
│   ├── calculations.ts
│   ├── currency.ts
│   ├── date.ts
│   └── supabase.ts
├── routes/
│   ├── login.tsx
│   ├── dashboard.tsx
│   ├── transactions.tsx
│   ├── transactions.new.tsx
│   ├── customers.tsx
│   ├── customers.new.tsx
│   ├── products.tsx
│   ├── products.new.tsx
│   ├── debts.tsx
│   ├── reports.tsx
│   └── more.tsx
├── root.tsx
└── routes.ts
```

## Next Steps (Post-MVP)

- [ ] Detail transaksi dengan riwayat pembayaran
- [ ] Edit transaksi
- [ ] Edit pelanggan & produk
- [ ] Detail pelanggan dengan riwayat transaksi
- [ ] Input pembayaran hutang
- [ ] PWA manifest & service worker
- [ ] Offline support
- [ ] Export laporan PDF
- [ ] WhatsApp integration
- [ ] Multi-user/role management

## License

MIT

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
