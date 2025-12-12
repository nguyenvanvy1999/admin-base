# API Key Management - API Design

## 📋 Tổng Quan

API design cho hệ thống API key management với RESTful endpoints.

## 🔐 Authentication

Tất cả endpoints yêu cầu authentication (JWT token) trừ khi được chỉ định khác.

## 📡 Endpoints

### 1. Create API Key

```http
POST /api-key
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```typescript
{
  name: string,                    // Required: API key name
  expiresAt?: string,              // Optional: ISO 8601 date
  permissions?: string[],          // Optional: Scoped permissions
  ipWhitelist?: string[],          // Optional: IP addresses
  metadata?: object                // Optional: Additional metadata
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    key: string,                   // Full key (only shown once)
    keyPrefix: string,             // "sk_live_xxxx"
    status: "active",
    expiresAt: string | null,
    permissions: string[] | null,
    ipWhitelist: string[] | null,
    created: string,
    modified: string
  }
}
```

**Status Codes:**

- `201` - Created
- `400` - Invalid input
- `403` - Permission denied
- `429` - Rate limit exceeded
- `500` - Server error

**Notes:**

- Full key chỉ được trả về một lần khi tạo
- Key được hash (api_key + pepper) và lưu hash trong database
- Pepper được lưu trong environment config, không lưu trong database
- Security event `api_key_created` được log

---

### 2. List API Keys

```http
GET /api-key?take=20&skip=0&status=active&userId=<user_id>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `take` - Number of items (default: 20, max: 100)
- `skip` - Offset (default: 0)
- `userId` - Filter by user (admin only)
- `status` - Filter by status (active/revoked/expired)
- `search` - Search in name
- `created0` - Start date
- `created1` - End date

**Response:**

```typescript
{
  success: true,
  data: {
    docs: ApiKeyItem[],
    count: number
  }
}
```

**ApiKeyItem:**

```typescript
{
  id: string,
  userId: string,
  name: string,
  keyPrefix: string,               // "sk_live_xxxx...xxxx"
  status: "active" | "revoked" | "expired",
  lastUsedAt: string | null,
  expiresAt: string | null,
  permissions: string[] | null,
  ipWhitelist: string[] | null,
  created: string,
  modified: string
}
```

**Notes:**

- Full key không được trả về trong list
- Chỉ hiển thị keyPrefix
- Admin có thể filter by userId

---

### 3. Get API Key Info

```http
GET /api-key/:id
Authorization: Bearer <jwt_token>
```

**Response:**

```typescript
{
  success: true,
  data: ApiKeyItem
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

**Notes:**

- Full key không được trả về
- Chỉ owner hoặc admin mới xem được

---

### 4. Update API Key

```http
PUT /api-key/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```typescript
{
  name?: string,
  expiresAt?: string | null,       // null để remove expiration
  permissions?: string[] | null,    // null để remove scoped permissions
  ipWhitelist?: string[] | null     // null để remove IP whitelist
}
```

**Response:**

```typescript
{
  success: true,
  data: ApiKeyItem
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid input
- `403` - Access denied
- `404` - Not found

**Notes:**

- Không thể update key value (phải regenerate)
- Không thể update status (phải dùng revoke endpoint)

---

### 5. Delete API Key

```http
DELETE /api-key/:id
Authorization: Bearer <jwt_token>
```

**Response:**

```typescript
{
  success: true,
  data: null
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

**Notes:**

- Hard delete - xóa hoàn toàn khỏi database
- Security event được log

---

### 6. Revoke API Key

```http
POST /api-key/:id/revoke
Authorization: Bearer <jwt_token>
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    status: "revoked"
  }
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

**Notes:**

- Set status = "revoked"
- Revoked keys không thể sử dụng
- Security event `api_key_revoked` được log

---

### 7. Regenerate API Key

```http
POST /api-key/:id/regenerate
Authorization: Bearer <jwt_token>
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    key: string,                   // New full key (only shown once)
    keyPrefix: string,
    status: "active"
  }
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

**Notes:**

- Tạo key mới
- Revoke key cũ (status = revoked)
- Full key chỉ được trả về một lần
- Security events được log cho cả 2 operations

---

### 8. Get Usage Statistics

```http
GET /api-key/:id/usage?startDate=<date>&endDate=<date>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Response:**

```typescript
{
  success: true,
  data: {
    totalRequests: number,
    requestsPerDay: { date: string, count: number }[],
    lastUsedAt: string | null,
    topEndpoints: { endpoint: string, count: number }[]
  }
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

---

### 9. Get Usage History

```http
GET /api-key/:id/usage/history?take=20&skip=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `take` - Number of items (default: 20)
- `skip` - Offset (default: 0)

**Response:**

```typescript
{
  success: true,
  data: {
    docs: {
      timestamp: string,
      endpoint: string,
      method: string,
      ip: string,
      userAgent: string,
      statusCode: number
    }[],
    count: number
  }
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - Not found

---

## 🔑 API Key Authentication

### Using API Key in Requests

```http
Authorization: Bearer <api_key>
```

Hoặc:

```http
X-API-Key: <api_key>
```

### Authentication Flow

1. Client gửi request với API key trong header
2. Server extract API key
3. Server lookup key trong database (by prefix)
4. Server hash (api_key + pepper) với bcrypt
5. Server compare hash với hash đã lưu (giống password verification)
6. Server validate key (status, expiration, IP)
7. Server check scoped permissions
8. Server update lastUsedAt
9. Server attach user context to request

### Response khi Authentication Failed

```typescript
{
  success: false,
  error: {
    code: "API_KEY_INVALID" | "API_KEY_REVOKED" | "API_KEY_EXPIRED" | "IP_NOT_ALLOWED" | "PERMISSION_DENIED",
    message: string
  }
}
```

**Status Codes:**

- `401` - Unauthorized (invalid/revoked/expired key)
- `403` - Forbidden (IP not allowed / permission denied)

---

## 📝 Data Types

### ApiKeyItem

```typescript
{
  id: string,
  userId: string,
  name: string,
  keyPrefix: string,               // "sk_live_xxxx...xxxx"
  status: "active" | "revoked" | "expired",
  lastUsedAt: string | null,       // ISO 8601
  expiresAt: string | null,        // ISO 8601
  permissions: string[] | null,     // Scoped permissions
  ipWhitelist: string[] | null,    // IP addresses
  metadata: object | null,
  created: string,                 // ISO 8601
  modified: string                 // ISO 8601
}
```

### ApiKeyCreateResponse

```typescript
{
  id: string,
  name: string,
  key: string,                     // Full key (only shown once)
  keyPrefix: string,
  status: "active",
  expiresAt: string | null,
  permissions: string[] | null,
  ipWhitelist: string[] | null,
  created: string,
  modified: string
}
```

## 🔒 Access Control

### Ownership

- User chỉ có thể xem/update/delete API keys của chính mình
- Admin với permission `API_KEY.VIEW_ALL` có thể xem tất cả
- Admin với permission `API_KEY.UPDATE_ALL` có thể update tất cả
- Admin với permission `API_KEY.DELETE_ALL` có thể delete tất cả

### Scoped Permissions

- Nếu `permissions` là `null` hoặc `[]`, API key có tất cả permissions của user
- Nếu `permissions` có giá trị, API key chỉ có các permissions được chỉ định
- Permissions format: `"RESOURCE.ACTION"` (ví dụ: `"FILE.UPLOAD"`)

### IP Whitelist

- Nếu `ipWhitelist` là `null` hoặc `[]`, không có IP restriction
- Nếu `ipWhitelist` có giá trị, chỉ các IP addresses được chỉ định mới có thể sử dụng API key
- IP format: IPv4 hoặc IPv6, có thể dùng CIDR notation

## ⚠️ Error Responses

```typescript
{
  success: false,
  error: {
    code: string,                  // Error code
    message: string,
    details?: any
  }
}
```

**Error Codes:**

- `API_KEY_NOT_FOUND`
- `API_KEY_INVALID`
- `API_KEY_REVOKED`
- `API_KEY_EXPIRED`
- `IP_NOT_ALLOWED`
- `PERMISSION_DENIED`
- `INVALID_INPUT`
- `RATE_LIMIT_EXCEEDED`
- `QUOTA_EXCEEDED` (max API keys per user)

## 📝 Notes

- Tất cả timestamps dùng ISO 8601 format
- Full API key chỉ được trả về một lần khi tạo/regenerate
- Key prefix format: `sk_live_xxxx...xxxx` (first 8 chars + "..." + last 4 chars)
- **Pepper**: Secret value từ environment config (`API_KEY_PEPPER`), không lưu trong database
- **Key Storage**: Chỉ lưu hash của (api_key + pepper), không lưu API key hay pepper
- **Key Verification**: Hash (api_key + pepper) rồi compare với hash đã lưu (giống password verification)
- Rate limiting: 10 API key creations/day per user (configurable)
- Max API keys per user: 50 (configurable)
- API key expiration: Optional, auto-expire nếu quá hạn
- Security events được log cho tất cả operations
