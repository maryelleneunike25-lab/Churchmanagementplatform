# 🚀 Instruksi Deployment - WAJIB DIBACA!

## ⚠️ Error: "Missing authorization header"

Jika Anda mendapatkan error ini, berarti **Supabase Edge Function belum di-deploy**.

## ✅ Cara Deploy (LANGKAH WAJIB):

### 1️⃣ Buka Settings
- Klik **ikon Settings (⚙️)** di toolbar Make
- Atau tekan shortcut keyboard

### 2️⃣ Cari Section Supabase
- Scroll ke bawah hingga menemukan section **"Supabase"**
- Di sini Anda akan melihat informasi koneksi Supabase

### 3️⃣ Deploy Edge Function
- Klik tombol **"Deploy Edge Function"** atau **"Redeploy"**
- Tunggu proses deployment (10-30 detik)
- Pastikan muncul notifikasi **"Edge function deployed successfully"**

### 4️⃣ Refresh & Test
- **Refresh halaman aplikasi Anda**
- Coba signup lagi
- Server status seharusnya berubah dari 🔴 Offline menjadi 🟢 Online

## 🔍 Mengapa Deploy Diperlukan?

Edge Function adalah **server backend** yang menjalankan:
- Authentication (signup, login)
- Database operations (CRUD)
- Authorization checks
- API endpoints

Tanpa Edge Function di-deploy, aplikasi hanya memiliki frontend tanpa backend.

## 📝 FAQ

**Q: Berapa kali harus deploy?**
A: **HANYA SATU KALI**. Setelah deploy, Edge Function akan aktif permanen hingga Anda undeploy atau update kode server.

**Q: Kapan perlu deploy ulang?**
A: Hanya jika ada perubahan di file `/supabase/functions/server/index.tsx`

**Q: Bagaimana tahu deploy berhasil?**
A: 
1. Muncul notifikasi "Edge function deployed successfully"
2. Server status badge berubah jadi 🟢 Online
3. Signup/login berfungsi tanpa error

**Q: Deploy gagal, apa yang harus dilakukan?**
A: 
1. Pastikan koneksi internet stabil
2. Pastikan Supabase project sudah terkoneksi
3. Coba deploy ulang
4. Cek logs di Supabase dashboard

## 🎯 Verifikasi Deployment Berhasil

Setelah deploy, cek:
- [ ] Notifikasi sukses muncul
- [ ] Badge server status = 🟢 Online
- [ ] Health check endpoint berfungsi
- [ ] Signup form berfungsi tanpa error

## 🆘 Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| Missing authorization header | Edge Function belum deploy | Deploy dari settings |
| Network error | Edge Function offline | Deploy ulang |
| Server: Offline | Edge Function tidak running | Deploy dari settings |
| 404 Not Found | Route tidak ditemukan | Pastikan deploy terbaru |

## 📞 Masih Error?

1. Buka Browser Console (F12)
2. Screenshot error messages
3. Cek Supabase logs di dashboard
4. Pastikan environment variables ter-set dengan benar

---

**INGAT: Deploy adalah langkah WAJIB sebelum aplikasi bisa digunakan!** 🚀
