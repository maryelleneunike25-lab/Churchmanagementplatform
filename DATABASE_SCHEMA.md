# Database Schema - Church Management System

Sistem ini menggunakan Supabase KV Store (Key-Value Store) untuk menyimpan semua data. Berikut adalah struktur data untuk setiap modul:

## 1. User Management

### User Profile
**Key Pattern**: `user:{userId}`

```typescript
{
  id: string;                    // Supabase Auth User ID
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  churchBranchId: string;        // Support multi-branch
  createdAt: string;             // ISO timestamp
  updatedAt: string;
  approvedBy?: string;           // Admin ID who approved
  approvedAt?: string;
}
```

### Pending Approvals
**Key Pattern**: `pending_approval:{userId}`

```typescript
{
  userId: string;
  email: string;
  name: string;
  requestedAt: string;
}
```

## 2. Congregation Management

### Member
**Key Pattern**: `member:{memberId}`

```typescript
{
  id: string;                    // Auto-generated
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;             // YYYY-MM-DD
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  baptismDate?: string;
  familyId?: string;             // For family tree grouping
  status: 'active' | 'inactive' | 'new';
  joinDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;             // User ID
  updatedBy?: string;
}
```

## 3. Attendance Management

### Attendance Event
**Key Pattern**: `attendance:event:{eventId}`

```typescript
{
  id: string;
  name: string;                  // Event name (e.g., "Ibadah Minggu")
  date: string;
  qrCode: string;                // QR code value
  createdBy: string;
  createdAt: string;
}
```

### QR Code Mapping
**Key Pattern**: `attendance:qr:{qrCode}`

```typescript
{
  eventId: string;
  active: boolean;
}
```

### Attendance Record
**Key Pattern**: `attendance:record:{attendanceId}`

```typescript
{
  id: string;
  eventId: string;
  memberId: string;
  timestamp: string;
}
```

### Daily Attendance Summary
**Key Pattern**: `attendance:date:{YYYY-MM-DD}`

```typescript
// Array of attendance records for quick daily stats
[
  {
    id: string;
    eventId: string;
    memberId: string;
    timestamp: string;
  }
]
```

## 4. Komsel (Cell Group) Management

### Komsel
**Key Pattern**: `komsel:{komselId}`

```typescript
{
  id: string;
  name: string;                  // Komsel name
  leader: string;                // Leader name
  day: string;                   // Day of the week
  time: string;                  // Time (HH:MM)
  location: string;              // Meeting location
  memberCount: number;           // Number of members
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
```

## 5. Finance Management

### Transaction
**Key Pattern**: `transaction:{transactionId}`

```typescript
{
  id: string;
  type: 'income' | 'expense';
  category: string;              // e.g., "Persembahan", "Donasi", "Operasional"
  amount: number;                // Amount in IDR
  description: string;
  date: string;                  // Transaction date
  createdBy: string;
  createdAt: string;
}
```

## 6. Inventory Management

### Inventory Item
**Key Pattern**: `inventory:{itemId}`

```typescript
{
  id: string;
  name: string;                  // Item name
  category: string;              // e.g., "Sound System", "Furniture"
  quantity: number;
  unit: string;                  // e.g., "pcs", "set", "unit"
  location: string;              // Storage location
  condition: 'good' | 'needs_repair' | 'broken';
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}
```

## 7. Audit Log

### Audit Log Entry
**Key Pattern**: `audit:{timestamp}:{action_type}`

```typescript
{
  action: string;                // e.g., "user_signin", "member_created"
  userId?: string;
  targetUserId?: string;         // For user-related actions
  memberId?: string;             // For member-related actions
  komselId?: string;             // For komsel-related actions
  itemId?: string;               // For inventory-related actions
  transactionId?: string;        // For finance-related actions
  timestamp: string;
}
```

### Audit Actions
- `user_signup` - New user registration
- `user_signin` - User login
- `user_approved` - Admin approved by Super Admin
- `user_rejected` - Admin rejected by Super Admin
- `member_created` - New member added
- `member_updated` - Member data updated
- `member_deleted` - Member deleted
- `komsel_created` - New komsel created
- `transaction_created` - New financial transaction
- `inventory_item_created` - New inventory item added

## Query Patterns

### Get All Items by Prefix
```typescript
// Get all members
const members = await kv.getByPrefix("member:");

// Get all komsels
const komsels = await kv.getByPrefix("komsel:");

// Get all transactions
const transactions = await kv.getByPrefix("transaction:");

// Get all inventory items
const items = await kv.getByPrefix("inventory:");
```

### Get Single Item
```typescript
// Get specific user
const user = await kv.get(`user:${userId}`);

// Get specific member
const member = await kv.get(`member:${memberId}`);
```

### Set/Update Item
```typescript
// Create or update user
await kv.set(`user:${userId}`, userObject);

// Create or update member
await kv.set(`member:${memberId}`, memberObject);
```

### Delete Item
```typescript
// Delete member
await kv.del(`member:${memberId}`);

// Delete multiple items
await kv.mdel([`member:${id1}`, `member:${id2}`]);
```

## Data Persistence

- ✅ All data is stored in Supabase PostgreSQL database via KV Store
- ✅ Data persists permanently across sessions
- ✅ Automatic timestamps for created/updated records
- ✅ User tracking for all data modifications
- ✅ Audit log for compliance and tracking

## Backup & Recovery

Semua data tersimpan di Supabase database yang memiliki:
- Automatic backups
- Point-in-time recovery
- High availability
- Data encryption

## Performance Considerations

- KV Store menggunakan JSONB untuk menyimpan data
- Index otomatis pada key untuk query cepat
- Prefix search (`getByPrefix`) efisien untuk listing data
- Data cached di memory untuk performa optimal

## Future Enhancements

Untuk scale yang lebih besar, pertimbangkan:
1. Migrasi ke tabel relasional Supabase untuk query kompleks
2. Implementasi full-text search untuk pencarian jemaat
3. Real-time subscriptions untuk collaborative features
4. File storage untuk foto jemaat dan dokumen

---

**Database Schema Version**: 1.0
**Last Updated**: 2026-06-09
