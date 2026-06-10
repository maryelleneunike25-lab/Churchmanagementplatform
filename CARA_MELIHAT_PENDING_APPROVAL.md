# 📋 Cara Melihat Pending Approval

## ✅ Fitur Auto-Refresh Sudah Aktif!

Sistem sekarang **otomatis refresh setiap 10 detik** untuk mendeteksi signup baru.

## 🔍 Cara Menggunakan:

### 1️⃣ **Login sebagai Super Admin**
- Hanya **Super Admin** yang bisa melihat pending approvals
- Login dengan akun yang role-nya "Super Admin"

### 2️⃣ **Buka Tab "Pending Approvals"**
- Di dashboard, klik tab **"Pending Approvals"**
- List akan otomatis refresh setiap 10 detik

### 3️⃣ **Manual Refresh (Opsional)**
- Klik tombol **"Refresh"** di kanan atas
- Untuk memaksa reload data langsung

### 4️⃣ **Cek Waktu Last Refresh**
- Di bawah tombol Refresh ada info "Last refresh: HH:MM:SS"
- Ini menunjukkan kapan terakhir data di-load

## 🎯 Troubleshooting:

### ❌ "Access denied: Super Admin only"
**Penyebab:** Anda login dengan role Admin, bukan Super Admin
**Solusi:** Login dengan akun Super Admin

### ❌ List kosong padahal sudah ada yang signup
**Kemungkinan:**

1. **User signup dengan role "Super Admin"**
   - Super Admin tidak masuk pending approval (langsung approved)
   - Hanya role "Admin" yang butuh approval

2. **Edge Function belum di-deploy ulang**
   - Deploy ulang dari Make settings
   - Refresh halaman

3. **Cache browser**
   - Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)

## 📝 Flow Signup & Approval:

```
User Signup (Role: Admin)
    ↓
Data disimpan ke database
    ↓
Status: "pending"
    ↓
Masuk ke "pending_approval:{userId}"
    ↓
Auto-refresh setiap 10 detik
    ↓
Muncul di tab "Pending Approvals"
    ↓
Super Admin approve/reject
    ↓
Status berubah: "approved" atau "rejected"
```

## 🔧 Debug Mode:

Buka **Browser Console (F12)** untuk melihat logs:

```
✅ Pending approvals loaded: 2
✅ Pending approvals count: 2
```

Jika count = 0 tapi seharusnya ada data:
1. Pastikan signup menggunakan role "Admin" (bukan "Super Admin")
2. Pastikan Edge Function sudah di-deploy ulang
3. Cek console untuk error messages

## 💡 Tips:

- **Auto-refresh** berjalan otomatis, tidak perlu klik apa-apa
- **Last refresh time** update setiap kali data di-load
- **Tombol Refresh** untuk force reload kapan saja
- **Console logs** untuk debug jika ada masalah

---

**INGAT: Deploy ulang Edge Function setelah update kode agar perubahan diterapkan!** 🚀
