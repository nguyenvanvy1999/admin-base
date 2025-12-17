# API Key Management - API Endpoints Reference

## [object Object]ục Lục

1. [Admin Endpoints](#admin-endpoints)
2. [User Endpoints](#user-endpoints)
3. [Usage Endpoints](#usage-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Authentication](#authentication)
7. [Rate Limiting](#rate-limiting)

---

## 👨‍💼 Admin Endpoints

### Base URL

```
/admin/api-keys
```

### 1. List All API Keys

**Endpoint:** `GET /admin/api-keys`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own keys
- `API_KEY.VIEW_ALL` - View all keys

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `take` | number | ❌ | 20 | Number of items (max: 100) |
| `skip` | number | ❌ | 0 | Offset for pagination |
| `userId` | string | ❌ | - | Filter by user ID |
| `userIds` | string[] | ❌ | - | Filter by multiple user IDs |
| `status` | enum | ❌ | - | Filter by status (active/revoked/expired) |
| `search` | string | ❌ | - | Search by API key name |
| `created0` | date | ❌ | - | Created date from (ISO 8601) |
| `created1` | date | ❌ | - | Created date to (ISO 8601) |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/admin/api-keys?take=20&skip=0&status=active&search=prod" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_123456789",
        "userId": "user_123",
        "name": "Production API Key",
        "keyPrefix": "sk_live_xxxx...xxxx",
        "status": "active",
        "permissions": ["USER.VIEW", "FILE.UPLOAD"],
        "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
        "lastUsedAt": "2025-12-17T10:30:00Z",
        "expiresAt": "2026-12-17T00:00:00Z",
        "created": "2025-01-01T00:00:00Z",
        "modified": "2025-12-17T10:00:00Z"
      },
      {
        "id": "ak_987654321",
        "userId": "user_456",
        "name": "Development API Key",
        "keyPrefix": "sk_live_yyyy...yyyy",
        "status": "active",
        "permissions": null,
        "ipWhitelist": [],
        "lastUsedAt": "2025-12-16T15:45:00Z",
        "expiresAt": null,
        "created": "2025-02-01T00:00:00Z",
        "modified": "2025-12-16T15:45:00Z"
      }
    ],
    "count": 2
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to view API keys"
  }
}
```

---

### 2. Get API Key Details

**Endpoint:** `GET /admin/api-keys/:id`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own keys
- `API_KEY.VIEW_ALL` - View all keys

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | API Key ID |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/admin/api-keys/ak_123456789" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "userId": "user_123",
    "name": "Production API Key",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"],
    "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
    "lastUsedAt": "2025-12-17T10:30:00Z",
    "expiresAt": "2026-12-17T00:00:00Z",
    "metadata": {
      "environment": "production",
      "description": "Main production API key"
    },
    "user": {
      "id": "user_123",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "usage": {
      "totalRequests": 1250,
      "lastUsedAt": "2025-12-17T10:30:00Z"
    },
    "created": "2025-01-01T00:00:00Z",
    "modified": "2025-12-17T10:00:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "API key not found"
  }
}
```

---

### 3. Create API Key

**Endpoint:** `POST /admin/api-keys`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.UPDATE` - Create for self
- `API_KEY.UPDATE_ALL` - Create for others

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | ❌ | User ID (if not provided, creates for current user) |

**Request Body:**

```json
{
  "name": "Production API Key",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD"],
  "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
  "metadata": {
    "environment": "production",
    "description": "Main production API key"
  }
}
```

**Request Example:**

```bash
curl -X POST "http://localhost:3000/admin/api-keys?userId=user_123" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "expiresAt": "2026-12-17T00:00:00Z",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"],
    "ipWhitelist": ["192.168.1.1"],
    "metadata": {"environment": "production"}
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "name": "Production API Key",
    "key": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "expiresAt": "2026-12-17T00:00:00Z",
    "created": "2025-12-17T10:00:00Z"
  }
}
```

**⚠️ Important:** The full API key is only returned once during creation. The client must save it immediately.

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "API key name is required"
  }
}
```

---

### 4. Update API Key

**Endpoint:** `POST /admin/api-keys/:id`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.UPDATE` - Update own keys
- `API_KEY.UPDATE_ALL` - Update all keys

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | API Key ID |

**Request Body:**

```json
{
  "name": "Updated API Key Name",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
  "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
  "metadata": {
    "environment": "production",
    "updated": true
  }
}
```

**Request Example:**

```bash
curl -X POST "http://localhost:3000/admin/api-keys/ak_123456789" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated API Key Name",
    "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"]
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "userId": "user_123",
    "name": "Updated API Key Name",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
    "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"],
    "expiresAt": "2026-12-17T00:00:00Z",
    "modified": "2025-12-17T10:30:00Z"
  }
}
```

---

### 5. Delete API Keys (Bulk)

**Endpoint:** `POST /admin/api-keys/del`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.DELETE` - Delete own keys
- `API_KEY.DELETE_ALL` - Delete all keys

**Request Body:**

```json
{
  "ids": ["ak_123456789", "ak_987654321"]
}
```

**Request Example:**

```bash
curl -X POST "http://localhost:3000/admin/api-keys/del" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["ak_123456789", "ak_987654321"]
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": null
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to delete this API key"
  }
}
```

---

## 👤 User Endpoints

### Base URL

```
/api-keys
```

### 1. List My API Keys

**Endpoint:** `GET /api-keys`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own keys

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `take` | number | ❌ | 20 | Number of items (max: 100) |
| `skip` | number | ❌ | 0 | Offset for pagination |
| `status` | enum | ❌ | - | Filter by status (active/revoked/expired) |
| `search` | string | ❌ | - | Search by API key name |
| `created0` | date | ❌ | - | Created date from (ISO 8601) |
| `created1` | date | ❌ | - | Created date to (ISO 8601) |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api-keys?take=20&skip=0&status=active" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_123456789",
        "userId": "user_123",
        "name": "My API Key",
        "keyPrefix": "sk_live_xxxx...xxxx",
        "status": "active",
        "permissions": ["USER.VIEW", "FILE.UPLOAD"],
        "ipWhitelist": ["192.168.1.1"],
        "lastUsedAt": "2025-12-17T10:30:00Z",
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

### 2. Get My API Key Details

**Endpoint:** `GET /api-keys/:id`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own keys

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | API Key ID |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api-keys/ak_123456789" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "userId": "user_123",
    "name": "My API Key",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"],
    "ipWhitelist": ["192.168.1.1"],
    "lastUsedAt": "2025-12-17T10:30:00Z",
    "expiresAt": "2026-12-17T00:00:00Z",
    "metadata": {
      "description": "My personal API key"
    },
    "usage": {
      "totalRequests": 500,
      "lastUsedAt": "2025-12-17T10:30:00Z"
    },
    "created": "2025-01-01T00:00:00Z",
    "modified": "2025-12-17T10:00:00Z"
  }
}
```

---

### 3. Create My API Key

**Endpoint:** `POST /api-keys`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.UPDATE` - Create keys

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

**Request Example:**

```bash
curl -X POST "http://localhost:3000/api-keys" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "expiresAt": "2026-12-17T00:00:00Z",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"]
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "name": "My API Key",
    "key": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "expiresAt": "2026-12-17T00:00:00Z",
    "created": "2025-12-17T10:00:00Z"
  }
}
```

---

### 4. Update My API Key

**Endpoint:** `POST /api-keys/:id`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.UPDATE` - Update own keys

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | API Key ID |

**Request Body:**

```json
{
  "name": "Updated API Key Name",
  "expiresAt": "2026-12-17T00:00:00Z",
  "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
  "ipWhitelist": ["192.168.1.1"]
}
```

**Request Example:**

```bash
curl -X POST "http://localhost:3000/api-keys/ak_123456789" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated API Key Name"
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "ak_123456789",
    "userId": "user_123",
    "name": "Updated API Key Name",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active",
    "permissions": ["USER.VIEW", "FILE.UPLOAD", "FILE.DOWNLOAD"],
    "ipWhitelist": ["192.168.1.1"],
    "expiresAt": "2026-12-17T00:00:00Z",
    "modified": "2025-12-17T10:30:00Z"
  }
}
```

---

### 5. Delete My API Keys (Bulk)

**Endpoint:** `POST /api-keys/del`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.DELETE` - Delete own keys

**Request Body:**

```json
{
  "ids": ["ak_123456789"]
}
```

**Request Example:**

```bash
curl -X POST "http://localhost:3000/api-keys/del" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["ak_123456789"]
  }'
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": null
}
```

---

## 📊 Usage Endpoints

### Base URL

```
/admin/api-key-usage
```

### 1. List API Key Usage

**Endpoint:** `GET /admin/api-key-usage`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own usage
- `API_KEY.VIEW_ALL` - View all usage

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `take` | number | ❌ | 20 | Number of items (max: 100) |
| `skip` | number | ❌ | 0 | Offset for pagination |
| `apiKeyId` | string | ❌ | - | Filter by API key ID |
| `userId` | string | ❌ | - | Filter by user ID |
| `endpoint` | string | ❌ | - | Filter by endpoint |
| `method` | string | ❌ | - | Filter by HTTP method |
| `statusCode` | number | ❌ | - | Filter by status code |
| `timestamp0` | date | ❌ | - | Timestamp from (ISO 8601) |
| `timestamp1` | date | ❌ | - | Timestamp to (ISO 8601) |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/admin/api-key-usage?apiKeyId=ak_123456789&take=50" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "usage_123",
        "apiKeyId": "ak_123456789",
        "endpoint": "/api/users",
        "method": "GET",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "statusCode": 200,
        "timestamp": "2025-12-17T10:30:00Z"
      },
      {
        "id": "usage_124",
        "apiKeyId": "ak_123456789",
        "endpoint": "/api/files",
        "method": "POST",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "statusCode": 201,
        "timestamp": "2025-12-17T10:29:00Z"
      }
    ],
    "count": 2
  }
}
```

---

### 2. Get API Key Usage Statistics

**Endpoint:** `GET /admin/api-key-usage/stats`

**Authentication:** Required (JWT)

**Permissions Required:**
- `API_KEY.VIEW` - View own stats
- `API_KEY.VIEW_ALL` - View all stats

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKeyId` | string | ✅ | - | API Key ID |
| `startDate` | date | ❌ | - | Start date (ISO 8601) |
| `endDate` | date | ❌ | - | End date (ISO 8601) |

**Request Example:**

```bash
curl -X GET "http://localhost:3000/admin/api-key-usage/stats?apiKeyId=ak_123456789&startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Response Example (200 OK):**

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
      },
      {
        "date": "2025-12-15",
        "count": 180
      }
    ],
    "lastUsedAt": "2025-12-17T10:30:00Z",
    "topEndpoints": [
      {
        "endpoint": "/api/users",
        "count": 500
      },
      {
        "endpoint": "/api/files",
        "count": 300
      },
      {
        "endpoint": "/api/settings",
        "count": 150
      }
    ]
  }
}
```

---

## 📝 Request/Response Examples

### Example 1: Create API Key with Full Details

**Request:**

```bash
curl -X POST "http://localhost:3000/admin/api-keys?userId=user_123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key - Main",
    "expiresAt": "2026-12-17T00:00:00Z",
    "permissions": [
      "USER.VIEW",
      "USER.UPDATE",
      "FILE.UPLOAD",
      "FILE.DOWNLOAD"
    ],
    "ipWhitelist": [
      "192.168.1.1",
      "192.168.1.2",
      "10.0.0.0/8"
    ],
    "metadata": {
      "environment": "production",
      "description": "Main production API key",
      "team": "backend",
      "created_by": "admin@example.com"
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ak_1234567890abcdef",
    "name": "Production API Key - Main",
    "key": "sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "keyPrefix": "sk_live_a1b2...s9t0",
    "status": "active",
    "expiresAt": "2026-12-17T00:00:00Z",
    "created": "2025-12-17T10:00:00Z"
  }
}
```

**⚠️ Important:** Save the full key immediately. It will not be shown again.

---

### Example 2: Update API Key Permissions

**Request:**

```bash
curl -X POST "http://localhost:3000/admin/api-keys/ak_1234567890abcdef" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "USER.VIEW",
      "FILE.UPLOAD",
      "FILE.DOWNLOAD",
      "FILE.DELETE"
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ak_1234567890abcdef",
    "userId": "user_123",
    "name": "Production API Key - Main",
    "keyPrefix": "sk_live_a1b2...s9t0",
    "status": "active",
    "permissions": [
      "USER.VIEW",
      "FILE.UPLOAD",
      "FILE.DOWNLOAD",
      "FILE.DELETE"
    ],
    "ipWhitelist": [
      "192.168.1.1",
      "192.168.1.2",
      "10.0.0.0/8"
    ],
    "expiresAt": "2026-12-17T00:00:00Z",
    "modified": "2025-12-17T10:30:00Z"
  }
}
```

---

### Example 3: Filter API Keys by Multiple Criteria

**Request:**

```bash
curl -X GET "http://localhost:3000/admin/api-keys?take=50&skip=0&status=active&userIds=user_123,user_456&search=prod&created0=2025-12-01&created1=2025-12-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_1234567890abcdef",
        "userId": "user_123",
        "name": "Production API Key",
        "keyPrefix": "sk_live_a1b2...s9t0",
        "status": "active",
        "permissions": ["USER.VIEW", "FILE.UPLOAD"],
        "ipWhitelist": ["192.168.1.1"],
        "lastUsedAt": "2025-12-17T10:30:00Z",
        "expiresAt": "2026-12-17T00:00:00Z",
        "created": "2025-12-10T00:00:00Z",
        "modified": "2025-12-17T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `UNAUTHORIZED` | 401 | Authentication required |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Example Error Responses

**Invalid Input (400):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "API key name is required",
    "details": {
      "field": "name",
      "reason": "required"
    }
  }
}
```

**Permission Denied (403):**

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to view this API key",
    "details": {
      "required_permission": "API_KEY.VIEW_ALL"
    }
  }
}
```

**Not Found (404):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "API key not found",
    "details": {
      "id": "ak_invalid_id"
    }
  }
}
```

**Rate Limit Exceeded (429):**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## 🔐 Authentication

### JWT Token

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### API Key Authentication

When using API keys to authenticate requests to your API:

```
Authorization: Bearer <api_key>
```

or

```
X-API-Key: <api_key>
```

### Token Refresh

If your JWT token expires, you need to refresh it using the auth endpoints:

```bash
curl -X POST "http://localhost:3000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

---

## 🚦 Rate Limiting

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| List API Keys | 100 | 1 minute |
| Get API Key | 100 | 1 minute |
| Create API Key | 10 | 1 day |
| Update API Key | 50 | 1 minute |
| Delete API Key | 50 | 1 minute |
| Get Usage Stats | 100 | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1671270000
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs are unique identifiers
- Pagination uses `take` (limit) and `skip` (offset) parameters
- Search is case-insensitive
- Filters can be combined
- Full API key is only returned once during creation
- API keys are hashed and never stored in plain text
- All operations are logged for audit purposes

---

**Last Updated:** 2025-12-17  
**Version:** 1.0  
**Status:** Ready for Implementation

