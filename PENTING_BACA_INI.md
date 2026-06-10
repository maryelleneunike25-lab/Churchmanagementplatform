# ⚠️ PENTING: DEPLOYMENT WORKFLOW

## 🔄 Kapan Harus Deploy Ulang?

**SETIAP KALI** ada perubahan di file server (`/supabase/functions/server/index.tsx`), Anda HARUS deploy ulang!

### Contoh Situasi:
1. ✅ Saya fix bug di kode server → **DEPLOY ULANG**
2. ✅ Saya tambah endpoint baru → **DEPLOY ULANG**
3. ✅ Saya update error handling → **DEPLOY ULANG**
4. ❌ Perubahan frontend saja → Tidak perlu deploy

## 📝 Cara Deploy Ulang:

1. Klik **Settings (⚙️)** di toolbar Make
2. Scroll ke section **"Supabase"**
3. Klik **"Redeploy Edge Function"** atau **"Deploy"**
4. Tunggu notifikasi **"deployed successfully"**
5. **REFRESH HALAMAN** aplikasi Anda
6. Test lagi

## ❌ Error "Missing authorization header"

Error ini berarti:
- Edge Function belum di-deploy SAMA SEKALI, ATAU
- Kode lama masih running (belum deploy ulang setelah update)

**SOLUSI:** Deploy (ulang) Edge Function!

## 🎯 Verifikasi Deploy Berhasil:

Setelah deploy, cek di console browser (F12):
```
✅ Server health check SUCCESS: { status: "ok", ... }
✅ Signup attempt: { email: "...", role: "..." }
```

Jika masih error:
```
❌ Server health check FAILED: 401
❌ Missing authorization header
```
→ Berarti deploy belum berhasil atau kode lama masih running.

## 💡 Tips:

- **Hard refresh:** Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)
- **Clear cache** jika masih error setelah deploy
- **Tunggu 10-30 detik** setelah deploy sebelum test
- **Cek notifikasi** "deployed successfully" sebelum test

---

**INGAT: Deploy ≠ Save. Save hanya simpan kode, Deploy menjalankan kode di server!** 🚀
