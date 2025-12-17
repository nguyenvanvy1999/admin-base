# API Key Management - Quick Start Guide

## 🚀 Bắt Đầu Nhanh

Tài liệu này giúp bạn bắt đầu nhanh với module API Key Management.

---

## 📚 Tài Liệu Chính

| File | Mục Đích | Cho Ai |
|------|---------|--------|
| `overview.md` | Tổng quan module | Tất cả |
| `api-design.md` | Thiết kế API endpoints | Backend |
| `technical-spec.md` | Spec kỹ thuật chi tiết | Backend |
| `implementation-guide.md` | Hướng dẫn triển khai | Backend & Frontend |
| `ui-ux-design.md` | Thiết kế UI/UX | Frontend & Designer |
| `api-endpoints-reference.md` | Tham chiếu API | Backend & Frontend |
| `README.md` | Tài liệu tổng hợp | Tất cả |

---

## 🎯 Tùy Theo Vai Trò

### 👨‍💻 Backend Developer

**Bước 1: Hiểu Tổng Quan**
```
Đọc: overview.md
Thời gian: 10 phút
```

**Bước 2: Hiểu Kiến Trúc**
```
Đọc: technical-spec.md
Thời gian: 20 phút
```

**Bước 3: Hiểu API Endpoints**
```
Đọc: api-design.md
Thời gian: 15 phút
```

**Bước 4: Bắt Đầu Triển Khai**
```
Đọc: implementation-guide.md (Backend section)
Xem: server/src/modules/api-keys/
Xem: server/src/services/api-keys/
Thời gian: 2-3 tuần
```

**Bước 5: Tham Chiếu Chi Tiết**
```
Đọc: api-endpoints-reference.md
Thời gian: 10 phút (khi cần)
```

---

### [object Object]Bước 1: Hiểu Tổng Quan**
```
Đọc: overview.md
Thời gian: 10 phút
```

**Bước 2: Hiểu UI/UX Design**
```
Đọc: ui-ux-design.md
Thời gian: 30 phút
```

**Bước 3: Hiểu API Endpoints**
```
Đọc: api-endpoints-reference.md
Thời gian: 15 phút
```

**Bước 4: Bắt Đầu Triển Khai**
```
Đọc: implementation-guide.md (Frontend section)
Xem: client/src/features/admin/users/ (reference)
Thời gian: 2-3 tuần
```

**Bước 5: Tham Chiếu Chi Tiết**
```
Đọc: api-design.md
Thời gian: 10 phút (khi cần)
```

---

### [object Object]ước 1: Hiểu Tổng Quan**
```
Đọc: overview.md
Thời gian: 10 phút
```

**Bước 2: Hiểu Requirements**
```
Đọc: implementation-guide.md (Overview section)
Thời gian: 15 phút
```

**Bước 3: Hiểu User Experience**
```
Đọc: ui-ux-design.md
Thời gian: 20 phút
```

---

## 🔑 Khái Niệm Chính

### API Key là gì?

API Key là một token được sử dụng để xác thực các yêu cầu API từ các ứng dụng bên ngoài.

```
Format: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Display: sk_live_xxxx...xxxx
```

### Các Tính Năng Chính

✅ **Tạo & Quản Lý**
- Tạo API keys mới
- Xem danh sách
- Sửa thông tin
- Xóa keys

✅ **Bảo Mật**
- Key hashing with pepper
- IP whitelist
- Expiration dates
- Scoped permissions

✅ **Theo Dõi**
- Usage statistics
- Usage history
- Top endpoints
- Last used time

✅ **Quản Lý Quyền**
- Admin: Quản lý tất cả
- User: Quản lý của chính mình

---

## 📡 API Endpoints Chính

### Admin

```
GET    /admin/api-keys              - Liệt kê tất cả
GET    /admin/api-keys/:id          - Xem chi tiết
POST   /admin/api-keys              - Tạo mới
POST   /admin/api-keys/:id          - Cập nhật
POST   /admin/api-keys/del          - Xóa
```

### User

```
GET    /api-keys                    - Liệt kê của tôi
GET    /api-keys/:id                - Xem chi tiết
POST   /api-keys                    - Tạo mới
POST   /api-keys/:id                - Cập nhật
POST   /api-keys/del                - Xóa
```

---

## 🎨 UI/UX Chính

### Admin Interface

1. **List Page**
   - Table với filters
   - Bulk actions
   - Search & pagination

2. **Create/Edit Modal**
   - User selection
   - Name, expiration, permissions
   - IP whitelist

3. **Detail Page**
   - Overview, Configuration
   - Usage, History tabs

### User Interface

1. **List Page**
   - Simplified table
   - Create, edit, delete

2. **Create/Edit Modal**
   - Name, expiration, permissions
   - IP whitelist

---

## 🔐 Security Highlights

### Key Storage

```
❌ Never: Plain text in database
✅ Always: Hash (key + pepper) with bcrypt
```

### Key Display

```
❌ Never: Show full key after creation
✅ Always: Show full key only once during creation
✅ Always: Show only prefix (sk_live_xxxx...xxxx) in list
```

### Validation

```
✅ Status check (active/revoked/expired)
✅ Expiration check
✅ IP whitelist validation
✅ Permission validation
✅ Rate limiting
```

---

## 🚀 Triển Khai Nhanh

### Backend (Week 1-2)

```bash
# 1. Database migration
# 2. Implement services
# 3. Implement controllers
# 4. Add middleware
# 5. Testing
```

### Frontend (Week 3-4)

```bash
# 1. Admin pages & components
# 2. User pages & components
# 3. Hooks & services
# 4. Testing
```

### Advanced (Week 5)

```bash
# 1. Usage statistics
# 2. Regenerate & revoke
# 3. Scoped permissions
# 4. Testing
```

---

## 📝 Ví Dụ Nhanh

### Tạo API Key

**Request:**
```bash
curl -X POST "http://localhost:3000/admin/api-keys" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "expiresAt": "2026-12-17T00:00:00Z",
    "permissions": ["USER.VIEW", "FILE.UPLOAD"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ak_123456",
    "name": "Production Key",
    "key": "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "keyPrefix": "sk_live_xxxx...xxxx",
    "status": "active"
  }
}
```

### Liệt Kê API Keys

**Request:**
```bash
curl -X GET "http://localhost:3000/admin/api-keys?take=20&skip=0" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "id": "ak_123456",
        "name": "Production Key",
        "keyPrefix": "sk_live_xxxx...xxxx",
        "status": "active",
        "lastUsedAt": "2025-12-17T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

---

## ❓ Câu Hỏi Thường Gặp

### Q: API Key được lưu ở đâu?

**A:** API Key được hash (key + pepper) với bcrypt và lưu trong database. Full key chỉ được hiển thị một lần khi tạo.

### Q: Pepper là gì?

**A:** Pepper là một secret value được lưu trong environment config (không lưu trong database). Nó được sử dụng để hash API key cùng với bcrypt.

### Q: Làm thế nào để sử dụng API Key?

**A:** Gửi API key trong header `Authorization: Bearer <api_key>` hoặc `X-API-Key: <api_key>`.

### Q: Có thể regenerate API Key không?

**A:** Có, bạn có thể regenerate API key. Key cũ sẽ bị revoke và key mới sẽ được tạo.

### Q: Làm thế nào để xóa API Key?

**A:** Bạn có thể xóa API key bằng endpoint DELETE hoặc revoke nó (set status = revoked).

### Q: Có thể hạn chế IP không?

**A:** Có, bạn có thể thêm IP whitelist khi tạo hoặc cập nhật API key.

### Q: Có thể hạn chế permissions không?

**A:** Có, bạn có thể chỉ định scoped permissions cho API key.

---

## 🔗 Liên Kết Nhanh

- [Overview](./overview.md)
- [API Design](./api-design.md)
- [Technical Spec](./technical-spec.md)
- [Implementation Guide](./implementation-guide.md)
- [UI/UX Design](./ui-ux-design.md)
- [API Endpoints Reference](./api-endpoints-reference.md)
- [README](./README.md)

---

## 📞 Liên Hệ

Nếu có câu hỏi, vui lòng liên hệ team development.

---

**Last Updated:** 2025-12-17  
**Version:** 1.0  
**Status:** Ready for Implementation

