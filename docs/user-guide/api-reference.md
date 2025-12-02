# API Reference (Hiện Hành)

Tài liệu liệt kê các endpoint **đang tồn tại trong codebase**. Các API về tài khoản/giao dịch/đầu tư/budget đã bị gỡ
khỏi tài liệu vì chưa được triển khai.

## 1. Base URL & Swagger

- Base URL: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/docs`
- Tất cả response (trừ file download) tuân theo wrapper:

```json
{
  "status": "success",
  "data": { ... } // hoặc null
}
```

Khi có lỗi, server trả về:

```json
{
  "status": "error",
  "message": "Error summary",
  "code": "ErrCode",
  "errors": "... (tùy chọn)"
}
```

## 2. Authentication Core (`/auth`)

| Method | Path                        | Mô tả                                                 | Auth                         |
|--------|-----------------------------|-------------------------------------------------------|------------------------------|
| POST   | `/auth/user/register`       | Đăng ký bằng email/password, trả về `otpToken`        | ❌                            |
| POST   | `/auth/user/verify-account` | Xác minh OTP để kích hoạt tài khoản                   | ❌                            |
| POST   | `/auth/login`               | Đăng nhập, trả về access/refresh token + session info | ❌ (rate-limit theo IP/email) |
| POST   | `/auth/login/mfa/confirm`   | Xác nhận đăng nhập khi bật MFA                        | ❌                            |
| POST   | `/auth/refresh-token`       | Lấy access token mới từ refresh token                 | ❌                            |
| POST   | `/auth/logout`              | Đăng xuất phiên hiện tại                              | ✅                            |
| POST   | `/auth/logout/all`          | Đăng xuất tất cả phiên                                | ✅                            |
| GET    | `/auth/me`                  | Lấy profile user hiện tại                             | ✅                            |
| POST   | `/auth/change-password`     | Đổi mật khẩu đang đăng nhập                           | ✅                            |
| POST   | `/auth/forgot-password`     | Đặt lại mật khẩu bằng OTP                             | ❌ (sử dụng otpToken)         |

**Ví dụ login**

```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "captchaToken": "optional"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
  "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": null,
      "permissions": ["SESSION.VIEW"]
    },
    "session": {
      "id": "session-id",
      "createdAt": "ISO8601",
      "ip": "1.2.3.4",
      "userAgent": "Mozilla/5.0"
    }
  }
}
```

## 3. OTP Service (`/auth/otp`)

- `POST /auth/otp`

```json
{
  "email": "user@example.com",
  "purpose": "register" | "forgot_password" | "reset_mfa"
}
```

Nếu điều kiện hợp lệ, API trả `otpToken` để dùng ở bước xác minh tương ứng. Khi `purpose = register`, hệ thống theo dõi
số lần request OTP để tránh spam.

## 4. MFA & Backup Codes

### `/auth/mfa`

| Method | Path            | Mô tả                                          |
|--------|-----------------|------------------------------------------------|
| POST   | `setup/request` | Sinh `mfaToken` + `totpSecret` (yêu cầu login) |
| POST   | `setup/confirm` | Gửi `mfaToken` + OTP 6 số để bật MFA           |
| POST   | `reset`         | Xác nhận reset MFA bằng OTP gửi email          |
| POST   | `disable`       | Tắt MFA (OTP hoặc backup code)                 |
| GET    | `status`        | Kiểm tra trạng thái MFA của user hiện tại      |

### `/auth/mfa/backup-codes`

| Method | Path        | Mô tả                                                    |
|--------|-------------|----------------------------------------------------------|
| POST   | `generate`  | Sinh 10 backup codes, yêu cầu OTP để xác thực            |
| POST   | `verify`    | Sử dụng backup code trong luồng login (khi không có OTP) |
| GET    | `remaining` | Trả về số backup code còn lại                            |

## 5. OAuth

| Method | Path                        | Mô tả                                     |
|--------|-----------------------------|-------------------------------------------|
| POST   | `/auth/oauth/google`        | Đăng nhập bằng Google ID Token            |
| POST   | `/auth/oauth/link-telegram` | Link tài khoản Telegram vào user hiện tại |

## 6. Admin APIs (`/admin`)

Tất cả yêu cầu quyền phù hợp, áp dụng policy-based authorization.

### I18n (`/admin/i18n`)

- GET `/` – phân trang danh sách key/value
- POST `/` – upsert key
- POST `/del` – xóa nhiều key
- POST `/import` – import từ file Excel
- GET `/export` – xuất danh sách key (stream file)

### Roles & Permissions

- Roles (`/admin/roles`)
    - GET `/` – danh sách role (có search)
    - POST `/` – upsert role + permissions
    - POST `/del` – xóa nhiều role
- Permissions (`/admin/permissions`)
    - GET `/` – trả danh sách permission, có thể filter theo `roleId`

### Settings (`/admin/settings`)

- GET `/` – toàn bộ setting
- POST `/:id` – cập nhật setting cụ thể (ví dụ rate limit, mật khẩu)

### Sessions (`/admin/sessions`)

- GET `/` – liệt kê session (nếu có `SESSION.VIEW_ALL` sẽ thấy toàn bộ; không thì chỉ thấy session của mình)
- POST `/:id/revoke` – revoke một session. Policy yêu cầu:
    - `SESSION.REVOKE_ALL`, hoặc
    - `SESSION.REVOKE` + `isSelf` (chỉ được revoke session do chính mình tạo)

## 7. Misc Module

### `/misc/health`

Trả về tình trạng hệ thống:

```json
{
  "status": "ok" | "error",
  "details": {
    "memory": { "usage": 43, "total": "3.2 GB", ... },
    "redis": { "status": "ok" },
    "db": { "status": "ok" },
    "disk": { "status": "ok" }
  }
}
```

### `/misc/system-info`

Thông tin chi tiết về disk, uptime, memory, CPU, runtime. Khi lỗi sẽ trả `status: "error"` và thông điệp.

### `/misc/time`

Trả timestamp hiện tại:

```json
{
  "t": 1730001112223,
  "time": "Thu, 27 Nov, 10:35:01 +07:00"
}
```

### `/misc/version`

```json
{
  "commitHash": "abc123",
  "buildDate": 1730001000,
  "buildNumber": "build-42"
}
```

### Captcha (`/misc/captcha`)

- GET `/generate`

Query options:

| Param                                        | Default  | Mô tả              |
|----------------------------------------------|----------|--------------------|
| `type`                                       | `text`   | `text` hoặc `math` |
| `width`, `height`, `length`, `fontSize`, ... | optional | cấu hình output    |

Response chứa `token` và SVG.

- POST `/verify`

```json
{
  "token": "captcha-token",
  "userInput": "abc123"
}
```

Trả về `{ "success": true, "data": { "isValid": true } }`.

### File (`/misc/file`)

| Method | Path                            | Mô tả                                                             |
|--------|---------------------------------|-------------------------------------------------------------------|
| POST   | `/misc/file/upload`             | Upload hình ảnh (requires auth). Body multipart với field `file`. |
| GET    | `/misc/file/download/:filename` | Trả file dạng stream.                                             |
| GET    | `/misc/file/storage`            | Trạng thái storage hiện tại (file vs S3, env ready).              |

## 8. Error Codes & Status

| Code                     | Ý nghĩa                                   |
|--------------------------|-------------------------------------------|
| `ErrCode.BadRequest`     | Payload sai định dạng, thiếu trường       |
| `ErrCode.Unauthorized`   | Thiếu JWT hoặc refresh token không hợp lệ |
| `ErrCode.Forbidden`      | Không đủ quyền (policy fail)              |
| `ErrCode.ItemNotFound`   | Resource không tồn tại                    |
| `ErrCode.TooManyRequest` | Vi phạm rate limit (login/register)       |

HTTP status tương ứng: 200/400/401/403/404/429/500.

## 9. cURL nhanh

```bash
# Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Healthcheck
curl http://localhost:3000/api/misc/health

# Tạo backup codes (đã login)
curl -X POST http://localhost:3000/api/auth/mfa/backup-codes/generate \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"otp":"123456"}'
```

## 10. Lưu ý khi mở rộng

- Thêm endpoint mới → cập nhật Swagger (`DOC_TAG`) + file này.
- Đảm bảo response nối với `ResWrapper` để frontend/Swagger đồng bộ.
- Nếu endpoint yêu cầu role mới, bổ sung mô tả trong `docs/technology/coding-rules.md` và
  `docs/technology/architecture.md`.

