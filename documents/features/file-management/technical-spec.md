# File Management - Technical Specification

## 📋 Mục Tiêu

Hệ thống quản lý file hoàn chỉnh với:

- Quản lý file an toàn với access control
- Versioning support
- Metadata tracking
- Scalable storage backend
- Security & audit trail

## 🏗️ Kiến Trúc

```
Controller Layer (file.controller.ts)
    ↓
Service Layer
    ├── FileService (core business logic)
    ├── FileMetadataService (metadata extraction)
    ├── FileVersionService (versioning)
    ├── FileAccessService (access control)
    └── FileQuotaService (quota management)
    ↓
Data Layer
    ├── Database (Prisma - File model)
    └── Storage Backend (StorageManager)
```

## 📊 Database Schema

Xem `database/schema-examples/improvements.prisma` để biết File model chi tiết.

### File Model (Tóm tắt)

```prisma
model File {
  id          String     @id
  userId      String?
  filename    String
  originalName String
  mimeType    String
  size        BigInt
  path        String
  status      FileStatus
  metadata    Json?

  // Security
  isPublic    Boolean
  accessToken String?

  // Versioning
  version     Int
  parentId    String?
  parent      File?
  versions    File[]

  // Timestamps
  created     DateTime
  modified    DateTime
  deletedAt   DateTime?

  user        User?
}
```

## 🔧 Service Layer

### FileService

Core business logic cho file operations:

- `upload()` - Upload file với validation
- `list()` - List files với filtering & pagination
- `getById()` - Get file info với permission check
- `download()` - Download file với access control
- `update()` - Update file metadata
- `delete()` - Soft delete file
- `deleteMany()` - Bulk delete

### FileMetadataService

Extract metadata từ files:

- Image: width, height, format
- Video: duration, resolution
- Document: page count
- File hash (SHA256)

### FileVersionService

Quản lý file versions:

- `createVersion()` - Tạo version mới
- `listVersions()` - List tất cả versions
- `restoreVersion()` - Restore về version cũ

### FileAccessService

Access control:

- `checkAccess()` - Kiểm tra quyền truy cập
- `generateAccessToken()` - Tạo access token cho public sharing
- `revokeAccessToken()` - Revoke access token

### FileQuotaService

Quota management:

- `checkQuota()` - Kiểm tra quota trước khi upload
- `getUserQuota()` - Lấy quota của user
- `getUserUsage()` - Tính storage usage

## 🔐 Security & Permissions

### Permission System

```
FILE.VIEW          // View own files
FILE.VIEW_ALL      // View all files
FILE.UPLOAD        // Upload files
FILE.UPDATE        // Update own files
FILE.UPDATE_ALL    // Update all files
FILE.DELETE        // Delete own files
FILE.DELETE_ALL    // Delete all files
FILE.SHARE         // Share own files
FILE.SHARE_ALL     // Share any files
```

### Security Measures

- File size validation (max 100MB)
- MIME type whitelist
- File extension validation
- Filename sanitization
- Rate limiting
- Access token với expiration

## 📡 API Endpoints

Xem [API Design](./api-design.md) để biết chi tiết.

### Core Endpoints

- `POST /file/upload` - Upload file
- `GET /file` - List files
- `GET /file/:id` - Get file info
- `GET /file/:id/download` - Download file
- `PUT /file/:id` - Update metadata
- `DELETE /file/:id` - Delete file

### Advanced Endpoints

- `POST /file/:id/versions` - Create version
- `GET /file/:id/versions` - List versions
- `POST /file/:id/share` - Generate access token
- `DELETE /file/:id/share` - Revoke access token

## 🚀 Migration Plan

### Phase 1: Database Setup

1. Tạo File model trong schema
2. Tạo indexes
3. Migration database

### Phase 2: Core Services

1. Implement FileService (upload, list, get, download)
2. Implement FileMetadataService
3. Update FileController

### Phase 3: Advanced Features

1. Implement FileVersionService
2. Implement FileAccessService
3. Implement FileQuotaService

### Phase 4: Testing & Optimization

1. Unit tests
2. Integration tests
3. Performance optimization

## 📝 Notes

- Tài liệu này mô tả hệ thống **hoàn chỉnh** (chưa implement)
- Hiện tại chỉ có upload/download cơ bản
- Xem `overview.md` để biết hiện trạng
- Xem `api-design.md` để biết chi tiết API
