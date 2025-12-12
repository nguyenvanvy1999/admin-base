# API Key Management - Technical Specification

## 📋 Mục Tiêu

Hệ thống quản lý API keys hoàn chỉnh với:

- Secure key generation và storage
- Scoped permissions per API key
- IP whitelist support
- Expiration dates và auto-expiration
- Usage tracking và analytics
- Security audit trail
- Rate limiting per API key

## 🏗️ Kiến Trúc

```
Controller Layer (api-key.controller.ts)
    ↓
Service Layer
    ├── ApiKeyService (core business logic)
    ├── ApiKeyAuthService (authentication middleware)
    ├── ApiKeyValidationService (validation logic)
    └── ApiKeyAnalyticsService (usage tracking)
    ↓
Data Layer
    ├── Database (Prisma - ApiKey model)
    └── Security Event Logging
```

## 📊 Database Schema

Xem `database/schema-examples/improvements.prisma` để biết ApiKey model chi tiết.

### ApiKey Model (Tóm tắt)

```prisma
enum ApiKeyStatus {
  active
  revoked
  expired
}

model ApiKey {
  id          String       @id @default(uuid())
  userId      String       @map("user_id")
  name        String
  key         String       @unique // Hash của (api_key + pepper) với bcrypt
  keyPrefix   String       @map("key_prefix") // First 8 chars for display
  status      ApiKeyStatus @default(active)
  lastUsedAt  DateTime?    @map("last_used_at")
  expiresAt   DateTime?    @map("expires_at")
  permissions Json?        // Scoped permissions array
  ipWhitelist String[]?    @map("ip_whitelist") // IP addresses
  metadata    Json?        // Additional metadata
  created     DateTime     @default(now())
  modified    DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "api_key_userId_idx")
  @@index([status], name: "api_key_status_idx")
  @@index([keyPrefix], name: "api_key_prefix_idx")
  @@map("api_keys")
}
```

### Indexes

- `userId` - Fast lookup by user
- `status` - Filter active/revoked/expired keys
- `keyPrefix` - Fast lookup by prefix (for validation)

## 🔧 Service Layer

### ApiKeyService

Core business logic cho API key operations:

- `create()` - Tạo API key mới với secure generation, hash (key + pepper) và lưu hash
- `list()` - List API keys với filtering & pagination
- `getById()` - Get API key info với permission check
- `update()` - Update API key (name, permissions, ipWhitelist, expiresAt)
- `revoke()` - Revoke API key (set status = revoked)
- `regenerate()` - Regenerate API key (tạo key mới, hash (key + pepper), revoke key cũ)
- `delete()` - Hard delete API key
- `validate()` - Validate API key (check status, expiration, IP)

### ApiKeyAuthService

Authentication middleware cho API requests:

- `authenticate()` - Authenticate request với API key (hash key + pepper, compare với hash đã lưu)
- `extractApiKey()` - Extract API key từ header
- `verifyApiKey()` - Hash (api_key + pepper) và verify với hash đã lưu (giống password verification)
- `checkPermissions()` - Check scoped permissions
- `checkIpWhitelist()` - Validate IP address
- `updateLastUsed()` - Update lastUsedAt timestamp

### ApiKeyValidationService

Validation logic:

- `validateKey()` - Validate key format
- `validateExpiration()` - Check expiration date
- `validateStatus()` - Check key status (active/revoked/expired)
- `validateIp()` - Validate IP against whitelist
- `validatePermissions()` - Validate requested permissions

### ApiKeyAnalyticsService

Usage tracking và analytics:

- `trackUsage()` - Track API key usage
- `getUsageStats()` - Get usage statistics
- `getUsageHistory()` - Get usage history với pagination
- `getTopKeys()` - Get most used API keys

## 🔐 Security & Permissions

### Permission System

```
API_KEY.VIEW          // View own API keys
API_KEY.VIEW_ALL      // View all API keys
API_KEY.CREATE        // Create API keys
API_KEY.UPDATE        // Update own API keys
API_KEY.UPDATE_ALL    // Update all API keys
API_KEY.DELETE        // Delete own API keys
API_KEY.DELETE_ALL    // Delete all API keys
```

### Scoped Permissions

Mỗi API key có thể có scoped permissions (JSON array):

```typescript
{
  permissions: ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"];
}
```

Nếu `permissions` là `null` hoặc `[]`, API key có tất cả permissions của user.

### Security Measures

- **Key Generation**: Random 32-byte key, base64 encoded
- **Pepper**: Secret value từ environment config (không lưu trong database)
- **Key Storage**: Hash của (api_key + pepper) với bcrypt (cost factor 12)
- **Key Display**: Chỉ hiển thị prefix (first 8 chars) + "..." + last 4 chars
- **Key Transmission**: Full key chỉ hiển thị một lần khi tạo
- **Key Comparison**: Hash (api_key + pepper) rồi compare với hash đã lưu (giống password)
- **IP Whitelist**: Optional, validate IP address
- **Expiration**: Optional, auto-expire keys
- **Rate Limiting**: Per API key rate limiting
- **Security Events**: Log tất cả operations

### Key Format

```
Generated: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Display:   sk_live_xxxx...xxxx
Prefix:    sk_live_xxxx
```

## 📡 API Endpoints

Xem [API Design](./api-design.md) để biết chi tiết.

### Core Endpoints

- `POST /api-key` - Create API key
- `GET /api-key` - List API keys
- `GET /api-key/:id` - Get API key info
- `PUT /api-key/:id` - Update API key
- `DELETE /api-key/:id` - Delete API key
- `POST /api-key/:id/revoke` - Revoke API key
- `POST /api-key/:id/regenerate` - Regenerate API key

### Analytics Endpoints

- `GET /api-key/:id/usage` - Get usage statistics
- `GET /api-key/:id/usage/history` - Get usage history

## 🔑 API Key Authentication

### Request Format

```http
Authorization: Bearer <api_key>
```

Hoặc:

```http
X-API-Key: <api_key>
```

### Authentication Flow

1. Extract API key từ header
2. Validate key format
3. Lookup key trong database (by prefix)
4. Hash (api_key + pepper) với bcrypt
5. Compare hash với hash đã lưu trong database (giống password verification)
6. Check key status (must be active)
7. Check expiration date
8. Check IP whitelist (if configured)
9. Check scoped permissions (if configured)
10. Update lastUsedAt
11. Attach user context to request

## 🚀 Migration Plan

### Phase 1: Database Setup

1. Tạo ApiKey model trong schema
2. Tạo indexes
3. Migration database
4. Add security event types (api_key_created, api_key_revoked)

### Phase 2: Core Services

1. Implement ApiKeyService (create, list, get, update, delete)
2. Implement key generation và hashing
3. Implement ApiKeyController
4. Add permission checks

### Phase 3: Authentication Middleware

1. Implement ApiKeyAuthService
2. Implement authentication middleware
3. Integrate với existing auth system
4. Add IP whitelist validation

### Phase 4: Advanced Features

1. Implement ApiKeyValidationService
2. Implement ApiKeyAnalyticsService
3. Add usage tracking
4. Add rate limiting per API key

### Phase 5: Frontend

1. Create API key management page
2. Create API key creation form
3. Create API key detail view
4. Add usage statistics display

### Phase 6: Testing & Optimization

1. Unit tests
2. Integration tests
3. Security testing
4. Performance optimization

## 📝 Key Generation Algorithm

```typescript
// Pepper được lưu trong environment config (không lưu trong database)
const PEPPER = process.env.API_KEY_PEPPER;

function generateApiKey(): string {
  const prefix = "sk_live_";
  const randomBytes = crypto.randomBytes(32);
  const encoded = base64url.encode(randomBytes);
  return prefix + encoded;
}

function hashApiKey(key: string, pepper: string): string {
  // Hash (api_key + pepper) với bcrypt
  const combined = key + pepper;
  return bcrypt.hash(combined, 12);
}

function verifyApiKey(key: string, hashedKey: string, pepper: string): boolean {
  // Hash (api_key + pepper) rồi compare với hash đã lưu
  const combined = key + pepper;
  return bcrypt.compare(combined, hashedKey);
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 16); // "sk_live_xxxx"
}
```

## 🔒 Security Considerations

### Pepper Mechanism

**Pepper** là một secret value được lưu trong environment config (`API_KEY_PEPPER`), không lưu trong database. Cơ chế hoạt động:

1. **Khi tạo API key:**

   - Generate API key: `sk_live_xxxxxxxxxxxxx`
   - Lấy pepper từ environment: `process.env.API_KEY_PEPPER`
   - Combine: `api_key + pepper`
   - Hash với bcrypt: `bcrypt.hash(api_key + pepper, 12)`
   - Lưu hash vào database (field `key`)
   - Lưu prefix vào database (field `keyPrefix`) để lookup nhanh

2. **Khi verify API key:**
   - Extract API key từ request header
   - Lookup trong database bằng prefix
   - Lấy pepper từ environment: `process.env.API_KEY_PEPPER`
   - Hash (api_key + pepper): `bcrypt.hash(api_key + pepper, 12)`
   - Compare với hash đã lưu: `bcrypt.compare(api_key + pepper, storedHash)`

**Lợi ích:**

- API key không bao giờ được lưu trong database
- Pepper không được lưu trong database
- Ngay cả khi database bị leak, attacker không thể recover API keys
- Tương tự như cách xử lý password với salt/pepper

### Key Storage

- **Never store plain text keys** - Chỉ lưu hash của (api_key + pepper)
- **Pepper** - Secret value từ environment config (`API_KEY_PEPPER`), không lưu trong database
- **Key prefix** - Store prefix separately for fast lookup
- **Key display** - Only show prefix + "..." + last 4 chars
- **Key comparison** - Hash (api_key + pepper) rồi compare với hash đã lưu (giống password verification)

### Key Validation

- **Status check** - Only active keys are valid
- **Expiration check** - Auto-expire expired keys
- **IP whitelist** - Strict IP validation if configured
- **Rate limiting** - Prevent abuse

### Key Lifecycle

1. **Created** - Status = active, full key shown once
2. **Active** - Can be used for authentication
3. **Revoked** - Manually revoked, cannot be used
4. **Expired** - Auto-expired, cannot be used
5. **Deleted** - Hard deleted from database

## 📝 Notes

- Tài liệu này mô tả hệ thống **hoàn chỉnh** (chưa implement)
- Xem `overview.md` để biết hiện trạng
- Xem `api-design.md` để biết chi tiết API
