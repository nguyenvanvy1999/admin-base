# Authentication - Tổng Quan

## 📋 Hiện Trạng

Hệ thống authentication đã được implement đầy đủ với các tính năng:

### ✅ Đã Implement

- **Đăng ký tài khoản**: `POST /auth/user/register`
  - Tạo user mới với status inactive
  - Gửi OTP qua email để verify
  - Tự động gán role mặc định (user)

- **Xác thực tài khoản**: `POST /auth/user/verify-account`
  - Verify OTP và kích hoạt tài khoản
  - Chuyển status từ inactive sang active

- **Đăng nhập**: `POST /auth/login`
  - Login với email/password
  - Hỗ trợ MFA (Multi-Factor Authentication)
  - Security monitoring (device recognition, suspicious activity)
  - Rate limiting
  - Trả về access token và refresh token

- **MFA Login**: `POST /auth/login/mfa`
  - Login với MFA token và OTP
  - Hỗ trợ TOTP và backup codes

- **Refresh token**: `POST /auth/refresh-token`
  - Làm mới access token
  - Validate session và user status

- **Đăng xuất**: `POST /auth/logout`
  - Revoke session hiện tại

- **Đăng xuất tất cả**: `POST /auth/logout/all`
  - Revoke tất cả sessions của user

- **Đổi mật khẩu**: `POST /auth/change-password`
  - Đổi mật khẩu với validation
  - Rate limiting

- **Quên mật khẩu**: `POST /auth/forgot-password`
  - Reset password với OTP
  - Revoke tất cả sessions sau khi reset

- **Lấy profile**: `GET /auth/me`
  - Lấy thông tin user hiện tại
  - Bao gồm permissions

### 🔐 Security Features

- **Password hashing**: Sử dụng Bun.password với pepper
- **JWT tokens**: Access token và refresh token
- **Session management**: Quản lý sessions với device fingerprint
- **MFA support**: TOTP và backup codes
- **Security monitoring**: Device recognition, suspicious activity detection
- **Rate limiting**: Bảo vệ các endpoint quan trọng
- **Audit logging**: Log tất cả authentication events
- **Security events**: Track security events (login success/failed, password changed, etc.)

### 📁 Code Structure

```
server/src/
├── service/auth/
│   ├── auth.service.ts              # Core authentication logic
│   ├── auth.middleware.ts           # Authentication middleware
│   ├── auth-util.service.ts         # Token & user utilities
│   ├── session.service.ts           # Session management
│   ├── password.service.ts          # Password hashing & validation
│   ├── password-validation.service.ts
│   ├── otp.service.ts               # OTP generation & verification
│   ├── mfa-setup.service.ts         # MFA setup
│   ├── mfa-verification.service.ts  # MFA verification
│   ├── mfa-backup.service.ts        # Backup codes
│   ├── mfa-util.service.ts          # MFA utilities
│   ├── security-monitor.service.ts  # Security monitoring
│   ├── encrypt.service.ts           # Encryption utilities
│   └── authorization/               # Authorization system
│       ├── authorize.middleware.ts
│       ├── predicates.ts
│       └── policy-types.ts
└── modules/auth/
    └── auth.controller.ts           # API endpoints
```

## 🎯 Kiến Trúc

### Authentication Flow

```
1. User Registration
   └─> Create user (inactive)
   └─> Send OTP email
   └─> Verify OTP → Activate account

2. Login Flow
   └─> Validate credentials
   └─> Security check (device, IP, etc.)
   └─> Check MFA requirement
   ├─> No MFA → Return tokens
   └─> MFA required → Return MFA token
       └─> Verify MFA → Return tokens

3. Token Refresh
   └─> Validate refresh token
   └─> Check session validity
   └─> Generate new access token

4. Password Reset
   └─> Send OTP
   └─> Verify OTP
   └─> Update password
   └─> Revoke all sessions
```

### Security Layers

1. **Password Security**
   - Hashing với Bun.password
   - Pepper từ environment config
   - Password expiration
   - Password attempt limits

2. **Token Security**
   - JWT với HS256
   - Encrypted payload (AES-256)
   - Short-lived access tokens
   - Long-lived refresh tokens
   - Session-based validation

3. **MFA Security**
   - TOTP (Time-based One-Time Password)
   - Backup codes
   - MFA setup tokens

4. **Session Security**
   - Device fingerprinting
   - IP tracking
   - Session expiration
   - Revocation support
   - Single session mode (optional)

5. **Security Monitoring**
   - Device recognition
   - Unknown device blocking (optional)
   - Suspicious activity detection
   - Security event logging

## 📚 Tài Liệu Chi Tiết

- [Technical Specification](./technical-spec.md) - Spec kỹ thuật chi tiết

## ⚠️ Lưu Ý

Hệ thống authentication đã được implement đầy đủ và đang hoạt động. Tài liệu này mô tả hiện trạng và kiến trúc hiện tại.

## 🔗 Tài Liệu Liên Quan

- [Rate Limit](../rate-limiting/overview.md) - Rate limiting cho auth endpoints
- [IP Whitelist](../ip-whitelist/overview.md) - IP whitelist cho user access
- [Feature Summary](../summary.md) - Tổng quan tính năng

