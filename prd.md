# PRD — Website Transaksi Kuota Mobile-First

okey untuk supabase bisa kamu skip dulu karena udah saya buat kamu fokus ke ui dan logicnya

## 1. Ringkasan Produk

Produk yang akan dibuat adalah **website transaksi kuota berbasis mobile-first** untuk mencatat penjualan paket kuota, memantau pembayaran pelanggan, menghitung penghasilan bulanan, serta melihat daftar pelanggan yang masih memiliki hutang.

Website ini akan dibangun menggunakan:

| Komponen           | Teknologi                     |
| ------------------ | ----------------------------- |
| Frontend           | React v19                     |
| style              | tailwindcss V4                |
| Routing            | React Router v7               |
| Backend / Database | Supabase                      |
| Auth               | Supabase Auth                 |
| Database           | PostgreSQL via Supabase       |
| Security           | Supabase Row Level Security   |
| App Experience     | PWA                           |
| Target Device      | Mobile device terlebih dahulu  |

React Router v7 cocok dipakai karena sudah mendukung pendekatan routing modern dengan **loader**, **action**, pending state, dan type safety yang lebih baik. React Router juga mendukung beberapa mode penggunaan, termasuk Data Mode dan Framework Mode. ([React Router][1])

Supabase dipilih karena menyediakan database PostgreSQL, Auth, Realtime, Storage, dan integrasi Row Level Security. Supabase juga menyarankan RLS aktif pada tabel yang terekspos ke client, terutama pada schema `public`. ([Supabase][2])

---

# 2. Tujuan Produk

Tujuan utama produk ini adalah membantu penjual kuota mencatat transaksi harian dengan cepat melalui HP dan mengetahui kondisi bisnis bulanan secara jelas.

## Tujuan bisnis

Website harus bisa menjawab pertanyaan berikut:

1. Berapa total penghasilan bulan ini?
2. Berapa total transaksi bulan ini?
3. Siapa saja pelanggan yang belum bayar?
4. Berapa total hutang pelanggan?
5. Berapa uang yang benar-benar sudah diterima?
6. Produk kuota apa yang paling sering dibeli?
7. Berapa laba dari transaksi bulan ini?

---

# 3. Masalah yang Ingin Diselesaikan

Saat transaksi masih dicatat manual, biasanya muncul beberapa masalah:

| Masalah                              | Dampak                               |
| ------------------------------------ | ------------------------------------ |
| Catatan transaksi tercecer           | Sulit menghitung omzet bulanan       |
| Hutang pelanggan tidak tercatat rapi | Risiko lupa tagih                    |
| Tidak tahu uang masuk sebenarnya     | Omzet terlihat besar, tapi kas kecil |
| Data pelanggan tidak terstruktur     | Sulit melihat riwayat pembelian      |
| Perhitungan laba manual              | Rawan salah hitung                   |
| Tidak nyaman dipakai di HP           | Input transaksi menjadi lambat       |

Produk ini harus mengubah proses pencatatan menjadi **cepat, mobile-friendly, dan terukur**.

---

# 4. Target Pengguna

## Pengguna utama

**Admin / pemilik usaha kuota**

Karakteristik:

* Menginput transaksi dari HP.
* Butuh proses cepat.
* Tidak ingin tampilan rumit.
* Fokus pada uang masuk, hutang, dan laporan bulanan.
* Bisa saja hanya satu orang yang memakai sistem di tahap awal.

## Pengguna tambahan untuk versi berikutnya

* Kasir.
* Agen kuota.
* Pelanggan yang ingin melihat tagihan sendiri.
* Multi-cabang atau multi-admin.

Untuk MVP, fokus cukup pada **satu admin utama**.

---

# 5. Scope Produk

## Masuk dalam MVP

Fitur yang harus dibuat pada versi pertama:

1. Login admin.
2. Dashboard ringkasan bulan berjalan.
3. Manajemen pelanggan.
4. Manajemen produk kuota.
5. Input transaksi.
6. Status pembayaran: **Lunas**, **Hutang**, **Sebagian**.
7. Input pembayaran tambahan untuk transaksi hutang.
8. Daftar transaksi.
9. Filter transaksi berdasarkan tanggal, bulan, status, dan pelanggan.
10. Laporan bulanan.
11. Daftar piutang / hutang pelanggan.
12. PWA agar bisa dipasang ke layar utama HP.
13. Tampilan mobile-first.

## Tidak masuk MVP

Fitur berikut ditunda:

| Fitur                           | Alasan Ditunda                    |
| ------------------------------- | --------------------------------- |
| Monitoring sisa kuota real-time | Butuh integrasi API provider      |
| Multi-cabang                    | Belum perlu untuk tahap awal      |
| Role kasir/admin kompleks       | MVP fokus satu admin              |
| Integrasi WhatsApp otomatis     | Bisa masuk versi berikutnya       |
| Payment gateway                 | Tahap awal cukup catat manual     |
| Barcode / QR scan               | Belum prioritas                   |
| Export PDF                      | Bisa masuk setelah laporan stabil |
| Aplikasi native Android         | PWA sudah cukup untuk awal        |

---

# 6. Platform dan Prinsip Desain

## Fokus perangkat

Website harus dirancang untuk:

```text
Mobile-first, desktop-second
```

Target utama:

* Android Chrome.
* iPhone Safari.
* Mobile browser umum.
* Ukuran layar 360px–430px sebagai prioritas.

## Prinsip UI

Tampilan harus:

* Cepat dibuka.
* Nyaman dipakai satu tangan.
* Tombol besar dan mudah ditekan.
* Form singkat.
* Navigasi bawah.
* Angka uang mudah dibaca.
* Status transaksi jelas.
* Tidak terlalu banyak menu.

## Struktur navigasi mobile

Gunakan **bottom navigation** dengan menu utama:

```text
Dashboard | Transaksi | Pelanggan | Hutang | Lainnya
```

---

# 7. User Flow Utama

## 7.1 Login Admin

Admin membuka website, lalu login menggunakan email dan password.

Alur:

```text
Buka website
↓
Masukkan email dan password
↓
Supabase Auth memvalidasi akun
↓
Masuk ke dashboard
```

Supabase Auth menggunakan JWT dan dapat diintegrasikan dengan RLS untuk authorization. ([Supabase][3])

---

## 7.2 Input Transaksi Lunas

```text
Admin klik tombol + Transaksi
↓
Pilih pelanggan
↓
Pilih produk kuota
↓
Harga otomatis terisi
↓
Masukkan jumlah dibayar penuh
↓
Simpan transaksi
↓
Status menjadi Lunas
↓
Dashboard ter-update
```

Contoh:

| Field      | Nilai       |
| ---------- | ----------- |
| Pelanggan  | Andi        |
| Produk     | Kuota 10 GB |
| Harga jual | Rp50.000    |
| Modal      | Rp42.000    |
| Dibayar    | Rp50.000    |
| Status     | Lunas       |
| Laba       | Rp8.000     |

---

## 7.3 Input Transaksi Hutang

```text
Admin klik + Transaksi
↓
Pilih pelanggan
↓
Pilih produk
↓
Harga otomatis terisi
↓
Dibayar = 0
↓
Simpan
↓
Status menjadi Hutang
↓
Masuk ke daftar piutang
```

Contoh:

| Field       | Nilai      |
| ----------- | ---------- |
| Pelanggan   | Budi       |
| Produk      | Kuota 5 GB |
| Harga jual  | Rp30.000   |
| Dibayar     | Rp0        |
| Sisa hutang | Rp30.000   |
| Status      | Hutang     |

---

## 7.4 Input Transaksi Bayar Sebagian

```text
Admin input transaksi
↓
Harga jual Rp100.000
↓
Pelanggan bayar Rp40.000
↓
Sistem menghitung sisa Rp60.000
↓
Status menjadi Sebagian
```

---

## 7.5 Pelunasan Hutang

```text
Admin buka menu Hutang
↓
Pilih pelanggan / transaksi
↓
Klik Bayar
↓
Masukkan nominal pembayaran
↓
Sistem menambah riwayat pembayaran
↓
Sisa hutang dihitung ulang
↓
Status berubah jika sudah lunas
```

---

# 8. Fitur Detail

## 8.1 Dashboard

Dashboard adalah halaman pertama setelah login.

Isi dashboard:

| Komponen           | Keterangan                               |
| ------------------ | ---------------------------------------- |
| Omzet bulan ini    | Total nilai penjualan bulan berjalan     |
| Uang diterima      | Total pembayaran yang sudah masuk        |
| Total hutang       | Total sisa pembayaran pelanggan          |
| Laba bulan ini     | Total harga jual dikurangi total modal   |
| Jumlah transaksi   | Total transaksi bulan berjalan           |
| Transaksi hari ini | Ringkasan transaksi tanggal hari ini     |
| Produk terlaris    | Produk dengan jumlah transaksi terbanyak |

## Rumus dashboard

```text
Omzet = SUM(total_price)
Uang diterima = SUM(paid_amount)
Hutang = SUM(remaining_amount)
Modal = SUM(cost_price)
Laba = SUM(total_price - cost_price)
```

Catatan penting:

**Omzet tidak sama dengan uang diterima.**

Contoh:

```text
Omzet bulan ini: Rp5.000.000
Uang diterima: Rp4.200.000
Hutang: Rp800.000
```

Artinya penjualan terlihat Rp5.000.000, tetapi kas yang benar-benar masuk baru Rp4.200.000.

---

## 8.2 Manajemen Pelanggan

Admin bisa menambah, mengedit, mencari, dan melihat detail pelanggan.

Field pelanggan:

| Field          |    Wajib | Keterangan               |
| -------------- | -------: | ------------------------ |
| Nama pelanggan |       Ya | Nama pembeli             |
| Nomor HP       |    Tidak | Untuk kontak             |
| Alamat         |    Tidak | Opsional                 |
| Catatan        |    Tidak | Misalnya “sering hutang” |
| Tanggal dibuat | Otomatis | Dari sistem              |

Halaman detail pelanggan menampilkan:

* Data pelanggan.
* Total transaksi.
* Total belanja.
* Total hutang.
* Riwayat transaksi.
* Riwayat pembayaran.

---

## 8.3 Manajemen Produk Kuota

Admin bisa membuat daftar produk agar input transaksi lebih cepat.

Field produk:

| Field        | Wajib | Keterangan               |
| ------------ | ----: | ------------------------ |
| Nama produk  |    Ya | Contoh: Kuota 10 GB      |
| Harga modal  |    Ya | Harga beli/modal admin   |
| Harga jual   |    Ya | Harga ke pelanggan       |
| Provider     | Tidak | Telkomsel, XL, Axis, dll |
| Deskripsi    | Tidak | Catatan tambahan         |
| Status aktif |    Ya | Produk aktif/nonaktif    |

Contoh data:

| Produk      |    Modal |     Jual |     Laba |
| ----------- | -------: | -------: | -------: |
| Kuota 5 GB  | Rp25.000 | Rp30.000 |  Rp5.000 |
| Kuota 10 GB | Rp42.000 | Rp50.000 |  Rp8.000 |
| Kuota 20 GB | Rp78.000 | Rp90.000 | Rp12.000 |

---

## 8.4 Input Transaksi

Form transaksi harus dibuat sependek mungkin karena targetnya mobile.

Field transaksi:

| Field             | Wajib | Keterangan                        |
| ----------------- | ----: | --------------------------------- |
| Tanggal transaksi |    Ya | Default hari ini                  |
| Pelanggan         |    Ya | Bisa pilih atau tambah cepat      |
| Produk            |    Ya | Pilih paket kuota                 |
| Harga modal       |    Ya | Otomatis dari produk, bisa diedit |
| Harga jual        |    Ya | Otomatis dari produk, bisa diedit |
| Jumlah dibayar    |    Ya | Default sama dengan harga jual    |
| Metode bayar      | Tidak | Tunai, transfer, QRIS             |
| Catatan           | Tidak | Opsional                          |

Status pembayaran dihitung otomatis:

```text
Jika dibayar = 0
Status = Hutang

Jika dibayar > 0 dan dibayar < harga jual
Status = Sebagian

Jika dibayar >= harga jual
Status = Lunas
```

---

## 8.5 Daftar Transaksi

Daftar transaksi harus menampilkan data terbaru di atas.

Kolom mobile:

```text
Nama pelanggan
Produk
Tanggal
Harga jual
Dibayar
Sisa
Status
```

Karena layar HP kecil, tampilan lebih baik memakai **card list**, bukan tabel penuh.

Contoh card:

```text
Andi
Kuota 10 GB
24 Mei 2026

Total: Rp50.000
Dibayar: Rp50.000
Sisa: Rp0

Status: Lunas
```

Filter yang dibutuhkan:

| Filter    | Fungsi                   |
| --------- | ------------------------ |
| Tanggal   | Melihat transaksi harian |
| Bulan     | Melihat laporan bulanan  |
| Status    | Lunas, Hutang, Sebagian  |
| Pelanggan | Riwayat per pelanggan    |
| Produk    | Analisis produk terjual  |

---

## 8.6 Menu Hutang / Piutang

Menu ini sangat penting karena menjadi pusat penagihan.

Isi halaman:

| Informasi                  | Keterangan                |
| -------------------------- | ------------------------- |
| Total hutang aktif         | Semua sisa pembayaran     |
| Jumlah pelanggan berhutang | Pelanggan dengan sisa > 0 |
| Daftar transaksi hutang    | Transaksi belum lunas     |
| Tombol bayar               | Untuk mencatat pelunasan  |
| Riwayat pembayaran         | Bukti pembayaran bertahap |

Urutan daftar hutang:

1. Hutang terbesar.
2. Hutang terlama.
3. Hutang terbaru.

Status hutang:

| Status   | Kondisi                 |
| -------- | ----------------------- |
| Hutang   | Belum ada pembayaran    |
| Sebagian | Sudah bayar sebagian    |
| Lunas    | Sisa pembayaran sudah 0 |

---

## 8.7 Laporan Bulanan

Laporan bulanan adalah fitur utama untuk melihat penghasilan.

Isi laporan:

| Metrik                 | Keterangan                         |
| ---------------------- | ---------------------------------- |
| Total omzet            | Semua penjualan bulan tersebut     |
| Total modal            | Akumulasi harga modal              |
| Laba kotor             | Omzet - modal                      |
| Uang diterima          | Pembayaran masuk                   |
| Sisa hutang            | Pembayaran belum masuk             |
| Jumlah transaksi       | Total transaksi                    |
| Jumlah pelanggan aktif | Pelanggan yang transaksi bulan itu |
| Produk terlaris        | Produk dengan transaksi terbanyak  |

Contoh tampilan:

```text
Laporan Mei 2026

Omzet              Rp5.000.000
Modal              Rp4.100.000
Laba               Rp900.000
Uang Diterima      Rp4.300.000
Hutang             Rp700.000
Jumlah Transaksi   128
```

---

# 9. PWA Requirement

Website harus mendukung PWA agar bisa dipakai seperti aplikasi.

## Kebutuhan PWA

| Fitur            | Keterangan                          |
| ---------------- | ----------------------------------- |
| Web App Manifest | Nama aplikasi, ikon, warna tema     |
| Installable      | Bisa ditambahkan ke home screen     |
| Service Worker   | Untuk caching asset                 |
| Responsive       | Nyaman di layar HP                  |
| Offline fallback | Minimal menampilkan halaman offline |
| Fast loading     | Asset utama harus ringan            |

PWA umumnya membutuhkan manifest dan service worker agar aplikasi web dapat terasa seperti aplikasi yang bisa dipasang dan tetap punya pengalaman lebih baik di perangkat pengguna. web.dev menekankan aspek performa, keamanan, aksesibilitas, dan kompatibilitas lintas browser sebagai bagian penting dari pengalaman web modern. ([web.dev][4])

## Strategi offline MVP

Untuk MVP, offline tidak perlu mendukung input transaksi penuh.

Prioritas offline:

```text
Bisa membuka aplikasi
Bisa melihat halaman offline
Tidak crash saat koneksi buruk
Data transaksi tetap butuh koneksi
```

Versi berikutnya bisa menambahkan:

```text
Offline transaction queue
Sync otomatis saat internet kembali
```

---

# 10. Arsitektur Teknis

## 10.1 Frontend

Frontend menggunakan React dengan React Router v7.

Rekomendasi mode:

```text
React Router v7 Data Mode
```

Alasan:

* Cocok untuk SPA mobile-first.
* Mendukung route-level loader.
* Mendukung action untuk mutation.
* Lebih sederhana untuk MVP.
* Bisa tetap menggunakan Supabase client di browser.

React Router v7 Data Mode menyediakan mekanisme `loader`, `action`, dan pending states untuk pengambilan data dan mutasi data. ([React Router][1])

## Struktur route

```text
/
├── /login
├── /dashboard
├── /transactions
├── /transactions/new
├── /transactions/:id
├── /customers
├── /customers/new
├── /customers/:id
├── /products
├── /products/new
├── /debts
├── /reports
└── /settings
```

## Layout mobile

```text
AppShell
├── Header
├── MainContent
└── BottomNavigation
```

---

# 11. Database Design Supabase

## 11.1 Tabel `profiles`

Menyimpan profil admin.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  phone text,
  created_at timestamp with time zone default now()
);
```

---

## 11.2 Tabel `customers`

```sql
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
```

---

## 11.3 Tabel `products`

```sql
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
```

---

## 11.4 Tabel `transactions`

```sql
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
```

Catatan:

`product_name`, `cost_price`, dan `selling_price` tetap disimpan di transaksi agar riwayat tidak berubah jika harga produk diubah di masa depan.

---

## 11.5 Tabel `payments`

Tabel ini menyimpan riwayat pembayaran, terutama untuk transaksi hutang dan bayar sebagian.

```sql
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
```

---

# 12. Business Logic

## 12.1 Saat transaksi dibuat

Input:

```text
selling_price
cost_price
paid_amount
```

Sistem menghitung:

```text
remaining_amount = selling_price - paid_amount
profit_amount = selling_price - cost_price
```

Status:

```text
paid_amount <= 0
→ debt

paid_amount > 0 dan paid_amount < selling_price
→ partial

paid_amount >= selling_price
→ paid
```

## 12.2 Saat pembayaran hutang ditambahkan

Input:

```text
transaction_id
amount
```

Sistem:

```text
total_paid = transaksi.paid_amount + amount
remaining = selling_price - total_paid
```

Status baru:

```text
remaining <= 0
→ paid

remaining > 0 dan total_paid > 0
→ partial
```

---

# 13. Row Level Security

Karena aplikasi memakai Supabase langsung dari frontend, semua tabel milik user harus dilindungi dengan RLS.

Supabase menyatakan bahwa RLS harus diaktifkan pada tabel dalam schema yang terekspos ke client, terutama `public`. ([Supabase][2])

## Pola RLS

Setiap tabel bisnis memiliki kolom:

```text
user_id
```

Setiap user hanya bisa membaca dan mengubah data miliknya sendiri.

Contoh policy:

```sql
alter table customers enable row level security;

create policy "Users can view own customers"
on customers
for select
using (auth.uid() = user_id);

create policy "Users can insert own customers"
on customers
for insert
with check (auth.uid() = user_id);

create policy "Users can update own customers"
on customers
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own customers"
on customers
for delete
using (auth.uid() = user_id);
```

Policy serupa diterapkan ke:

```text
products
transactions
payments
profiles
```

---

# 14. Halaman dan Komponen UI

## 14.1 Halaman Login

Komponen:

* Logo/nama usaha.
* Input email.
* Input password.
* Tombol login.
* Error message.
* Loading state.

Validasi:

* Email wajib.
* Password wajib.
* Tampilkan error jika login gagal.

---

## 14.2 Dashboard Page

Komponen:

* Month selector.
* Summary cards.
* Today transaction list.
* Quick action button.
* Debt warning card.

Mobile layout:

```text
[Omzet]
[Uang Diterima] [Hutang]
[Laba] [Transaksi]
[+ Transaksi]
[Transaksi Terbaru]
```

---

## 14.3 Transactions Page

Komponen:

* Search.
* Filter status.
* Filter bulan.
* Transaction card list.
* Floating action button.

---

## 14.4 New Transaction Page

Komponen:

* Customer picker.
* Add customer shortcut.
* Product picker.
* Price fields.
* Paid amount input.
* Payment method picker.
* Notes.
* Save button.

UX penting:

```text
Jika pilih produk, harga modal dan harga jual otomatis terisi.
Jika dibayar kosong, default 0.
Jika dibayar sama dengan harga jual, status otomatis lunas.
```

---

## 14.5 Debts Page

Komponen:

* Total hutang.
* Search pelanggan.
* Debt transaction cards.
* Pay button.
* Payment modal.

---

## 14.6 Reports Page

Komponen:

* Month selector.
* Revenue summary.
* Profit summary.
* Debt summary.
* Product sales ranking.
* Customer ranking.

---

# 15. Acceptance Criteria

## Login

| Kriteria                                     | Status |
| -------------------------------------------- | ------ |
| Admin bisa login dengan email dan password   | Wajib  |
| Admin tidak bisa masuk jika credential salah | Wajib  |
| Session tetap aktif setelah refresh          | Wajib  |
| Logout berfungsi                             | Wajib  |

## Transaksi

| Kriteria                                 | Status |
| ---------------------------------------- | ------ |
| Admin bisa membuat transaksi baru        | Wajib  |
| Admin bisa memilih pelanggan             | Wajib  |
| Admin bisa memilih produk                | Wajib  |
| Harga otomatis terisi dari produk        | Wajib  |
| Admin bisa mengubah harga saat transaksi | Wajib  |
| Status pembayaran dihitung otomatis      | Wajib  |
| Transaksi muncul di daftar transaksi     | Wajib  |

## Hutang

| Kriteria                                    | Status |
| ------------------------------------------- | ------ |
| Transaksi belum lunas muncul di menu Hutang | Wajib  |
| Admin bisa mencatat pembayaran tambahan     | Wajib  |
| Sisa hutang berkurang setelah pembayaran    | Wajib  |
| Status berubah menjadi lunas saat sisa 0    | Wajib  |

## Dashboard

| Kriteria                              | Status |
| ------------------------------------- | ------ |
| Omzet bulan ini tampil                | Wajib  |
| Uang diterima tampil                  | Wajib  |
| Total hutang tampil                   | Wajib  |
| Laba tampil                           | Wajib  |
| Jumlah transaksi tampil               | Wajib  |
| Data berubah setelah transaksi dibuat | Wajib  |

## PWA

| Kriteria                     | Status |
| ---------------------------- | ------ |
| Website punya manifest       | Wajib  |
| Website punya service worker | Wajib  |
| Bisa dipasang ke home screen | Wajib  |
| Ada icon aplikasi            | Wajib  |
| Ada offline fallback page    | Wajib  |

---

# 16. Non-Functional Requirement

## Performance

Target:

| Metrik           |                           Target |
| ---------------- | -------------------------------: |
| Initial load     | < 3 detik pada koneksi 4G normal |
| Input transaksi  |               < 30 detik selesai |
| Dashboard query  |                        < 2 detik |
| Route transition |                    Terasa instan |

## Security

Requirement:

* Semua data user diproteksi RLS.
* Tidak menyimpan password manual.
* Menggunakan Supabase Auth.
* Tidak mengekspos service role key di frontend.
* Validasi input dilakukan di frontend dan database.
* Setiap query data harus berdasarkan `user_id`.

## Reliability

* Data transaksi tidak boleh hilang setelah refresh.
* Form harus memiliki loading state.
* Error dari Supabase harus ditampilkan dengan bahasa sederhana.
* Tidak boleh membuat transaksi ganda karena double tap.

## Accessibility

* Font minimal 14–16px.
* Tombol utama minimal tinggi 44px.
* Kontras teks harus jelas.
* Form label harus terlihat.
* Error message harus mudah dipahami.

---

# 17. Data Query Utama

## Dashboard bulanan

Query mengambil transaksi berdasarkan:

```text
user_id = auth.uid()
transaction_date berada pada bulan terpilih
payment_status != cancelled
```

Ringkasan:

```sql
select
  sum(selling_price) as total_revenue,
  sum(cost_price) as total_cost,
  sum(profit_amount) as total_profit,
  sum(paid_amount) as total_received,
  sum(remaining_amount) as total_debt,
  count(*) as total_transactions
from transactions
where transaction_date between :start_date and :end_date;
```

## Daftar hutang

```sql
select *
from transactions
where remaining_amount > 0
order by transaction_date asc;
```

## Produk terlaris

```sql
select
  product_name,
  count(*) as total_sold,
  sum(selling_price) as total_revenue
from transactions
where transaction_date between :start_date and :end_date
group by product_name
order by total_sold desc;
```

---

# 18. Recommended Folder Structure

```text
src/
├── app/
│   ├── router.tsx
│   └── root.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   ├── ui/
│   └── forms/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── transactions/
│   ├── customers/
│   ├── products/
│   ├── debts/
│   └── reports/
├── lib/
│   ├── supabase.ts
│   ├── currency.ts
│   ├── date.ts
│   └── calculations.ts
├── routes/
│   ├── login.tsx
│   ├── dashboard.tsx
│   ├── transactions.tsx
│   ├── transaction-new.tsx
│   ├── customers.tsx
│   ├── products.tsx
│   ├── debts.tsx
│   └── reports.tsx
└── styles/
    └── globals.css
```

---

# 19. MVP Development Milestone

## Milestone 1 — Setup Project

Output:

* React app berjalan.
* React Router v7 aktif.
* Supabase client terhubung.
* Struktur route dasar selesai.
* Layout mobile awal tersedia.

## Milestone 2 — Auth

Output:

* Login.
* Logout.
* Protected route.
* Session handling.
* Redirect jika belum login.

## Milestone 3 — Master Data

Output:

* CRUD pelanggan.
* CRUD produk.
* Search pelanggan.
* Produk aktif/nonaktif.

## Milestone 4 — Transaksi

Output:

* Input transaksi.
* Hitung status otomatis.
* Daftar transaksi.
* Detail transaksi.
* Filter transaksi.

## Milestone 5 — Hutang dan Pembayaran

Output:

* Daftar hutang.
* Input pembayaran hutang.
* Update sisa hutang.
* Riwayat pembayaran.

## Milestone 6 — Dashboard dan Laporan

Output:

* Dashboard bulan berjalan.
* Laporan bulanan.
* Produk terlaris.
* Total omzet, modal, laba, hutang.

## Milestone 7 — PWA

Output:

* Manifest.
* Service worker.
* App icon.
* Installable.
* Offline fallback.

---

# 20. Prioritas Build

Urutan terbaik:

```text
1. Auth
2. Database + RLS
3. Produk
4. Pelanggan
5. Input transaksi
6. Daftar transaksi
7. Hutang
8. Dashboard
9. Laporan bulanan
10. PWA
```

Jangan mulai dari dashboard dulu. Dashboard membutuhkan data transaksi yang sudah stabil.

---

# 21. Definisi MVP Selesai

MVP dianggap selesai jika admin bisa melakukan proses ini dari HP:

```text
Login
↓
Tambah pelanggan
↓
Tambah produk kuota
↓
Input transaksi
↓
Tandai lunas / hutang / sebagian
↓
Lihat transaksi bulan ini
↓
Lihat total penghasilan
↓
Lihat daftar hutang
↓
Catat pembayaran hutang
↓
Pasang website ke home screen sebagai PWA
```

---

# 22. Catatan Produk Penting

Produk ini sebaiknya tidak menyebut hutang sebagai “hutang pelanggan” di semua tempat jika ingin terdengar lebih profesional. Di UI bisa memakai istilah:

```text
Piutang
Belum Dibayar
Sisa Pembayaran
Tagihan
```

Namun untuk pengguna internal, istilah **Hutang** tetap boleh dipakai karena lebih mudah dipahami.

Rekomendasi label UI:

| Internal     | UI Lebih Rapi         |
| ------------ | --------------------- |
| Hutang       | Belum Dibayar         |
| Piutang      | Sisa Tagihan          |
| Bayar hutang | Catat Pembayaran      |
| Orang hutang | Pelanggan Belum Lunas |

---

# 23. Kesimpulan PRD

Produk yang akan dibuat adalah **PWA mobile-first untuk pencatatan transaksi kuota dan monitoring pembayaran**. Fokus MVP bukan pada pemantauan sisa kuota, tetapi pada:

```text
Transaksi
Penghasilan bulanan
Uang diterima
Laba
Hutang / belum dibayar
Riwayat pembayaran
```

Stack yang direkomendasikan:

```text
React + React Router v7 + Supabase + PWA + tailwindcssV4
```