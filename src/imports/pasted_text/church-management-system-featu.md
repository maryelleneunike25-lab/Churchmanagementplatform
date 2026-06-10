Kalau mau dibuat lebih profesional untuk **Church Management System (CMS)** dan cocok untuk gereja skala kecil sampai besar, aku sarankan struktur fiturnya seperti ini:

# CHURCH MANAGEMENT SYSTEM

### Web Admin & Mobile Congregation Platform

## 1. Authentication & User Management

### Login System

* Login menggunakan Email & Password
* Registrasi akun admin baru
* Verifikasi email
* Reset password melalui email
* Two-Factor Authentication (OTP Email)

### Approval Admin oleh Super Admin

* Admin mendaftar menggunakan email
* Status akun:

  * Pending Approval
  * Active
  * Suspended
* Super Admin dapat menyetujui atau menolak akun admin

### Data Akun Admin

* Nama lengkap
* Email
* Nomor telepon
* Jabatan
* Gereja cabang
* Status akun
* Tanggal pendaftaran
* Riwayat login

### Role & Permission Management

Super Admin dapat mengatur akses setiap admin secara detail.

Contoh:

| Menu        | Admin A | Admin B |
| ----------- | ------- | ------- |
| Data Jemaat | ✅       | ✅       |
| Keuangan    | ❌       | ✅       |
| Inventaris  | ❌       | ✅       |
| Absensi     | ✅       | ✅       |
| Komsel      | ✅       | ❌       |
| Pelayan     | ❌       | ✅       |

Permission:

* View
* Create
* Edit
* Delete
* Export

---

# 2. Multi Portal System

### Website Jemaat

Contoh:

**gbijelambartimur.com**

Fitur:

* Berita gereja
* Jadwal ibadah
* Jadwal pelayanan
* Jadwal komsel
* Renungan harian
* Pengumuman
* Event gereja
* Form pendaftaran baptisan
* Form pendaftaran pelayanan
* Form permohonan doa

---

### Portal Admin

**gbijelambartimur.com/admin**

Fitur:

* Dashboard Admin
* Data Jemaat
* Absensi
* Komsel
* Pelayan
* Keuangan
* Inventaris
* Laporan

---

### Portal Super Admin

**gbijelambartimur.com/superadmin**

Akses penuh seluruh sistem:

* Semua data gereja
* Semua akun admin
* Permission management
* Audit log
* Backup database

---

# 3. Master Data Jemaat

### Data Identitas Jemaat

* Nomor Anggota Gereja
* Nama Lengkap
* Nama Panggilan
* Jenis Kelamin
* Tempat Lahir
* Tanggal Lahir
* Umur otomatis
* Status Pernikahan
* Golongan Darah
* Foto Profil

### Data Kontak

* Nomor HP
* Email
* Alamat
* Kota
* Kecamatan
* Kelurahan

### Data Rohani

* Status Baptis
* Tanggal Baptis
* Status Sidi/Katekisasi
* Tanggal Sidi
* Status Pernikahan Gereja
* Tanggal Pernikahan Gereja

### Status Jemaat

* Aktif
* Pindah Gereja
* Meninggal Dunia
* Tidak Aktif

---

# 4. Advanced Search & Filter

### Search

* Nama
* Nomor anggota
* Email
* Nomor HP

### Filter

* Komsel
* Pelayan
* Baptis / Belum
* Sidi / Belum
* Menikah / Belum
* Laki-laki / Perempuan
* Aktif / Tidak Aktif
* Umur

### Sorting

* Nama A-Z
* Nama Z-A
* Tanggal Lahir Terbaru
* Tanggal Lahir Terlama
* Tanggal Bergabung
* Umur

---

# 5. Data Komsel Management

### Data Komsel

* Nama Komsel
* Leader
* Co-Leader
* Lokasi
* Hari Pertemuan
* Jam Pertemuan

### Anggota Komsel

Terhubung langsung ke Data Jemaat.

Saat jemaat ditambahkan ke komsel:

* Data otomatis tersinkronisasi
* Tidak perlu input ulang

### Laporan Komsel

* Jumlah anggota
* Kehadiran komsel
* Pertumbuhan anggota

---

# 6. Data Pelayan Gereja

### Kategori Pelayan

* Worship Leader
* Singer
* Music Team
* Multimedia
* Usher
* Doa Syafaat
* Sekolah Minggu
* Sound System
* Kamera
* Livestream
* Admin Gereja

### Data Pelayan

Terhubung langsung dengan database jemaat.

Jika jemaat menjadi pelayan:

* Otomatis muncul di data pelayanan
* Tidak perlu input ulang

---

# 7. Attendance System

### QR Code Attendance

* Ibadah Raya
* Youth Service
* Komsel
* Event Gereja
* Pelayanan

### Attendance Features

* Check In
* Check Out
* Kehadiran bulanan
* Kehadiran tahunan
* Statistik kehadiran

### Manual Attendance

* Checklist jemaat
* Input manual

---

# 8. Church Financial System

### Pemasukan

* Perpuluhan
* Persembahan
* Donasi
* Sponsorship

### Pengeluaran

* Operasional
* Listrik
* Multimedia
* Sosial
* Misi

### Laporan

* Harian
* Bulanan
* Tahunan
* Neraca Keuangan

---

# 9. Church Inventory Management

* Sound System
* Kamera
* Proyektor
* Kursi
* Meja
* Alat Musik
* Komputer
* Multimedia

### Tracking

* Kondisi Barang
* Lokasi Barang
* Riwayat Perbaikan
* Riwayat Peminjaman

---

# 10. Event Management

* Event Gereja
* Seminar
* Retret
* Natal
* Paskah
* KKR
* Camp

### Fitur

* Registrasi peserta
* QR Check In
* Kuota peserta
* Absensi event

---

# 11. Church Announcement System

* News Gereja
* Banner Homepage
* Jadwal Pelayanan
* Jadwal Ibadah
* Renungan Harian
* Pengumuman Mendesak

### Push Notification

* Email Blast
* WhatsApp Notification
* Mobile Notification

---

# 12. Reporting System

### Export

* Excel (.xlsx)
* PDF
* CSV

### Laporan

* Data Jemaat
* Data Komsel
* Data Pelayan
* Kehadiran
* Inventaris
* Keuangan
* Event

---

# 13. Dashboard Analytics

### Dashboard Utama

* Total Jemaat
* Jemaat Aktif
* Jumlah Komsel
* Jumlah Pelayan
* Kehadiran Mingguan
* Kehadiran Bulanan
* Pemasukan Bulan Ini
* Pengeluaran Bulan Ini

### Grafik

* Pertumbuhan Jemaat
* Statistik Kehadiran
* Statistik Keuangan
* Statistik Komsel

---

# 14. Professional Church Features

### Family Tree Jemaat

Menampilkan hubungan:

* Suami
* Istri
* Anak
* Orang Tua

### Follow-Up Jemaat Baru

* Data pengunjung baru
* Follow-up otomatis
* Status pembinaan

### Counseling Management

* Permohonan konseling
* Jadwal konseling
* Riwayat konseling

### Prayer Request

* Permohonan doa jemaat
* Status doa
* Tindak lanjut

### Audit Log

Mencatat seluruh aktivitas admin:

* Login
* Edit data
* Delete data
* Export data

### Backup & Restore

* Backup otomatis harian
* Restore database

### Multi Branch Church

Jika gereja memiliki cabang:

* Cabang A
* Cabang B
* Cabang C

Semua data tetap terpusat dan dapat diatur oleh Super Admin.

Dengan fitur-fitur ini, sistemnya sudah setara dengan Church Management System profesional yang biasa dipakai gereja menengah hingga besar, lengkap dengan role management, data jemaat terintegrasi, komsel, pelayan, attendance, finance, inventory, reporting, dan portal jemaat terpisah dari portal admin.
