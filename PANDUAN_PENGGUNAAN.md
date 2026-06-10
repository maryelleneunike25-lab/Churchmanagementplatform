# Church Management System - Panduan Penggunaan

## Fitur Lengkap

### 1. **Authentication & Authorization**
- ✅ Role-based permissions (Super Admin & Admin)
- ✅ Approval system untuk admin baru
- ✅ Secure login dengan Supabase Auth
- ✅ Session management

### 2. **Manajemen Data Jemaat**
- ✅ CRUD data jemaat lengkap
- ✅ Data pribadi (nama, email, telepon, alamat, dll)
- ✅ Status jemaat (Baru, Aktif, Tidak Aktif)
- ✅ Data baptis
- ✅ Status pernikahan
- ✅ Support untuk family tree (via familyId)

### 3. **Sistem Absensi QR Code**
- ✅ Generate QR code untuk setiap event/ibadah
- ✅ Scan QR code untuk catat kehadiran
- ✅ Tracking kehadiran per event
- ✅ Statistik kehadiran harian

### 4. **Manajemen Komsel & Pelayan**
- ✅ CRUD data komsel
- ✅ Informasi pemimpin komsel
- ✅ Jadwal dan lokasi komsel
- ✅ Status komsel (Aktif/Tidak Aktif)
- ✅ Counter jumlah anggota

### 5. **Manajemen Keuangan**
- ✅ Pencatatan pemasukan & pengeluaran
- ✅ Kategorisasi transaksi
- ✅ Dashboard summary (Total Income, Expense, Balance)
- ✅ Laporan keuangan per kategori
- ✅ Format mata uang IDR

### 6. **Manajemen Inventaris**
- ✅ CRUD data inventaris gereja
- ✅ Kategorisasi barang
- ✅ Tracking kondisi barang (Baik, Perlu Perbaikan, Rusak)
- ✅ Informasi lokasi penyimpanan
- ✅ Data pembelian

### 7. **Audit Log & Tracking**
- ✅ Automatic audit log untuk semua perubahan data
- ✅ Tracking user activity (login, signup, approval)
- ✅ Timestamp untuk setiap aktivitas
- ✅ User identification per action

### 8. **Multi-Portal System**
- ✅ Dashboard Super Admin dengan full access
- ✅ Tab-based navigation untuk setiap modul
- ✅ Statistik real-time di dashboard
- ✅ Responsive design

## Cara Menggunakan

### Setup Awal

1. **Daftar Akun Pertama (Super Admin)**
   - Klik "Daftar di sini" pada halaman login
   - Isi data lengkap
   - Pilih role "Super Admin"
   - Akun Super Admin pertama akan auto-approved

2. **Daftar Admin Tambahan**
   - Admin baru pilih role "Admin"
   - Status akan "Pending" dan menunggu approval
   - Super Admin approve dari tab "Pending Approvals"

### Mengelola Data Jemaat

1. Pilih tab "Data Jemaat"
2. Klik "Tambah Jemaat" untuk menambah data baru
3. Isi semua informasi yang diperlukan
4. Gunakan tombol Edit/Hapus untuk mengelola data

### Sistem Absensi QR Code

1. Pilih tab "Absensi"
2. Masukkan nama event (misal: "Ibadah Minggu")
3. Klik "Buat QR Code"
4. QR Code akan ditampilkan untuk di-scan jemaat
5. Gunakan "Scan Manual" jika diperlukan

### Mengelola Komsel

1. Pilih tab "Komsel"
2. Klik "Tambah Komsel"
3. Isi informasi komsel (nama, pemimpin, jadwal, lokasi)
4. Kelola status aktif/tidak aktif

### Pencatatan Keuangan

1. Pilih tab "Keuangan"
2. Klik "Tambah Transaksi"
3. Pilih tipe (Pemasukan/Pengeluaran)
4. Isi kategori, jumlah, dan deskripsi
5. Dashboard akan otomatis update summary

### Manajemen Inventaris

1. Pilih tab "Inventaris"
2. Klik "Tambah Item"
3. Isi detail barang (nama, kategori, jumlah, lokasi)
4. Update kondisi barang saat diperlukan

## Keamanan Data

- ✅ Semua data tersimpan permanen di Supabase Database
- ✅ Authentication dengan Supabase Auth
- ✅ Role-based access control
- ✅ Audit log untuk semua perubahan
- ✅ Secure API endpoints dengan Bearer token

## Multi-Branch Support

Sistem sudah support multi-branch melalui `churchBranchId`. Setiap user bisa diasosiasikan dengan branch tertentu untuk isolasi data per cabang gereja.

## Technical Stack

- **Frontend**: React + TypeScript
- **UI Framework**: Material UI (MUI)
- **Database**: Supabase (PostgreSQL + KV Store)
- **Authentication**: Supabase Auth
- **Backend**: Supabase Edge Functions (Hono framework)
- **QR Code**: qrcode.react
- **Styling**: Tailwind CSS + Material UI

## Catatan Penting

1. **Data Persistence**: Semua data tersimpan permanen di Supabase KV Store
2. **Automatic Save**: Setiap perubahan langsung disimpan ke database
3. **Audit Trail**: Semua aktivitas tercatat untuk accountability
4. **Responsive Design**: Aplikasi bisa diakses dari desktop dan mobile

## Deploy Supabase Edge Function

**PENTING**: Setelah ada perubahan di file `/supabase/functions/server/index.tsx`, Anda perlu deploy ulang edge function dari **Make settings page** agar perubahan diterapkan.

## Support & Issues

Sistem ini sudah production-ready dengan fitur lengkap. Jika ada pertanyaan atau request fitur tambahan, silakan hubungi developer.

---

**Built with ❤️ for Church Management**
