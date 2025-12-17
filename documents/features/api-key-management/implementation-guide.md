# API Key Management - Hướng Dẫn Triển Khai Toàn Diện

## [object Object]ục Lục

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [API Endpoints Chi Tiết](#api-endpoints-chi-tiết)
4. [Vai Trò & Quyền Hạn](#vai-trò--quyền-hạn)
5. [Thiết Kế UI/UX](#thiết-kế-uiux)
6. [Luồng Dữ Liệu](#luồng-dữ-liệu)
7. [Bảo Mật & Xác Thực](#bảo-mật--xác-thực)
8. [Hướng Dẫn Triển Khai](#hướng-dẫn-triển-khai)

---

## 🎯 Tổng Quan

### Mục Tiêu Module

Module API Key Management cung cấp:

- ✅ **Quản lý API Keys**: Tạo, xem, sửa, xóa API keys
- ✅ **Phân Quyền**: Scoped permissions per API key
- ✅ **Bảo Mật**: IP whitelist, expiration dates, key hashing
- ✅ **Theo Dõi**: Usage tracking, audit logs
- ✅ **Vai Trò**: Admin và User roles với quyền hạn khác nhau
- ✅ **Giao Diện**: UI/UX đồng nhất với hệ thống hiện tại

### Đối Tượng Người Dùng

1. **Admin**: Quản lý tất cả API keys của tất cả users
2. **User**: Quản lý API keys của chính mình

---

## 🏗️ Kiến Trúc Hệ Thống

### Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages: AdminApiKeysPage, UserApiKeysPage           │   │
│  │  Components: ApiKeyTable, ApiKeyForm, ApiKeyDetail  │   │
│  │  Hooks: useAdminApiKeys, useUserApiKeys             │   │
│  │  Services: apiKeysService                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Router                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /admin/api-keys (Admin endpoints)                  │   │
│  │  /api-keys (User endpoints)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Elysia/Bun)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers:                                        │   │
│  │  - ApiKeysAdminController                           │   │
│  │  - ApiKeysUserController                            │   │
│  │  - ApiKeyUsageAdminController                       │   │
│  │  - ApiKeyUsageUserController                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services:                                           │   │
│  │  - ApiKeyService (CRUD, validation)                 │   │
│  │  - ApiKeyAuthService (authentication)               │   │
│  │  - ApiKeyUsageService (tracking)                    │   │
│  │  - ApiKeyValidationService (validation)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware:                                         │   │
│  │  - apiKeyAuthMiddleware                             │   │
│  │  - apiKeyUsageLoggerMiddleware                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Prisma)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Models:                                             │   │
│  │  - ApiKey                                            │   │
│  │  - ApiKeyUsage                                       │   │
│  │  - AuditLog (for security events)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cache Layer (Redis):                               │   │
│  │  - API key validation cache                         │   │
│  │  - Usage statistics cache                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```prisma
enum ApiKeyStatus {
  active
  revoked
  expired
}

model ApiKey {
  id          String       @id @default(cuid())
  userId      String
  name        String       @db.VarChar(255)
  key         String       @unique  // Hash của (api_key + pepper)
  keyPrefix   String       // First 8 + last 4 chars
  status      ApiKeyStatus @default(active)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  permissions Json?        // Scoped permissions array
  ipWhitelist String[]?    // IP addresses
  metadata    Json?        // Additional metadata
  created     DateTime     @default(now())
  modified    DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  usage ApiKeyUsage[]

  @@index([userId])
  @@index([status])
  @@index([keyPrefix])
  @@map("api_keys")
}

model ApiKeyUsage {
  id        String   @id @default(cuid())
  apiKeyId  String
  endpoint  String
  method    String
  ip        String
  userAgent String?
  statusCode Int
  timestamp DateTime @default(now())

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@index([apiKeyId])
  @@index([timestamp])
  @@map("api_key_usages")
}
```

---

## 📡 API Endpoints Chi Tiết

### 1. Admin Endpoints - `/admin/api-keys`

#### 1.1 Liệt Kê Tất Cả API Keys

```http
GET /admin/api-keys?take=20&skip=0&userId=<user_id>&status=active&search=<keyword>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả |
|---------|------|----------|-------|
| `take` | number | ❌ | Số lượng items (default: 20, max: 100) |
| `skip` | number | ❌ | Offset (default: 0) |
| `userId` | string | ❌ | Lọc theo user ID |
| `userIds` | string[] | ❌ | Lọc theo nhiều user IDs |
| `status` | enum | ❌ | Lọc theo trạng thái (active/revoked/expired) |
| `search` | string | ❌ | Tìm kiếm theo tên API key |
| `created0` | date | ❌ | Ngày tạo từ |
| `created1` | date | ❌ | Ngày tạo đến |

**Response:**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_123456",
        "userId": "user_123",
        "name": "Production API Key",
        "keyPrefix": "sk_live_xxxx...xxxx",
        "status": "active",
        "permissions": ["USER.VIEW", "FILE.UPLOAD"],
        "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
        "lastUsedAt": "2025-12-17T10:00:00Z",
        "expiresAt": "2026-12-17T00:00:00Z",
        "created": "2025-01-01T00:00:00Z",
        "modified": "2025-12-17T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

**Status Codes:**

- `200` - OK
- `400` - Invalid parameters
- `403` - Permission denied
- `401` - Unauthorized

**Permissions Required:**

- `API_KEY.VIEW` - View own keys
- `API_KEY.VIEW_ALL` - View all keys

---

#### 1.2 Xem Chi Tiết API Key

```http
GET /admin/api-keys/:id
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456",
    "userId": "user_123",
    "name": "Production API Key",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"],
    "ipWhitelist": ["192.168.1.1"],
    "lastUsedAt": "2025-12-17T10:00:00Z",
    "expiresAt": "2026-12-17T00:00:00Z",
    "metadata": {
      "environment": "production",
      "description": "Main API key for production"
    },
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "usage": {
      "totalRequests": 1250,
      "lastUsedAt": "2025-12-17T10:00:00Z"
    },
    "created": "2025-01-01T00:00:00Z",
    "modified": "2025-12-17T10:00:00Z"
  }
}
```

**Permissions Required:**

- `API_KEY.VIEW` - View own keys
- `API_KEY.VIEW_ALL` - View all keys

---

#### 1.3 Tạo API Key

```http
POST /admin/api-keys?userId=<user_id>
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả |
|---------|------|----------|-------|
| `userId` | string | ❌ | User ID (nếu không có, tạo cho user hiện tại) |

**Request Body:**

```json
{
  "name": "Production API Key",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD"],
  "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
  "metadata": {
    "environment": "production",
    "description": "Main API key for production"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456",
    "name": "Production API Key",
    "key": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "expiresAt": "2026-12-17T00:00:00Z",
    "created": "2025-12-17T10:00:00Z"
  }
}
```

**⚠️ Lưu Ý:** Full key chỉ được trả về một lần khi tạo. User phải lưu key này vì không thể lấy lại sau.

**Permissions Required:**

- `API_KEY.UPDATE` - Create keys for self
- `API_KEY.UPDATE_ALL` - Create keys for others

---

#### 1.4 Cập Nhật API Key

```http
POST /admin/api-keys/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Updated API Key Name",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
  "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
  "metadata": {
    "environment": "production"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456",
    "userId": "user_123",
    "name": "Updated API Key Name",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
    "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
    "expiresAt": "2026-12-17T00:00:00Z",
    "modified": "2025-12-17T10:00:00Z"
  }
}
```

**Permissions Required:**

- `API_KEY.UPDATE` - Update own keys
- `API_KEY.UPDATE_ALL` - Update all keys

---

#### 1.5 Xóa API Keys (Bulk)

```http
POST /admin/api-keys/del
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "ids": ["ak_123456", "ak_789012"]
}
```

**Response:**

```json
{
  "success": true,
  "data": null
}
```

**Permissions Required:**

- `API_KEY.DELETE` - Delete own keys
- `API_KEY.DELETE_ALL` - Delete all keys

---

### 2. User Endpoints - `/api-keys`

#### 2.1 Liệt Kê API Keys Của User

```http
GET /api-keys?take=20&skip=0&status=active&search=<keyword>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả |
|---------|------|----------|-------|
| `take` | number | ❌ | Số lượng items (default: 20, max: 100) |
| `skip` | number | ❌ | Offset (default: 0) |
| `status` | enum | ❌ | Lọc theo trạng thái (active/revoked/expired) |
| `search` | string | ❌ | Tìm kiếm theo tên API key |

**Response:**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_123456",
        "userId": "user_123",
        "name": "My API Key",
        "keyPrefix": "sk_live_xxxx...xxxx",
        "status": "active",
        "permissions": ["USER.VIEW", "FILE.UPLOAD"],
        "ipWhitelist": ["192.168.1.1"],
        "lastUsedAt": "2025-12-17T10:00:00Z",
        "expiresAt": "2026-12-17T00:00:00Z",
        "created": "2025-01-01T00:00:00Z",
        "modified": "2025-12-17T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

#### 2.2 Xem Chi Tiết API Key

```http
GET /api-keys/:id
Authorization: Bearer <jwt_token>
```

**Response:** (Tương tự admin endpoint)

---

#### 2.3 Tạo API Key

```http
POST /api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "My API Key",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD"],
  "ipWhitelist": ["192.168.1.1"],
  "metadata": {
    "description": "My personal API key"
  }
}
```

**Response:** (Tương tự admin endpoint)

---

#### 2.4 Cập Nhật API Key

```http
POST /api-keys/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:** (Tương tự admin endpoint)

---

#### 2.5 Xóa API Keys

```http
POST /api-keys/del
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "ids": ["ak_123456"]
}
```

---

### 3. Usage Endpoints

#### 3.1 Lấy Thống Kê Sử Dụng

```http
GET /admin/api-keys/:id/usage?startDate=<date>&endDate=<date>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả |
|---------|------|----------|-------|
| `startDate` | date | ❌ | Ngày bắt đầu (ISO 8601) |
| `endDate` | date | ❌ | Ngày kết thúc (ISO 8601) |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRequests": 1250,
    "requestsPerDay": [
      {
        "date": "2025-12-17",
        "count": 150
      },
      {
        "date": "2025-12-16",
        "count": 200
      }
    ],
    "lastUsedAt": "2025-12-17T10:00:00Z",
    "topEndpoints": [
      {
        "endpoint": "/api/users",
        "count": 500
      },
      {
        "endpoint": "/api/files",
        "count": 300
      }
    ]
  }
}
```

---

#### 3.2 Lấy Lịch Sử Sử Dụng

```http
GET /admin/api-keys/:id/usage/history?take=20&skip=0
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "timestamp": "2025-12-17T10:00:00Z",
        "endpoint": "/api/users",
        "method": "GET",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "statusCode": 200
      }
    ],
    "count": 1250
  }
}
```

---

## 👥 Vai Trò & Quyền Hạn

### Permission Matrix

| Permission | Admin | User | Mô Tả |
|-----------|-------|------|-------|
| `API_KEY.VIEW` | ✅ | ✅ | Xem API keys của chính mình |
| `API_KEY.VIEW_ALL` | ✅ | ❌ | Xem tất cả API keys |
| `API_KEY.CREATE` | ✅ | ✅ | Tạo API keys |
| `API_KEY.UPDATE` | ✅ | ✅ | Cập nhật API keys của chính mình |
| `API_KEY.UPDATE_ALL` | ✅ | ❌ | Cập nhật tất cả API keys |
| `API_KEY.DELETE` | ✅ | ✅ | Xóa API keys của chính mình |
| `API_KEY.DELETE_ALL` | ✅ | ❌ | Xóa tất cả API keys |

### Access Control Rules

```typescript
// Admin có thể:
- Xem tất cả API keys (API_KEY.VIEW_ALL)
- Tạo API keys cho bất kỳ user nào
- Cập nhật bất kỳ API key nào
- Xóa bất kỳ API key nào
- Xem usage statistics của bất kỳ key nào

// User có thể:
- Xem API keys của chính mình (API_KEY.VIEW)
- Tạo API keys cho chính mình
- Cập nhật API keys của chính mình (API_KEY.UPDATE)
- Xóa API keys của chính mình (API_KEY.DELETE)
- Xem usage statistics của keys của chính mình
```

---

## 🎨 Thiết Kế UI/UX

### 1. Admin API Keys Page

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  API Key Management (Admin)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [+ Create API Key]  [Filters ▼]  [Search...]  [Refresh]   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filters:                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Status: [All ▼]  User: [Search ▼]  Date: [▼]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Name          │ User      │ Status  │ Last Used │ ... │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Prod Key      │ John Doe  │ Active  │ 2 min ago │ ... │   │
│  │ Dev Key       │ Jane Doe  │ Revoked │ Never    │ ... │   │
│  │ Test Key      │ Admin     │ Active  │ 1 hour   │ ... │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Showing 1-20 of 50  [< 1 2 3 >]                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Columns

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| Name | Text | Tên API key |
| User | Select | Người dùng sở hữu |
| Status | Tag | Trạng thái (Active/Revoked/Expired) |
| Last Used | Date | Lần sử dụng cuối cùng |
| Expires | Date | Ngày hết hạn |
| Actions | Button | Xem, Sửa, Xóa |

#### Filters

```
┌─────────────────────────────────────────────────────────┐
│ Status Filter:                                          │
│ ○ All  ○ Active  ○ Revoked  ○ Expired                 │
│                                                         │
│ User Filter:                                            │
│ [Search user...] (Select multiple)                     │
│                                                         │
│ Date Range:                                             │
│ From: [Date Picker]  To: [Date Picker]                │
│                                                         │
│ [Apply Filters] [Reset]                               │
└─────────────────────────────────────────────────────────┘
```

#### Actions

- **Create**: Mở modal tạo API key mới
- **View**: Xem chi tiết API key
- **Edit**: Sửa API key
- **Delete**: Xóa API key (confirm dialog)
- **Bulk Delete**: Chọn nhiều keys và xóa cùng lúc

---

### 2. Create/Edit API Key Modal

#### Create Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Create API Key                                      [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ User (Admin only):                                          │
│ [Search user...] ⓘ                                          │
│                                                               │
│ Name: *                                                      │
│ [Production API Key________________]                        │
│                                                               │
│ Expires At:                                                  │
│ [Date Picker] ⓘ (Optional)                                  │
│                                                               │
│ Permissions:                                                 │
│ ☐ USER.VIEW                                                 │
│ ☐ USER.UPDATE                                               │
│ ☐ FILE.UPLOAD                                               │
│ ☐ FILE.DOWNLOAD                                             │
│ ☐ FILE.DELETE                                               │
│ [Select All] [Clear All]                                   │
│                                                               │
│ IP Whitelist:                                               │
│ [192.168.1.1, 10.0.0.0/8] ⓘ                                │
│ [Add IP] [Remove]                                          │
│                                                               │
│ Metadata (Optional):                                        │
│ [{"environment": "production"}]                            │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Cancel]                          [Create API Key]   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Edit Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Edit API Key                                        [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Key Prefix: sk_live_xxxx...xxxx (Read-only)                │
│                                                               │
│ Name: *                                                      │
│ [Updated API Key Name_____________]                        │
│                                                               │
│ Status: Active ⓘ (Cannot change - use revoke instead)      │
│                                                               │
│ Expires At:                                                  │
│ [Date Picker] ⓘ                                             │
│                                                               │
│ Permissions:                                                 │
│ ☐ USER.VIEW                                                 │
│ ☐ USER.UPDATE                                               │
│ ☐ FILE.UPLOAD                                               │
│ ☐ FILE.DOWNLOAD                                             │
│ ☐ FILE.DELETE                                               │
│                                                               │
│ IP Whitelist:                                               │
│ [192.168.1.1, 10.0.0.0/8]                                  │
│ [Add IP] [Remove]                                          │
│                                                               │
│ Metadata:                                                    │
│ [{"environment": "production"}]                            │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Cancel]  [Delete]  [Revoke]  [Save Changes]        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Form Fields

| Field | Kiểu | Bắt Buộc | Validation | Mô Tả |
|-------|------|----------|-----------|-------|
| User | Select | ❌ | - | Chỉ admin có thể chọn |
| Name | Text | ✅ | 1-255 chars | Tên API key |
| Expires At | Date | ❌ | Future date | Ngày hết hạn |
| Permissions | Checkbox | ❌ | - | Scoped permissions |
| IP Whitelist | Array | ❌ | Valid IPs | IP addresses |
| Metadata | JSON | ❌ | Valid JSON | Metadata tùy chỉnh |

---

### 3. API Key Detail Page

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ API Key Details                                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [< Back]  [Edit]  [Delete]  [Revoke]  [Regenerate]        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Basic Information:                                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Name: Production API Key                             │   │
│ │ Key Prefix: sk_live_xxxx...xxxx                      │   │
│ │ Status: Active [●]                                   │   │
│ │ Owner: John Doe (user@example.com)                   │   │
│ │ Created: 2025-01-01 10:00:00                         │   │
│ │ Modified: 2025-12-17 10:00:00                        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Configuration:                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Expires At: 2026-12-17 00:00:00                      │   │
│ │ Permissions: USER.VIEW, FILE.UPLOAD                  │   │
│ │ IP Whitelist: 192.168.1.1, 10.0.0.0/8               │   │
│ │ Metadata: {"environment": "production"}              │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Usage Statistics:                                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Total Requests: 1,250                                │   │
│ │ Last Used: 2025-12-17 10:00:00 (2 minutes ago)      │   │
│ │ Requests per Day:                                    │   │
│ │ [Chart showing requests over time]                   │   │
│ │ Top Endpoints:                                       │   │
│ │ 1. /api/users (500 requests)                         │   │
│ │ 2. /api/files (300 requests)                         │   │
│ │ 3. /api/settings (150 requests)                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Usage History:                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Timestamp      │ Endpoint    │ Method │ Status │ IP  │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 2025-12-17 ... │ /api/users  │ GET    │ 200    │ ... │   │
│ │ 2025-12-17 ... │ /api/files  │ POST   │ 201    │ ... │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Showing 1-20 of 1,250  [< 1 2 3 >]                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Tabs

1. **Overview**: Thông tin cơ bản
2. **Configuration**: Cấu hình (permissions, IP whitelist, etc.)
3. **Usage**: Thống kê sử dụng
4. **History**: Lịch sử sử dụng

---

### 4. User API Keys Page

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ My API Keys                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [+ Create API Key]  [Filters ▼]  [Search...]  [Refresh]   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filters:                                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Status: [All ▼]  Date: [▼]                          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Name          │ Status  │ Last Used │ Expires │ ... │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ My API Key    │ Active  │ 2 min ago │ 2026-12 │ ... │   │
│ │ Test Key      │ Revoked │ Never    │ 2025-12 │ ... │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Showing 1-20 of 5  [< 1 >]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Differences from Admin Page

- Không có User column
- Không thể lọc theo user
- Chỉ hiển thị API keys của user hiện tại
- Không thể tạo API keys cho user khác

---

### 5. Copy API Key Dialog

Khi tạo hoặc regenerate API key:

```
┌─────────────────────────────────────────────────────────────┐
│ API Key Created Successfully                        [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ⚠️ Important: Save your API key now. You won't be able to   │
│    see it again!                                             │
│                                                               │
│ API Key:                                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      │   │
│ │                                              [Copy] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                               │
│ Key Prefix: sk_live_xxxx...xxxx                            │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [I have saved my API key]  [Close]                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Confirmation Dialogs

#### Delete API Key

```
┌─────────────────────────────────────────────────────────────┐
│ Delete API Key?                                     [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Are you sure you want to delete this API key?              │
│                                                               │
│ Name: Production API Key                                   │
│ Key Prefix: sk_live_xxxx...xxxx                            │
│                                                               │
│ This action cannot be undone.                              │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Cancel]                              [Delete]       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Revoke API Key

```
┌─────────────────────────────────────────────────────────────┐
│ Revoke API Key?                                     [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Are you sure you want to revoke this API key?              │
│                                                               │
│ Name: Production API Key                                   │
│ Key Prefix: sk_live_xxxx...xxxx                            │
│                                                               │
│ The key will no longer be usable for authentication.       │
│                                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Cancel]                              [Revoke]       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 7. Status Tags & Colors

| Status | Color | Icon | Mô Tả |
|--------|-------|------|-------|
| Active | Green | ✓ | API key đang hoạt động |
| Revoked | Red | ✗ | API key đã bị revoke |
| Expired | Orange | ⏰ | API key đã hết hạn |

---

### 8. UI Components Pattern

Tuân theo pattern của hệ thống hiện tại:

```typescript
// Table Component
<AppTable
  columns={columns}
  dataSource={data}
  pagination={pagination}
  loading={loading}
  onChange={handleTableChange}
/>

// Form Component
<Form
  form={form}
  layout="vertical"
  onFinish={handleSubmit}
>
  <Form.Item
    label="Name"
    name="name"
    rules={[{ required: true }]}
  >
    <Input placeholder="API Key Name" />
  </Form.Item>
</Form>

// Modal Component
<Modal
  title="Create API Key"
  open={isOpen}
  onOk={handleCreate}
  onCancel={handleCancel}
>
  {/* Form content */}
</Modal>
```

---

## 🔄 Luồng Dữ Liệu

### 1. Create API Key Flow

```
User Input
    ↓
[Create Modal]
    ↓
Validate Input
    ↓
POST /admin/api-keys (or /api-keys)
    ↓
Backend: Generate Key
    ↓
Backend: Hash (key + pepper)
    ↓
Backend: Save to Database
    ↓
Backend: Log Security Event
    ↓
Response: Full Key (one-time)
    ↓
[Copy Dialog]
    ↓
User Saves Key
    ↓
[Redirect to List]
```

### 2. List API Keys Flow

```
User Navigates to Page
    ↓
Load Initial Data
    ↓
GET /admin/api-keys (or /api-keys)
    ↓
Backend: Query Database
    ↓
Backend: Apply Filters
    ↓
Backend: Apply Pagination
    ↓
Response: API Keys List
    ↓
[Render Table]
    ↓
User Applies Filters
    ↓
GET /admin/api-keys?filters...
    ↓
[Update Table]
```

### 3. Update API Key Flow

```
User Clicks Edit
    ↓
[Edit Modal Opens]
    ↓
Load Current Data
    ↓
GET /admin/api-keys/:id
    ↓
[Populate Form]
    ↓
User Modifies Fields
    ↓
User Clicks Save
    ↓
Validate Input
    ↓
POST /admin/api-keys/:id
    ↓
Backend: Validate Ownership
    ↓
Backend: Update Database
    ↓
Backend: Log Audit Event
    ↓
Response: Updated Key
    ↓
[Show Success Message]
    ↓
[Refresh List]
```

### 4. Delete API Key Flow

```
User Clicks Delete
    ↓
[Confirmation Dialog]
    ↓
User Confirms
    ↓
POST /admin/api-keys/del
    ↓
Backend: Validate Ownership
    ↓
Backend: Delete from Database
    ↓
Backend: Log Audit Event
    ↓
Response: Success
    ↓
[Show Success Message]
    ↓
[Refresh List]
```

### 5. API Key Authentication Flow

```
External Client
    ↓
Request with API Key Header
    ↓
Authorization: Bearer sk_live_xxxxx
    ↓
Backend: Extract Key
    ↓
Backend: Validate Format
    ↓
Backend: Lookup by Prefix
    ↓
Backend: Hash (key + pepper)
    ↓
Backend: Compare with Stored Hash
    ↓
Backend: Check Status (active)
    ↓
Backend: Check Expiration
    ↓
Backend: Check IP Whitelist
    ↓
Backend: Check Permissions
    ↓
Backend: Update lastUsedAt
    ↓
Backend: Log Usage
    ↓
Request Processed
    ↓
Response Sent
```

---

## 🔐 Bảo Mật & Xác Thực

### 1. Key Generation & Storage

```typescript
// Key Generation
const generateApiKey = (): string => {
  const prefix = "sk_live_";
  const randomBytes = crypto.randomBytes(32);
  const encoded = base64url.encode(randomBytes);
  return prefix + encoded;
};

// Key Hashing (with Pepper)
const hashApiKey = async (key: string, pepper: string): Promise<string> => {
  const combined = `${key}${pepper}`;
  return Bun.password.hash(combined);
};

// Key Verification
const verifyApiKey = async (
  key: string,
  hashedKey: string,
  pepper: string
): Promise<boolean> => {
  const combined = `${key}${pepper}`;
  return Bun.password.compare(combined, hashedKey);
};
```

### 2. Security Events

Các security events được log:

```typescript
// Create
{
  category: 'cud',
  entityType: 'api_key',
  action: 'create',
  entityDisplay: { name, userId }
}

// Update
{
  category: 'cud',
  entityType: 'api_key',
  action: 'update',
  changes: { /* field changes */ }
}

// Delete/Revoke
{
  category: 'cud',
  entityType: 'api_key',
  action: 'delete',
  entityDisplay: { userId }
}
```

### 3. Validation Rules

```typescript
// Key Format Validation
- Must start with "sk_live_"
- Must be 48+ characters
- Must be alphanumeric + special chars

// Expiration Validation
- Must be future date
- Auto-expire if past

// IP Whitelist Validation
- Valid IPv4 or IPv6
- CIDR notation supported
- Validate request IP

// Permission Validation
- Format: "RESOURCE.ACTION"
- Must be valid permissions
- Check against user permissions
```

### 4. Rate Limiting

```typescript
// Per API Key Rate Limiting
- Default: 1000 requests/hour
- Configurable per key
- Tracked in cache

// Per User Rate Limiting
- Max 50 API keys per user
- Max 10 API key creations/day
- Configurable
```

### 5. Access Control

```typescript
// Admin Access
- Can view all API keys
- Can create keys for any user
- Can update any key
- Can delete any key
- Can view usage stats

// User Access
- Can view own API keys
- Can create own keys
- Can update own keys
- Can delete own keys
- Can view own usage stats
```

---

## [object Object]ướng Dẫn Triển Khai

### Phase 1: Backend Setup (Week 1)

#### Tasks

1. **Database Migration**
   - [ ] Add ApiKey model to schema
   - [ ] Add ApiKeyUsage model to schema
   - [ ] Create migration
   - [ ] Add indexes

2. **Core Services**
   - [ ] Implement ApiKeyService
   - [ ] Implement key generation & hashing
   - [ ] Implement ApiKeyValidationService
   - [ ] Add permission checks

3. **Controllers**
   - [ ] Implement ApiKeysAdminController
   - [ ] Implement ApiKeysUserController
   - [ ] Add request/response validation
   - [ ] Add error handling

4. **Testing**
   - [ ] Unit tests for services
   - [ ] Integration tests for controllers
   - [ ] Security tests

---

### Phase 2: Authentication Middleware (Week 2)

#### Tasks

1. **Authentication**
   - [ ] Implement ApiKeyAuthService
   - [ ] Implement authentication middleware
   - [ ] Integrate with existing auth system
   - [ ] Add IP whitelist validation

2. **Usage Tracking**
   - [ ] Implement ApiKeyUsageService
   - [ ] Implement usage logging middleware
   - [ ] Add usage statistics calculation
   - [ ] Add cache layer

3. **Testing**
   - [ ] Test authentication flow
   - [ ] Test usage tracking
   - [ ] Test rate limiting

---

### Phase 3: Frontend - Admin (Week 3)

#### Tasks

1. **Pages & Components**
   - [ ] Create AdminApiKeysPage
   - [ ] Create ApiKeyTable component
   - [ ] Create ApiKeyForm component
   - [ ] Create ApiKeyDetail page

2. **Hooks & Services**
   - [ ] Create useAdminApiKeys hook
   - [ ] Create apiKeysService
   - [ ] Add API integration
   - [ ] Add error handling

3. **UI/UX**
   - [ ] Implement filters
   - [ ] Implement pagination
   - [ ] Implement modals
   - [ ] Add loading states

4. **Testing**
   - [ ] Component tests
   - [ ] Integration tests
   - [ ] E2E tests

---

### Phase 4: Frontend - User (Week 4)

#### Tasks

1. **Pages & Components**
   - [ ] Create UserApiKeysPage
   - [ ] Reuse components from admin
   - [ ] Adapt for user context

2. **Hooks & Services**
   - [ ] Create useUserApiKeys hook
   - [ ] Reuse apiKeysService

3. **Testing**
   - [ ] Component tests
   - [ ] Integration tests

---

### Phase 5: Advanced Features (Week 5)

#### Tasks

1. **Usage Statistics**
   - [ ] Create usage statistics page
   - [ ] Add charts & graphs
   - [ ] Add usage history table

2. **Regenerate & Revoke**
   - [ ] Implement regenerate endpoint
   - [ ] Implement revoke endpoint
   - [ ] Add UI for these actions

3. **Scoped Permissions**
   - [ ] Implement permission selection UI
   - [ ] Add permission validation
   - [ ] Add permission checking in middleware

4. **Testing**
   - [ ] Test all features
   - [ ] Performance testing
   - [ ] Security testing

---

### Phase 6: Documentation & Deployment (Week 6)

#### Tasks

1. **Documentation**
   - [ ] API documentation
   - [ ] User guide
   - [ ] Admin guide
   - [ ] Developer guide

2. **Deployment**
   - [ ] Code review
   - [ ] Security audit
   - [ ] Performance testing
   - [ ] Staging deployment
   - [ ] Production deployment

3. **Monitoring**
   - [ ] Setup monitoring
   - [ ] Setup alerts
   - [ ] Setup logging

---

## 📝 File Structure

```
server/
├── src/
│   ├── modules/
│   │   ├── api-keys/
│   │   │   ├── api-keys-admin.controller.ts ✅
│   │   │   ├── api-keys-user.controller.ts ✅
│   │   │   └── index.ts ✅
│   │   └── api-key-usage/
│   │       ├── api-key-usage-admin.controller.ts ✅
│   │       ├── api-key-usage-user.controller.ts ✅
│   │       └── index.ts ✅
│   ├── services/
│   │   ├── api-keys/
│   │   │   ├── api-key.service.ts ✅
│   │   │   ├── api-key-usage.service.ts ✅
│   │   │   ├── api-key-validation.service.ts ✅
│   │   │   ├── api-key.middleware.ts ✅
│   │   │   ├── api-key-usage-logger.middleware.ts ✅
│   │   │   └── index.ts ✅
│   └── dtos/
│       └── api-keys.dto.ts ✅
│
client/
├── src/
│   ├── features/
│   │   ├── admin/
│   │   │   ├── api-keys/
│   │   │   │   ├── pages/
│   │   │   │   │   └── AdminApiKeysPage.tsx (TODO)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ApiKeyTable.tsx (TODO)
│   │   │   │   │   ├── ApiKeyForm.tsx (TODO)
│   │   │   │   │   └── ApiKeyDetail.tsx (TODO)
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useAdminApiKeys.ts (TODO)
│   │   │   │   ├── services/
│   │   │   │   │   └── admin-api-keys.service.ts (TODO)
│   │   │   │   └── index.ts (TODO)
│   │   └── settings/
│   │       └── (existing)
│   ├── hooks/
│   │   ├── api/
│   │   │   └── useAdminApiKeys.ts (TODO)
│   │   └── resource/
│   │       └── useApiKeys.ts (TODO)
│   ├── services/
│   │   ├── api/
│   │   │   └── api-keys.service.ts (TODO)
│   │   └── (existing)
│   └── types/
│       └── api-keys.ts (TODO)

documents/
├── features/
│   ├── api-key-management/
│   │   ├── overview.md ✅
│   │   ├── api-design.md ✅
│   │   ├── technical-spec.md ✅
│   │   └── implementation-guide.md (THIS FILE)
│   └── (existing)
└── (existing)
```

---

## ✅ Checklist Triển Khai

### Backend

- [x] Database schema
- [x] ApiKey model
- [x] ApiKeyUsage model
- [x] Controllers (Admin & User)
- [x] Services (Core, Validation, Usage)
- [x] Middleware (Auth, Usage Logger)
- [x] DTOs
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security tests
- [ ] Performance tests

### Frontend - Admin

- [ ] AdminApiKeysPage
- [ ] ApiKeyTable component
- [ ] ApiKeyForm component
- [ ] ApiKeyDetail page
- [ ] useAdminApiKeys hook
- [ ] apiKeysService
- [ ] Filters & Pagination
- [ ] Modals & Dialogs
- [ ] Error handling
- [ ] Loading states
- [ ] Component tests
- [ ] Integration tests

### Frontend - User

- [ ] UserApiKeysPage
- [ ] useUserApiKeys hook
- [ ] Reuse components
- [ ] Component tests

### Features

- [ ] Usage statistics
- [ ] Usage history
- [ ] Regenerate API key
- [ ] Revoke API key
- [ ] Scoped permissions
- [ ] IP whitelist validation
- [ ] Rate limiting
- [ ] Security audit logs

### Documentation

- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Developer guide
- [ ] Security guide

### Deployment

- [ ] Code review
- [ ] Security audit
- [ ] Performance testing
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Alert setup

---

## 🔗 Tài Liệu Liên Quan

- [API Design](./api-design.md) - Chi tiết API endpoints
- [Technical Specification](./technical-spec.md) - Spec kỹ thuật
- [Overview](./overview.md) - Tổng quan module
- [System Architecture](../architecture/system-overview.md) - Kiến trúc hệ thống
- [Resource Management UI](../../ui-design/resource-management.md) - UI pattern

---

## 📞 Support & Questions

Liên hệ team development để được hỗ trợ triển khai module này.

---

**Last Updated:** 2025-12-17  
**Version:** 1.0  
**Status:** Ready for Implementation

