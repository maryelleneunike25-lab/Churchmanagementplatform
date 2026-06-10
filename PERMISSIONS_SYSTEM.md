# 🔐 Permissions System - User Management

## 📋 Overview

Sistem permissions yang lengkap untuk Super Admin mengelola akses admin dengan granular control.

## 🎯 Fitur Utama

### 1. **User Management (Super Admin Only)**
- ✅ Lihat semua user (approved, pending, suspended)
- ✅ Edit data user (nama, email, role, church branch)
- ✅ Ubah permissions per user
- ✅ Suspend/Activate user
- ✅ Approve/Reject pending users

### 2. **Granular Permissions**

Setiap admin dapat dikonfigurasi permissions-nya:

| Permission | Deskripsi |
|------------|-----------|
| `viewDashboard` | Akses ke dashboard overview |
| `viewJemaat` | Lihat data jemaat |
| `editJemaat` | Edit data jemaat |
| `deleteJemaat` | Hapus data jemaat |
| `viewAbsensi` | Lihat data absensi |
| `manageAbsensi` | Kelola absensi (create QR, scan) |
| `viewKomsel` | Lihat data komsel |
| `editKomsel` | Edit data komsel |
| `viewKeuangan` | Lihat data keuangan |
| `editKeuangan` | Edit transaksi keuangan |
| `viewInventaris` | Lihat data inventaris |
| `editInventaris` | Edit data inventaris |
| `viewReports` | Akses ke reports & analytics |

### 3. **Role-Based Access**

#### **Super Admin**
- ✅ Full access ke semua menu
- ✅ Akses ke User Management
- ✅ Akses ke Pending Approvals
- ✅ Tidak bisa suspend diri sendiri
- ✅ Tidak bisa ubah role sendiri

#### **Admin**
- ✅ Akses sesuai permissions yang diberikan
- ❌ Tidak bisa akses User Management
- ❌ Tidak bisa approve user baru
- ✅ Menu tampil/hilang otomatis sesuai permissions

## 🚀 Cara Menggunakan

### **1. Login sebagai Super Admin**
```
Role: Super Admin
Email: (yang sudah approved)
```

### **2. Buka Tab "User Management"**
Tab ini hanya visible untuk Super Admin.

### **3. Kelola User**

#### **Edit User Details**
1. Klik tombol **"Edit"** pada user yang ingin diubah
2. Update nama, email, role, atau church branch
3. Klik **"Simpan"**

#### **Edit Permissions**
1. Klik tombol **"Permissions"** pada user admin
2. Centang/uncheck permissions yang ingin diberikan/dicabut
3. Klik **"Simpan Permissions"**

#### **Suspend User**
1. Klik tombol **"Suspend"** pada user yang approved
2. Konfirmasi action
3. User tidak bisa login lagi (status: suspended)

#### **Activate User**
1. Klik tombol **"Activate"** pada user yang suspended
2. User bisa login kembali (status: approved)

## 📊 Database Schema

### User Profile dengan Permissions
```typescript
{
  id: string,
  email: string,
  name: string,
  role: "super_admin" | "admin",
  status: "pending" | "approved" | "suspended" | "rejected",
  churchBranchId: string,
  permissions: {
    viewDashboard: boolean,
    viewJemaat: boolean,
    editJemaat: boolean,
    deleteJemaat: boolean,
    viewAbsensi: boolean,
    manageAbsensi: boolean,
    viewKomsel: boolean,
    editKomsel: boolean,
    viewKeuangan: boolean,
    editKeuangan: boolean,
    viewInventaris: boolean,
    editInventaris: boolean,
    viewReports: boolean
  },
  createdAt: string,
  updatedAt: string,
  updatedBy?: string,
  statusChangedBy?: string,
  statusChangedAt?: string
}
```

## 🔧 API Endpoints

### **GET** `/admin/users`
Mendapatkan semua user (Super Admin only)

### **GET** `/admin/approved-users`
Mendapatkan user yang sudah approved saja

### **PUT** `/admin/users/:userId`
Update user details (nama, email, role, church branch)

### **PUT** `/admin/users/:userId/permissions`
Update permissions user
```json
{
  "permissions": {
    "viewJemaat": true,
    "editJemaat": false,
    ...
  }
}
```

### **PUT** `/admin/users/:userId/status`
Update status user (approved/suspended)
```json
{
  "status": "suspended"
}
```

## 💡 Use Cases

### **Use Case 1: Admin Khusus Data Jemaat**
```
Permissions:
✅ viewDashboard: true
✅ viewJemaat: true
✅ editJemaat: true
❌ deleteJemaat: false
❌ viewKeuangan: false
❌ viewInventaris: false
```
**Result:** User hanya bisa lihat & edit data jemaat, tidak bisa hapus atau akses menu lain.

### **Use Case 2: Admin Keuangan**
```
Permissions:
✅ viewDashboard: true
✅ viewKeuangan: true
✅ editKeuangan: true
❌ viewJemaat: false
❌ viewInventaris: false
```
**Result:** User hanya bisa kelola keuangan, tidak bisa akses data jemaat.

### **Use Case 3: Admin View-Only**
```
Permissions:
✅ viewDashboard: true
✅ viewJemaat: true
✅ viewAbsensi: true
✅ viewKomsel: true
❌ editJemaat: false
❌ manageAbsensi: false
❌ editKomsel: false
```
**Result:** User bisa lihat semua data tapi tidak bisa edit apapun.

### **Use Case 4: Suspend Admin Sementara**
```
Action: Klik "Suspend" pada user
Status: approved → suspended
```
**Result:** User tidak bisa login, semua akses dicabut sementara. Bisa di-activate kembali kapan saja.

## 🎯 Best Practices

### **1. Principle of Least Privilege**
- Berikan permissions minimal yang dibutuhkan
- Jangan berikan full access kecuali benar-benar perlu
- Review permissions secara berkala

### **2. Segregation of Duties**
- Pisahkan akses keuangan dan data jemaat
- Admin yang input data ≠ Admin yang approve
- Audit log untuk tracking perubahan

### **3. Regular Review**
- Review approved users secara berkala
- Suspend user yang sudah tidak aktif
- Update permissions sesuai tanggung jawab baru

### **4. Security**
- Jangan share credentials Super Admin
- Gunakan email unik per user
- Monitor audit logs untuk aktivitas mencurigakan

## 🔍 Audit Trail

Semua perubahan tercatat di audit log:

```typescript
// Permission update
{
  action: "permissions_updated",
  adminId: "xxx",
  targetUserId: "yyy",
  permissions: {...},
  timestamp: "2026-06-09T..."
}

// Status change
{
  action: "user_status_changed",
  adminId: "xxx",
  targetUserId: "yyy",
  oldStatus: "approved",
  newStatus: "suspended",
  timestamp: "2026-06-09T..."
}

// User update
{
  action: "user_updated",
  adminId: "xxx",
  targetUserId: "yyy",
  updates: {...},
  timestamp: "2026-06-09T..."
}
```

## ⚠️ Troubleshooting

### **Menu tidak muncul untuk admin**
**Penyebab:** Permissions belum diset
**Solusi:** Super Admin update permissions untuk user tersebut

### **User tidak bisa login setelah approved**
**Penyebab:** Status mungkin suspended
**Solusi:** Super Admin cek status user, activate jika suspended

### **Error "Access denied: Super Admin only"**
**Penyebab:** User bukan Super Admin mencoba akses restricted menu
**Solusi:** Login dengan Super Admin atau minta Super Admin berikan permissions

## 🚀 Deployment

**WAJIB: Deploy ulang Edge Function setelah update!**

1. Klik Settings (⚙️)
2. Scroll ke "Supabase"
3. Klik "Redeploy"
4. Tunggu "deployed successfully"
5. Refresh aplikasi

---

**SISTEM PERMISSIONS SUDAH SIAP DIGUNAKAN!** 🎉

Super Admin sekarang memiliki kontrol penuh untuk mengelola akses semua admin dengan granular permissions.
