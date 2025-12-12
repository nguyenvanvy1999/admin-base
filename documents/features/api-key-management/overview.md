# API Key Management - Tổng Quan

## 📋 Hiện Trạng

Tính năng API Key Management hiện tại **chưa được implement**. Đây là tính năng mới cần triển khai.

## 🎯 Mục Tiêu

Hệ thống quản lý API keys hoàn chỉnh cho phép:

- Tạo và quản lý API keys cho third-party integrations
- Scoped permissions cho từng API key
- IP whitelist per API key
- Expiration dates và usage tracking
- Revoke/regenerate keys
- Security audit trail

## 📊 Database Schema

Schema đã được đề xuất trong `database/schema-examples/improvements.prisma`:

### ApiKey Model

```prisma
enum ApiKeyStatus {
  active
  revoked
  expired
}

model ApiKey {
  id          String       @id
  userId      String
  name        String
  key         String       @unique // Hash của (api_key + pepper) với bcrypt
  keyPrefix   String       // First 8 chars for display
  status      ApiKeyStatus @default(active)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  permissions Json?        // Scoped permissions
  ipWhitelist String[]?    // IP whitelist
  metadata    Json?
  created     DateTime     @default(now())
  modified    DateTime     @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Lưu ý về Security:**

- **Pepper**: Secret value từ environment config (`API_KEY_PEPPER`), không lưu trong database
- **Key Storage**: Chỉ lưu hash của (api_key + pepper), không lưu API key hay pepper
- **Key Verification**: Hash (api_key + pepper) rồi compare với hash đã lưu (giống password verification)

```

## 🔐 Security Events

Hệ thống sẽ log các security events:

- `api_key_created` - Khi tạo API key mới
- `api_key_revoked` - Khi revoke API key

## 🎯 Kế Hoạch Triển Khai

### Phase 1: Core Features (Ưu tiên cao)

- [ ] Database migration: Thêm ApiKey model
- [ ] Backend: API key service (CRUD operations)
- [ ] Backend: API key controller (REST endpoints)
- [ ] Backend: API key authentication middleware
- [ ] Security: Key generation và hashing (sử dụng pepper)
- [ ] Security: Key validation middleware (hash key + pepper, compare với hash đã lưu)
- [ ] Security: Setup pepper trong environment config

### Phase 2: Advanced Features

- [ ] Frontend: API key management page
- [ ] Frontend: API key creation form
- [ ] Frontend: API key detail view
- [ ] Scoped permissions per API key
- [ ] IP whitelist validation
- [ ] Expiration date handling
- [ ] Usage tracking (lastUsedAt)

### Phase 3: Security & Audit

- [ ] Security event logging
- [ ] API key usage analytics
- [ ] Rate limiting per API key
- [ ] Revoke/regenerate functionality
- [ ] Audit trail cho API key operations

## 📚 Tài Liệu Chi Tiết

- [Technical Specification](./technical-spec.md) - Spec kỹ thuật chi tiết
- [API Design](./api-design.md) - Thiết kế API endpoints

## ⚠️ Lưu Ý

Tài liệu này mô tả hệ thống API key management **hoàn chỉnh** (chưa implement). Đây là kế hoạch triển khai, không phải hiện trạng.

## 🔗 Tài Liệu Liên Quan

- [Database Schema](../../database/schema-examples/improvements.prisma) - ApiKey model
- [Feature Summary](../summary.md) - Tổng quan tính năng
- [Feature Roadmap](../roadmap.md) - Kế hoạch triển khai
- [Resource Management UI Design](../../ui-design/resource-management.md) - UI pattern
```
