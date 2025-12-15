# Authentication - Technical Specification

## 📋 Mục Tiêu

Hệ thống authentication hoàn chỉnh với:

- User registration và account verification
- Secure login với password hashing
- JWT-based token authentication
- Multi-Factor Authentication (MFA)
- Session management
- Security monitoring
- Password management (change, reset)
- Audit logging và security events

## 🏗️ Kiến Trúc

```
Controller Layer (auth.controller.ts)
    ↓
Service Layer
    ├── AuthService (core authentication logic)
    ├── TokenService (JWT token generation & verification)
    ├── PasswordService (password hashing & validation)
    ├── OtpService (OTP generation & verification)
    ├── SessionService (session management)
    ├── MfaSetupService (MFA setup)
    ├── MfaVerificationService (MFA verification)
    ├── SecurityMonitorService (security monitoring)
    └── UserUtilService (user utilities)
    ↓
Data Layer
    ├── Database (Prisma - User, Session models)
    ├── Cache (Redis - sessions, MFA tokens)
    └── Security Event Logging
```

## 📊 Database Schema

### User Model (Tóm tắt)

```prisma
enum UserStatus {
  active
  inactive
  suspended
}

model User {
  id                    String    @id
  email                 String    @unique
  password              String?
  status                UserStatus
  passwordAttempt       Int       @default(0)
  passwordExpired       DateTime?
  passwordCreated       DateTime?
  lastPasswordChangeAt  DateTime?
  lastLoginAt           DateTime?
  mfaTotpEnabled        Boolean   @default(false)
  totpSecret            String?
  backupCodes           String[]
  backupCodesUsed       String[]
  created               DateTime  @default(now())
  modified              DateTime  @updatedAt

  sessions              Session[]
  roles                 RolePlayer[]
}
```

### Session Model (Tóm tắt)

```prisma
model Session {
  id                String    @id
  token             String    @unique
  createdById       String
  device            String?
  deviceFingerprint String?
  sessionType       String?
  userAgent         String?
  ip                String?
  expired           DateTime
  revoked           Boolean   @default(false)
  lastActivityAt    DateTime?
  created           DateTime  @default(now())

  createdBy         User      @relation(fields: [createdById], references: [id])
}
```

## 🔧 Service Layer

### AuthService

Core authentication logic:

- `login()` - Login với email/password, xử lý MFA, security checks
- `register()` - Đăng ký user mới, gửi OTP
- `verifyAccount()` - Verify account với OTP
- `changePassword()` - Đổi mật khẩu
- `forgotPassword()` - Reset password với OTP
- `refreshToken()` - Refresh access token
- `logout()` - Logout session hiện tại
- `logoutAll()` - Logout tất cả sessions
- `confirmMfaLogin()` - Confirm MFA login
- `loginWithMfa()` - Login với MFA token và OTP
- `getProfile()` - Lấy profile user hiện tại

### TokenService

JWT token management:

- `signJwt()` - Sign JWT token với HS256
- `verifyJwt()` - Verify JWT token
- `createAccessToken()` - Tạo access token với encrypted payload
- `verifyAccessToken()` - Verify và decrypt access token
- `createRefreshToken()` - Tạo refresh token

**Token Structure:**

```typescript
// Access Token Payload (encrypted)
{
  userId: string;
  timestamp: number;
  sessionId: string;
  clientIp: string;
  userAgent: string;
}

// JWT Claims
{
  alg: 'HS256',
  aud: string,      // JWT_AUDIENCE
  iss: string,      // JWT_ISSUER
  sub: string,      // JWT_SUBJECT
  exp: number,      // Expiration time
  iat: number,      // Issued at
  nbf: number,      // Not before
  data: string      // Encrypted payload (AES-256)
}
```

### PasswordService

Password hashing và validation:

- `createPassword()` - Hash password với pepper
- `comparePassword()` - Verify password với hash
- `increasePasswordAttempt()` - Tăng số lần thử password

**Password Security:**

- Hashing: Bun.password (bcrypt-like)
- Pepper: Từ environment config (`PASSWORD_PEPPER`)
- Process: `hash(password + pepper)`
- Verification: `verify(password + pepper, storedHash)`

### SessionService

Session management:

- `revoke()` - Revoke sessions (single hoặc all)
- `revokeMany()` - Revoke multiple sessions
- `list()` - List sessions với filtering

**Session Features:**

- Device fingerprinting (SHA256 hash của userAgent + IP)
- Session type detection (web, mobile, etc.)
- IP tracking
- Last activity tracking
- Expiration management
- Revocation support

### SecurityMonitorService

Security monitoring:

- `evaluateLogin()` - Đánh giá security khi login
  - Device recognition
  - Unknown device detection
  - Block unknown devices (optional)
  - Security event logging

**Security Checks:**

1. Device Recognition

   - Generate device fingerprint từ userAgent + IP
   - Check known devices trong sessions
   - Flag unknown devices

2. Unknown Device Handling
   - Audit warning (optional)
   - Block login (optional)
   - Security event logging

### MFA Services

**MfaSetupService:**

- Setup TOTP secret
- Generate backup codes
- Verify setup

**MfaVerificationService:**

- Verify TOTP code
- Verify backup code
- Complete MFA login

**MfaUtilService:**

- Create MFA session
- Manage MFA cache

## 🔐 Security & Permissions

### Permission System

```
AUTH.LOGIN              // Login
AUTH.REGISTER           // Register
AUTH.CHANGE_PASSWORD    // Change password
AUTH.VIEW_PROFILE       // View own profile
```

### Security Measures

1. **Password Security**

   - Hashing với Bun.password
   - Pepper từ environment config
   - Password expiration (configurable)
   - Password attempt limits (configurable)
   - Password strength validation

2. **Token Security**

   - JWT với HS256 algorithm
   - Encrypted payload (AES-256)
   - Short-lived access tokens (configurable)
   - Long-lived refresh tokens (configurable)
   - Session-based validation
   - Token revocation

3. **MFA Security**

   - TOTP (RFC 6238)
   - Backup codes (10 codes, one-time use)
   - MFA setup tokens (temporary)
   - MFA session tokens (temporary)

4. **Session Security**

   - Device fingerprinting
   - IP tracking
   - Session expiration
   - Revocation support
   - Single session mode (optional)
   - Last activity tracking

5. **Security Monitoring**
   - Device recognition
   - Unknown device detection
   - Suspicious activity detection
   - Security event logging
   - Audit trail

### Authentication Flow

```
1. Login Request
   ├─> Validate email/password
   ├─> Check password attempts
   ├─> Check user status
   ├─> Check password expiration
   ├─> Security monitoring
   │   ├─> Device recognition
   │   ├─> Unknown device check
   │   └─> Security event logging
   ├─> Check MFA requirement
   │   ├─> MFA not enabled → Complete login
   │   └─> MFA enabled → Return MFA token
   └─> Generate tokens & session

2. MFA Login
   ├─> Verify MFA token
   ├─> Verify OTP (TOTP or backup code)
   └─> Complete login

3. Token Refresh
   ├─> Validate refresh token
   ├─> Check session validity
   ├─> Check user status
   └─> Generate new access token

4. Password Reset
   ├─> Send OTP
   ├─> Verify OTP
   ├─> Update password
   └─> Revoke all sessions
```

## 📡 API Endpoints

### Public Endpoints

- `POST /auth/user/register` - Register new user
- `POST /auth/user/verify-account` - Verify account with OTP
- `POST /auth/login` - Login with email/password
- `POST /auth/login/mfa` - Login with MFA
- `POST /auth/login/mfa/confirm` - Confirm MFA login (legacy)
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/forgot-password` - Reset password

### Protected Endpoints

- `POST /auth/logout` - Logout current session
- `POST /auth/logout/all` - Logout all sessions
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user profile

## 🔒 Security Considerations

### Password Hashing

**Process:**

1. Combine password với pepper: `password + PASSWORD_PEPPER`
2. Hash với Bun.password: `Bun.password.hash(combined)`
3. Store hash trong database

**Verification:**

1. Combine password với pepper: `password + PASSWORD_PEPPER`
2. Verify với stored hash: `Bun.password.verify(combined, storedHash)`

**Benefits:**

- Pepper không lưu trong database
- Ngay cả khi database bị leak, attacker không thể recover passwords
- Tương tự như cách xử lý password với salt/pepper

### Token Security

**Access Token:**

- Short-lived (configurable, default: 15 minutes)
- Encrypted payload (AES-256)
- Session-based validation
- Revocable

**Refresh Token:**

- Long-lived (configurable, default: 7 days)
- Stored in database (Session model)
- Revocable
- Expiration tracking

**Token Payload Encryption:**

- Encrypt sensitive data (userId, sessionId, etc.)
- Use AES-256 encryption
- Decrypt on verification

### MFA Security

**TOTP:**

- RFC 6238 compliant
- 6-digit codes
- 30-second window
- Secret stored encrypted

**Backup Codes:**

- 10 codes generated
- One-time use
- Hashed storage
- Marked as used after verification

### Session Security

**Device Fingerprinting:**

- SHA256 hash của `userAgent + IP`
- Stored in session
- Used for device recognition

**Session Management:**

- Expiration tracking
- Revocation support
- Single session mode (optional)
- Last activity tracking

### Security Monitoring

**Device Recognition:**

- Generate fingerprint từ userAgent + IP
- Check known devices
- Flag unknown devices
- Optional blocking

**Security Events:**

- Login success/failed
- Password changed
- Password reset
- Suspicious activity
- Unknown device login

## 🚀 Cải Tiến Có Thể Thêm

### Phase 1: Enhanced Security

1. **OAuth Integration**

   - Google OAuth
   - GitHub OAuth
   - Social login support

2. **Advanced MFA**

   - SMS-based OTP
   - Email-based OTP
   - Hardware tokens (FIDO2/WebAuthn)

3. **Password Policies**

   - Password strength requirements
   - Password history (prevent reuse)
   - Password complexity rules

4. **Account Security**
   - Account lockout after failed attempts
   - Suspicious login notifications
   - Login history tracking

### Phase 2: User Experience

1. **Remember Me**

   - Long-lived sessions
   - Device trust
   - Auto-login

2. **Social Features**

   - Profile management
   - Avatar upload
   - Account settings

3. **Notifications**
   - Email notifications for security events
   - Push notifications
   - SMS notifications

### Phase 3: Enterprise Features

1. **SSO (Single Sign-On)**

   - SAML support
   - LDAP integration
   - Active Directory integration

2. **Advanced Session Management**

   - Concurrent session limits
   - Session timeout policies
   - Session activity monitoring

3. **Compliance**
   - GDPR compliance
   - Audit trail
   - Data retention policies

## 📝 Notes

- Hệ thống authentication đã được implement đầy đủ
- Tất cả security measures đã được áp dụng
- Audit logging và security events đã được tích hợp
- Rate limiting được áp dụng cho các endpoint quan trọng
