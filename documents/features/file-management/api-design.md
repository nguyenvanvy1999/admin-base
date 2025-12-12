# File Management - API Design

## 📋 Tổng Quan

API design cho hệ thống file management với RESTful endpoints.

## 🔐 Authentication

Tất cả endpoints (trừ public download với access token) yêu cầu authentication.

## 📡 Endpoints

### 1. Upload File

```http
POST /file/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  file: File,
  originalName?: string,
  category?: string,
  tags?: string[],
  isPublic?: boolean
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: string, // BigInt as string
    url: string,
    status: "active",
    created: string
  }
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid file
- `413` - File too large
- `429` - Rate limit exceeded
- `500` - Server error

---

### 2. List Files

```http
GET /file?take=20&skip=0&status=active&mimeType=image%2F*
Authorization: Bearer <token>
```

**Query Parameters:**

- `take` - Number of items (default: 20)
- `skip` - Offset (default: 0)
- `userId` - Filter by user (admin only)
- `status` - Filter by status
- `mimeType` - Filter by MIME type
- `category` - Filter by category
- `tags` - Filter by tags (array)
- `search` - Search in filename/originalName
- `created0` - Start date
- `created1` - End date

**Response:**

```typescript
{
  success: true,
  data: {
    docs: FileItem[],
    count: number
  }
}
```

---

### 3. Get File Info

```http
GET /file/:id?accessToken=<token>
Authorization: Bearer <token> (optional if accessToken provided)
```

**Response:**

```typescript
{
  success: true,
  data: FileItem
}
```

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - File not found

---

### 4. Download File

```http
GET /file/:id/download?accessToken=<token>
Authorization: Bearer <token> (optional if accessToken provided)
```

**Response:**

- File stream với proper Content-Type headers

**Status Codes:**

- `200` - Success
- `403` - Access denied
- `404` - File not found

---

### 5. Update File Metadata

```http
PUT /file/:id
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  originalName?: string,
  category?: string,
  tags?: string[],
  isPublic?: boolean
}
```

**Response:**

```typescript
{
  success: true,
  data: FileItem
}
```

---

### 6. Delete File

```http
DELETE /file/:id
Authorization: Bearer <token>
```

**Response:**

```typescript
{
  success: true,
  data: null
}
```

**Note:** Soft delete - file status = "deleted", deletedAt set.

---

### 7. Create File Version

```http
POST /file/:id/versions
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  file: File;
}
```

**Response:**

```typescript
{
  success: true,
  data: FileItem // New version
}
```

---

### 8. List File Versions

```http
GET /file/:id/versions
Authorization: Bearer <token>
```

**Response:**

```typescript
{
  success: true,
  data: FileItem[] // All versions
}
```

---

### 9. Generate Access Token

```http
POST /file/:id/share
Authorization: Bearer <token>
```

**Request Body:**

```typescript
{
  expiresIn?: number // seconds
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    accessToken: string
  }
}
```

---

### 10. Revoke Access Token

```http
DELETE /file/:id/share
Authorization: Bearer <token>
```

**Response:**

```typescript
{
  success: true,
  data: null
}
```

## 📝 Data Types

### FileItem

```typescript
{
  id: string,
  userId: string | null,
  filename: string,
  originalName: string,
  mimeType: string,
  size: string, // BigInt as string
  url: string | null,
  status: "uploading" | "active" | "archived" | "deleted",
  metadata: object,
  isPublic: boolean,
  accessToken: string | null,
  accessTokenExpiresAt: string | null,
  version: number,
  parentId: string | null,
  category: string | null,
  tags: string[],
  created: string,
  modified: string
}
```

## 🔒 Access Control

### Public Access

- File có `isPublic: true` hoặc có valid `accessToken` → Public access
- Có thể download không cần authentication

### Private Access

- Chỉ owner hoặc admin với permission mới truy cập được
- Owner: `file.userId === currentUser.id`
- Admin: Có permission `FILE.VIEW_ALL`

## ⚠️ Error Responses

```typescript
{
  success: false,
  error: {
    code: string, // Error code
    message: string,
    details?: any
  }
}
```

**Error Codes:**

- `FILE_NOT_FOUND`
- `FILE_TOO_LARGE`
- `INVALID_FILE_TYPE`
- `QUOTA_EXCEEDED`
- `FILE_NOT_AVAILABLE`
- `ACCESS_TOKEN_EXPIRED`
- `PERMISSION_DENIED`

## 📝 Notes

- Tất cả timestamps dùng ISO 8601 format
- BigInt values trả về dạng string
- File size limit: 100MB (configurable)
- Rate limiting: 10 uploads/minute per user
