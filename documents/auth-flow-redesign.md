# Tài liệu Kỹ thuật: Hệ thống Authentication & Authorization

> **Mục đích**: Tài liệu này mô tả chi tiết kiến trúc, luồng xử lý, và các quy tắc bảo mật của hệ thống authentication và authorization. Được sử dụng làm chuẩn triển khai và tham chiếu cho việc phát triển, bảo trì, và audit bảo mật.

> **Phạm vi**: Password login, OAuth (Google), MFA (TOTP/Backup Code/Email OTP), Device Verification, Password Management, Session Management, và Authorization.

> **Cập nhật lần cuối**: Dựa trên codebase tại `server/src/services/auth/` và `server/src/modules/auth/`

---

## Mục lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng Authentication](#2-luồng-authentication)
3. [MFA (Multi-Factor Authentication)](#3-mfa-multi-factor-authentication)
4. [OAuth Integration](#4-oauth-integration)
5. [Password Management](#5-password-management)
6. [Session Management](#6-session-management)
7. [Authorization](#7-authorization)
8. [Security Features](#8-security-features)
9. [API Reference](#9-api-reference)
10. [Implementation Status](#10-implementation-status)
11. [Security Audit & Recommendations](#11-security-audit--recommendations)
12. [Code Quality & Best Practices](#12-code-quality--best-practices)

---

## 1. Tổng quan Kiến trúc

### 1.1. Core Concepts

#### A. Auth Transaction (`AuthTx`)

Một "phiên" đăng nhập chưa hoàn tất, lưu trong Redis với TTL 5 phút (300 giây).

**Cấu trúc** (`server/src/types/auth.types.ts`):

```typescript
interface AuthTx {
  id: string; // UUID
  userId: string;
  createdAt: number; // Timestamp
  state: AuthTxState; // Trạng thái hiện tại

  // Security binding
  ipHash?: string; // SHA256 hash của IP
  uaHash?: string; // SHA256 hash của User-Agent

  // Brute-force protection
  challengeAttempts: number; // Số lần thử challenge

  // Security evaluation
  securityResult?: SecurityCheckResult;

  // MFA enrollment data
  enroll?: {
    enrollToken: string;
    tempTotpSecret: string;
    startedAt: number;
  };

  // Email OTP context
  emailOtpToken?: string;

  // Device verification context
  deviceVerifyToken?: string;
}
```

**States** (`server/src/services/auth/constants.ts`):

- `PASSWORD_VERIFIED`: Password đã verify, chưa quyết định next step
- `CHALLENGE_MFA_REQUIRED`: Yêu cầu MFA (TOTP/backup code)
- `CHALLENGE_MFA_ENROLL`: Bắt buộc enroll TOTP
- `CHALLENGE_DEVICE_VERIFY`: Xác minh thiết bị mới

#### B. Challenge Types

Các loại challenge được hỗ trợ:

- `MFA_TOTP`: Nhập OTP từ authenticator app
- `MFA_BACKUP_CODE`: Nhập backup code (one-time use)
- `MFA_EMAIL_OTP`: Nhập OTP gửi qua email (fallback khi risk HIGH)
- `MFA_ENROLL`: Bắt buộc setup TOTP
- `DEVICE_VERIFY`: Xác minh thiết bị mới qua email OTP

#### C. Response Format

Tất cả endpoints trả về `AuthResponse`:

```typescript
type AuthResponse =
  | {
      status: "COMPLETED";
      session: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        sessionId: string;
        user: UserDto;
      };
      backupCodes?: string[]; // Chỉ có khi enroll MFA
    }
  | {
      status: "CHALLENGE";
      authTxId: string;
      challenge: ChallengeDto;
    };
```

### 1.2. Service Architecture

**Core Services** (`server/src/services/auth/`):

1. **AuthFlowService**: Orchestrator chính cho login flow

   - `startLogin()`: Bước đầu tiên (password/OAuth verification)
   - `completeChallenge()`: Xử lý MFA/device verification
   - `enrollStart()` / `enrollConfirm()`: MFA enrollment
   - `resolveNextStep()`: Decision function duy nhất

2. **AuthTxService**: Quản lý auth transactions trong Redis

   - Create, get, update, delete
   - Binding validation (IP/UA)
   - Challenge attempts tracking

3. **MfaService**: Logic MFA

   - TOTP verification
   - Backup code generation/verification/consumption
   - Email OTP integration

4. **PasswordService**: Password management

   - Hashing (Bun.password với pepper)
   - Verification với attempt tracking
   - Expiration validation

5. **SessionService**: Session management

   - Create, revoke, list
   - Device fingerprinting

6. **SecurityMonitorService**: Risk evaluation

   - Device recognition
   - Unknown device detection
   - Risk level calculation

7. **OAuthService**: OAuth integration

   - Google OAuth login
   - Telegram account linking

8. **AuthorizationService**: Permission checking
   - Policy-based authorization
   - Role-based access control

---

## 2. Luồng Authentication

### 2.1. Password Login Flow

#### Endpoint: `POST /auth/login`

**Request**:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "captcha": {
    "token": "captcha-token",
    "userInput": "ABC123"
  }
}
```

**Flow** (`server/src/services/auth/auth-flow.service.ts:132-396`):

1. **Email Normalization & User Lookup**

   - Normalize email (lowercase, trim)
   - Load user từ database
   - Nếu không tìm thấy → throw `UserNotFound` (không leak thông tin)

2. **Captcha Validation** (nếu enabled)

   - Check setting: `CAPTCHA_REQUIRED`
   - Validate captcha token và user input
   - Nếu invalid → audit log + throw `InvalidCaptcha`

3. **Password Verification**

   - Check password attempt limit (nếu enabled)
   - Verify password với pepper: `password + PASSWORD_PEPPER`
   - Track attempts: increment `passwordAttempt` nếu sai
   - Nếu sai → audit log + throw `InvalidCredentials`

4. **User Status Check**

   - Verify `user.status === ACTIVE`
   - Nếu không active → throw `UserNotActive`

5. **Password Expiration Check** (nếu enabled)

   - Verify `passwordExpired` date
   - Nếu expired → throw `PasswordExpired`

6. **Security Evaluation**

   - Call `securityMonitorService.evaluateLogin()`
   - Device fingerprinting: `SHA256(userAgent + IP)`
   - Check known devices
   - Calculate risk: `LOW` | `MEDIUM` | `HIGH`
   - Nếu `action === 'block'` → throw `LoginBlocked`

7. **Create Auth Transaction**

   - Generate `authTxId` (UUID)
   - Store trong Redis với TTL 300s
   - Bind IP/UA hash

8. **Resolve Next Step**

   - Call `resolveNextStep()` với:
     - `mfaRequired`: Setting từ database
     - `riskBased`: Setting từ database
     - `deviceVerificationEnabled`: Setting từ database
     - `mfaEnrollRequired`: Flag từ user record
   - Return: `COMPLETE` | `MFA_CHALLENGE` | `ENROLL_MFA` | `DEVICE_VERIFY`

9. **Handle Next Step**
   - Nếu `COMPLETE`: Delete authTx, issue session, return `COMPLETED`
   - Nếu `ENROLL_MFA`:
     - Risk HIGH + chưa có TOTP → Send email OTP, set state `CHALLENGE_MFA_REQUIRED`
     - Bình thường → Set state `CHALLENGE_MFA_ENROLL`, return `CHALLENGE: MFA_ENROLL`
   - Nếu `MFA_CHALLENGE`: Set state `CHALLENGE_MFA_REQUIRED`, return `CHALLENGE: MFA_TOTP`
   - Nếu `DEVICE_VERIFY`: Send email OTP, set state `CHALLENGE_DEVICE_VERIFY`

**Response Examples**:

```json
// Completed immediately
{
  "status": "COMPLETED",
  "session": {
    "accessToken": "eyJ...",
    "refreshToken": "abc123...",
    "expiresIn": 3600,
    "sessionId": "sess_...",
    "user": { ... }
  }
}

// MFA Challenge required
{
  "status": "CHALLENGE",
  "authTxId": "tx-uuid",
  "challenge": {
    "type": "MFA_TOTP",
    "allowBackupCode": true
  }
}

// MFA Enrollment required
{
  "status": "CHALLENGE",
  "authTxId": "tx-uuid",
  "challenge": {
    "type": "MFA_ENROLL",
    "methods": ["totp"],
    "backupCodesWillBeGenerated": true
  }
}
```

### 2.2. MFA Challenge Flow

#### Endpoint: `POST /auth/login/challenge`

**Request**:

```json
{
  "authTxId": "tx-uuid",
  "type": "MFA_TOTP" | "MFA_BACKUP_CODE" | "MFA_EMAIL_OTP" | "DEVICE_VERIFY",
  "code": "123456" | "BACKUP01" | "654321"
}
```

**Flow** (`server/src/services/auth/auth-flow.service.ts:398-512`):

1. **Load Auth Transaction**

   - Get từ Redis
   - Nếu không tồn tại → throw `AuthTxExpired`

2. **Binding Validation**

   - Verify IP hash match
   - Verify UA hash match (nếu có)
   - Nếu mismatch → throw `AuthTxBindingMismatch`

3. **State Validation**

   - Verify state: `CHALLENGE_MFA_REQUIRED` hoặc `CHALLENGE_DEVICE_VERIFY`
   - Nếu invalid → throw `InvalidState`

4. **Attempt Limit Check**

   - Verify `challengeAttempts < 5`
   - Nếu vượt → throw `TooManyAttempts`

5. **Code Verification**

   - `MFA_TOTP`: Verify với `user.totpSecret` bằng `otplib.authenticator.verify()`
   - `MFA_BACKUP_CODE`: Verify và consume backup code (atomic operation)
   - `MFA_EMAIL_OTP`: Verify với `emailOtpToken` từ authTx
   - `DEVICE_VERIFY`: Verify với `deviceVerifyToken` từ authTx

6. **On Failure**

   - Increment `challengeAttempts`
   - Audit log: `mfa_failed`
   - Throw appropriate error

7. **On Success**
   - Delete authTx
   - Issue session (call `completeLogin()`)
   - Audit log: `mfa_verified`
   - Return `COMPLETED`

### 2.3. MFA Enrollment Flow

#### A. Start Enrollment: `POST /auth/mfa/enroll/start`

**Request**:

```json
{
  "authTxId": "tx-uuid"
}
```

**Flow** (`server/src/services/auth/auth-flow.service.ts:514-564`):

1. Load authTx, verify binding, verify state `CHALLENGE_MFA_ENROLL`
2. Generate temporary TOTP secret: `authenticator.generateSecret().toUpperCase()`
3. Generate `otpauthUrl` cho QR code
4. Generate `enrollToken` (UUID)
5. Attach enroll data vào authTx
6. Audit log: `mfa_setup_started`
7. Return: `{ authTxId, enrollToken, otpauthUrl }`

#### B. Confirm Enrollment: `POST /auth/mfa/enroll/confirm`

**Request**:

```json
{
  "authTxId": "tx-uuid",
  "enrollToken": "enroll-token",
  "otp": "123456"
}
```

**Flow** (`server/src/services/auth/auth-flow.service.ts:566-640`):

1. Load authTx, verify binding, verify state `CHALLENGE_MFA_ENROLL`
2. Verify `enrollToken` match
3. Verify OTP với `tempTotpSecret`
4. Nếu invalid → increment attempts, throw error
5. Generate backup code (8 chars, uppercase)
6. Hash backup code: `Bun.password.hash(code)`
7. Save to database:
   - Update user: `totpSecret`, `mfaTotpEnabled = true`, `mfaEnrollRequired = false`
   - Upsert `MfaBackupCode`: store hashed code
8. Delete authTx
9. Issue session
10. Audit log: `mfa_setup_completed`
11. Return: `{ status: "COMPLETED", session, backupCodes: [code] }`

> **Lưu ý**: Backup code chỉ được trả về 1 lần duy nhất khi enroll. User phải lưu lại ngay.

---

## 3. MFA (Multi-Factor Authentication)

### 3.1. TOTP (Time-based One-Time Password)

**Implementation**: Sử dụng `otplib` library

**Secret Storage**:

- Lưu trong `user.totpSecret` (plain text, vì cần để verify)
- Secret được generate khi enroll: `authenticator.generateSecret().toUpperCase()`

**Verification** (`server/src/services/auth/auth-flow.service.ts:429-434`):

```typescript
ok = authenticator.verify({
  secret: user.totpSecret,
  token: code,
});
```

**Issuer**: "Admin Base Portal" (hardcoded trong `enrollStart()`)

### 3.2. Backup Codes

**Generation** (`server/src/services/auth/mfa.service.ts:47-50`):

- Format: 8 ký tự, uppercase
- Generated bằng: `idUtil.token8().toUpperCase()`

**Storage**:

- Table: `MfaBackupCode`
- Hash: `Bun.password.hash(code)` (bcrypt-like)
- Single-use: Mark `usedAt` khi verify thành công

**Verification** (`server/src/services/auth/mfa.service.ts:24-45`):

1. Find unused backup code: `where: { userId, usedAt: null }`
2. Verify hash: `Bun.password.verify(code, codeHash)`
3. If match: Update `usedAt = now()` (atomic)
4. Return boolean

**Regeneration**: `POST /auth/mfa/backup-codes/regenerate`

- Requires: User đã enable MFA
- Invalidate old codes (upsert với new hash)
- Return new backup code (1 code duy nhất)

### 3.3. Email OTP (Fallback)

**Use Cases**:

1. Risk HIGH + user chưa có TOTP → Fallback enrollment
2. Device verification cho new device

**Flow**:

1. Send OTP via email queue
2. Store `otpToken` trong authTx
3. User submit OTP trong challenge endpoint
4. Verify với `otpService.verifyOtp(otpToken, purpose, code)`

**Purpose Types** (`server/src/share/constants/index.ts`):

- `MFA_LOGIN`: MFA challenge via email
- `DEVICE_VERIFY`: Device verification

### 3.4. MFA Disable

**Endpoint**: `POST /auth/mfa/disable`

**Requirements**:

- User đã enable MFA
- Verify password
- Verify TOTP code

**Flow** (`server/src/services/auth/auth-flow.service.ts:690-780`):

1. Verify password
2. Verify TOTP code
3. Update user: `mfaTotpEnabled = false`, `totpSecret = null`
4. Revoke all sessions
5. Audit log: `mfa_disabled`

---

## 4. OAuth Integration

### 4.1. Google OAuth Login

**Endpoint**: `POST /auth/oauth/google` (trong `server/src/modules/oauth/oauth.controller.ts`)

**Request**:

```json
{
  "idToken": "google-id-token"
}
```

**Flow** (`server/src/services/auth/oauth.service.ts:79-341`):

1. **Verify Google ID Token**

   - Load provider config từ database
   - Verify với Google OAuth2Client
   - Extract payload: `email`, `sub` (Google ID)

2. **Resolve User**

   - Find user by email
   - Nếu chưa có → Auto-create user (status: ACTIVE, password: empty)
   - Link Google account: Create `UserAuthProvider` record

3. **User Status Check**

   - Verify `user.status === ACTIVE`

4. **Security Evaluation**

   - Call `securityMonitorService.evaluateLogin()`
   - Nếu block → throw error

5. **Create Auth Transaction**

   - State: `PASSWORD_VERIFIED` (tương đương password verified)

6. **Resolve Next Step**

   - Call `resolveNextStep()` (chung với password login)
   - Support: MFA challenge, MFA enroll

7. **Return Response**
   - `COMPLETED` hoặc `CHALLENGE` (giống password login)

**Lưu ý**: OAuth login cũng phải tuân thủ MFA policy (required, risk-based, enroll required).

### 4.2. Telegram Account Linking

**Endpoint**: `POST /auth/oauth/link-telegram` (requires auth)

**Flow** (`server/src/services/auth/oauth.service.ts:343-447`):

1. Verify Telegram login data (HMAC-SHA256)
2. Check duplicate (user hoặc provider ID)
3. Create `UserAuthProvider` record
4. Audit log

**Lưu ý**: Chỉ có "link account", chưa có Telegram login flow (như Google).

---

## 5. Password Management

### 5.1. Password Hashing

**Algorithm**: Bun.password (bcrypt-like)

**Pepper**: `PASSWORD_PEPPER` từ environment

**Process** (`server/src/services/auth/password.service.ts:31-49`):

```typescript
const passwordWithPepper = password + env.PASSWORD_PEPPER;
const passwordHash = await Bun.password.hash(passwordWithPepper);
```

**Expiration**: Configurable via `PASSWORD_EXPIRED` setting

### 5.2. Password Verification

**Flow** (`server/src/services/auth/password.service.ts:79-91`):

1. Compare: `Bun.password.verify(password + pepper, hash)`
2. Track attempts: Increment `passwordAttempt` nếu sai
3. Check limit: `passwordAttempt >= PASSWORD_MAX_ATTEMPT` → throw error

### 5.3. Change Password

**Endpoint**: `POST /auth/change-password` (requires auth)

**Flow** (`server/src/services/auth/auth.service.ts:141-192`):

1. Verify old password (nếu user có password)
2. Create new password hash
3. Update: `password`, `passwordExpired`, `lastPasswordChangeAt`
4. Revoke sessions (nếu `REVOKE_SESSIONS_ON_PASSWORD_CHANGE = true`)
5. Audit log: `password_changed`

### 5.4. Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Flow** (`server/src/services/auth/auth.service.ts:194-245`):

1. Verify OTP: `otpService.verifyOtp(otpToken, FORGOT_PASSWORD, otp)`
2. Create new password hash
3. Update password
4. Revoke all sessions
5. Audit log: `password_reset_completed`

---

## 6. Session Management

### 6.1. Session Creation

**Flow** (`server/src/services/auth/auth-util.service.ts:156-227`):

1. **Single Session Mode** (nếu enabled):

   - Revoke all existing sessions

2. **Generate Tokens**:

   - Access token: JWT với encrypted payload (AES-256)
   - Refresh token: Random 32-char string

3. **Create Session Record**:

   - Store trong database: `Session` table
   - Fields: `id`, `token` (refresh token), `expired`, `device`, `ip`, `deviceFingerprint`, `sessionType`

4. **Update User**:

   - `lastLoginAt = now()`

5. **GeoIP Queue**:
   - Async job để update session location từ IP

### 6.2. Access Token

**Structure** (`server/src/services/auth/auth-util.service.ts:40-104`):

- JWT với claims: `iss`, `aud`, `sub`, `exp`, `iat`, `nbf`
- Payload encrypted: `AES-256(JSON.stringify({ userId, sessionId, timestamp, clientIp, userAgent }))`
- Secret: `JWT_ACCESS_TOKEN_SECRET_KEY`

**Verification** (`server/src/services/auth/middleware.ts:16-63`):

1. Extract từ `Authorization: Bearer <token>`
2. Verify JWT signature
3. Decrypt payload
4. Load user từ cache hoặc database
5. Check user status: `ACTIVE`
6. Load permissions và roles
7. Set `currentUser` trong context

### 6.3. Refresh Token

**Endpoint**: `POST /auth/refresh-token`

**Flow** (`server/src/services/auth/auth.service.ts:298-371`):

1. Find session by refresh token
2. Verify: not revoked, not expired, user active
3. Generate new access token
4. Return new access token (refresh token giữ nguyên)

### 6.4. Session Revocation

**Endpoints**:

- `POST /auth/logout`: Revoke current session
- `POST /auth/logout/all`: Revoke all sessions

**Triggers**:

- User logout (manual)
- Password change (nếu enabled)
- MFA disable
- Forgot password

**Implementation** (`server/src/services/auth/session.service.ts:9-20`):

- Update `Session.revoked = true`
- Support revoke by `sessionIds` hoặc all sessions của user

---

## 7. Authorization

### 7.1. Permission System

**Architecture** (`server/src/services/auth/authorization.service.ts`):

**Core Concepts**:

- **Roles**: Group of permissions (stored in `Role` table)
- **Permissions**: Granular access rights (stored in `Permission` table)
- **RolePlayer**: User-Role assignment (with optional expiration)
- **RolePermission**: Role-Permission mapping

**Permission Loading** (`server/src/services/auth/auth-util.service.ts:141-154`):

1. Get active role IDs: `RolePlayer` where `expiresAt IS NULL OR expiresAt > now()`
2. Get permissions: `RolePermission` where `roleId IN (activeRoleIds)`
3. Return unique permission titles

### 7.2. Policy-Based Authorization

**API** (`server/src/services/auth/authorization.service.ts`):

**Predicates**:

- `has(permission)`: Check user has permission
- `isRole(roleName)`: Check user has role
- `isSelf(selectUserId)`: Check user is accessing own resource
- `resourceAttr(predicate)`: Check resource attribute

**Composition**:

- `allOf(...predicates)`: All must pass
- `anyOf(...predicates)`: Any must pass
- `notOf(predicate)`: Negate

**Usage**:

```typescript
app.use(
  authorize(
    allOf(
      has("user:read"),
      anyOf(
        isSelf((ctx) => ctx.params.userId),
        isRole("admin")
      )
    )
  )
);
```

### 7.3. Middleware Integration

**Auth Check** (`server/src/services/auth/middleware.ts`):

- Extract access token từ header
- Verify và decrypt
- Load user + permissions
- Set `currentUser` trong context
- Cache user trong Redis (key: `sessionId`)

---

## 8. Security Features

### 8.1. Rate Limiting

**Implementation**: `server/src/services/rate-limit/auth-rate-limit.config.ts`

**Applied to**:

- Login endpoints
- Challenge endpoints
- Register/verify endpoints
- Refresh token
- Forgot password

**Configuration**: Redis-based sliding window

### 8.2. Captcha

**Types**:

- Text captcha: Random characters
- Math captcha: Simple arithmetic

**Storage**: Redis cache với TTL ngắn

**Validation**: Case-insensitive comparison

**Integration**: Optional trong login flow (setting: `CAPTCHA_REQUIRED`)

### 8.3. Device Recognition

**Fingerprinting** (`server/src/services/auth/security-monitor.service.ts:93-98`):

```typescript
const fingerprint = SHA256(`${userAgent}::${clientIp}`);
```

**Features**:

- Unknown device detection
- Optional blocking: `BLOCK_UNKNOWN_DEVICE`
- Optional warning: `AUDIT_WARNING` (log suspicious activity)
- Device verification: Email OTP cho new device

### 8.4. Security Monitoring

**Risk Evaluation** (`server/src/services/auth/security-monitor.service.ts:47-91`):

**Risk Levels**:

- `LOW`: Known device
- `MEDIUM`: New device (not blocked)
- `HIGH`: New device + blocking enabled

**Actions**:

- `allow`: Continue login
- `block`: Reject login

**Integration với MFA**:

- Risk `MEDIUM`/`HIGH` + risk-based MFA enabled → Require MFA

### 8.5. Audit Logging

**Events** (`server/src/generated/index.ts` - `SecurityEventType`):

**Authentication**:

- `login_success`, `login_failed`
- `register_started`, `register_completed`, `register_failed`
- `logout`

**MFA**:

- `mfa_challenge_started`, `mfa_verified`, `mfa_failed`
- `mfa_setup_started`, `mfa_setup_completed`
- `mfa_disabled`
- `mfa_backup_codes_regenerated`

**Password**:

- `password_changed`
- `password_reset_completed`, `password_reset_failed`

**Security**:

- `suspicious_activity`
- `refresh_token_success`, `refresh_token_failed`
- `otp_sent`, `otp_send_failed`, `otp_invalid`

**Storage**: `AuditLog` table với visibility levels:

- `admin_only`: Chỉ admin xem được
- `actor_and_subject`: User và subject user xem được
- `actor_only`: Chỉ user thực hiện xem được

### 8.6. IP/UA Binding

**Purpose**: Prevent authTxId theft

**Implementation** (`server/src/services/auth/auth-tx.service.ts:61-73`):

- Hash IP: `SHA256(ip)`
- Hash UA: `SHA256(userAgent)`
- Store trong authTx
- Verify khi submit challenge/enroll

**Strictness**: IP strict, UA optional (vì UA có thể thay đổi nhẹ)

### 8.7. Attempt Limits

**Password Attempts**:

- Max: `PASSWORD_MAX_ATTEMPT` (setting)
- Track: `user.passwordAttempt`
- Lock: Throw error nếu vượt limit

**Challenge Attempts**:

- Max: 5 (hardcoded trong `auth-tx.service.ts:85`)
- Track: `authTx.challengeAttempts`
- Lock: Throw `TooManyAttempts` nếu vượt

---

## 9. API Reference

### 9.1. Authentication Endpoints

#### `POST /auth/login`

- **Description**: Start login flow (password)
- **Request**: `{ email, password, captcha? }`
- **Response**: `AuthResponse` (COMPLETED | CHALLENGE)
- **Rate Limited**: Yes

#### `POST /auth/login/challenge`

- **Description**: Submit MFA/device verification code
- **Request**: `{ authTxId, type, code }`
- **Response**: `AuthResponse` (COMPLETED)
- **Rate Limited**: Yes

#### `POST /auth/mfa/enroll/start`

- **Description**: Start MFA enrollment
- **Request**: `{ authTxId }`
- **Response**: `{ authTxId, enrollToken, otpauthUrl }`
- **Rate Limited**: Yes

#### `POST /auth/mfa/enroll/confirm`

- **Description**: Confirm MFA enrollment
- **Request**: `{ authTxId, enrollToken, otp }`
- **Response**: `AuthResponse` (COMPLETED + backupCodes)
- **Rate Limited**: Yes

### 9.2. OAuth Endpoints

#### `POST /auth/oauth/google`

- **Description**: Google OAuth login
- **Request**: `{ idToken }`
- **Response**: `AuthResponse` (COMPLETED | CHALLENGE)
- **Rate Limited**: Yes

#### `POST /auth/oauth/link-telegram`

- **Description**: Link Telegram account (requires auth)
- **Request**: `{ id, first_name?, last_name?, username?, photo_url?, auth_date, hash }`
- **Response**: `null`
- **Rate Limited**: No

### 9.3. Password Management

#### `POST /auth/change-password` (requires auth)

- **Description**: Change password
- **Request**: `{ oldPassword?, newPassword }`
- **Response**: `null`
- **Rate Limited**: Yes

#### `POST /auth/forgot-password`

- **Description**: Reset password via OTP
- **Request**: `{ otp, otpToken, newPassword }`
- **Response**: `null`
- **Rate Limited**: Yes

### 9.4. MFA Management

#### `POST /auth/mfa/backup-codes/regenerate` (requires auth)

- **Description**: Regenerate backup codes
- **Request**: None
- **Response**: `{ backupCodes: [string] }`
- **Rate Limited**: No

#### `POST /auth/mfa/disable` (requires auth)

- **Description**: Disable MFA
- **Request**: `{ password, code }`
- **Response**: `null`
- **Rate Limited**: No

### 9.5. Session Management

#### `POST /auth/refresh-token`

- **Description**: Refresh access token
- **Request**: `{ token }`
- **Response**: `LoginResDto`
- **Rate Limited**: Yes

#### `POST /auth/logout` (requires auth)

- **Description**: Logout current session
- **Request**: None
- **Response**: `null`
- **Rate Limited**: No

#### `POST /auth/logout/all` (requires auth)

- **Description**: Logout all sessions
- **Request**: None
- **Response**: `null`
- **Rate Limited**: No

### 9.6. User Management

#### `POST /auth/register`

- **Description**: Register new user
- **Request**: `{ email, password }`
- **Response**: `{ otpToken } | null`
- **Rate Limited**: Yes

#### `POST /auth/verify-account`

- **Description**: Verify account with OTP
- **Request**: `{ otp, otpToken }`
- **Response**: `null`
- **Rate Limited**: Yes

#### `GET /auth/me` (requires auth)

- **Description**: Get current user profile
- **Request**: None
- **Response**: `UserResDto`
- **Rate Limited**: No

---

## 10. Implementation Status

### 10.1. ✅ Đã Triển Khai (Implemented)

#### Core Infrastructure

- ✅ AuthTx Service (Redis-based, TTL 300s)
- ✅ AuthFlow Service (startLogin, completeChallenge, enrollStart/Confirm)
- ✅ MFA Service (TOTP, Backup Code, Email OTP)
- ✅ Password Service (hashing, verification, expiration)
- ✅ Session Service (create, revoke, list)
- ✅ Security Monitor (device recognition, risk evaluation)
- ✅ OAuth Service (Google login, Telegram linking)
- ✅ Authorization Service (policy-based)

#### Features

- ✅ Password login với MFA challenge/enroll
- ✅ OAuth Google login với MFA support
- ✅ TOTP verification
- ✅ Backup code (single-use, hashed storage)
- ✅ Email OTP (fallback, device verification)
- ✅ Device verification flow
- ✅ MFA enrollment với backup code generation
- ✅ MFA disable (password + TOTP required)
- ✅ Backup code regeneration
- ✅ Password change với session revocation
- ✅ Forgot password flow
- ✅ Captcha integration (optional)
- ✅ Risk-based MFA
- ✅ Admin force MFA enrollment (`mfaEnrollRequired` flag)

#### Security

- ✅ IP/UA binding cho authTx
- ✅ Challenge attempt limits (5 max)
- ✅ Password attempt limits
- ✅ Rate limiting cho auth endpoints
- ✅ Audit logging đầy đủ
- ✅ Session revocation on security changes

### 10.2. ⚠️ Cần Cải Thiện (Needs Improvement)

#### 1. Backup Code Storage

**Hiện trạng**:

- Chỉ lưu 1 backup code tại một thời điểm (upsert)
- Khi regenerate → invalidate code cũ

**Vấn đề**:

- User chỉ có 1 backup code → risk cao nếu mất
- Không support multiple backup codes như các hệ thống khác

**Khuyến nghị**:

- [ ] Thay đổi schema: Support multiple backup codes per user
- [ ] Generate 8-10 backup codes khi enroll
- [ ] Store trong array hoặc separate table với `usedAt` tracking
- [ ] Regenerate → invalidate all old, generate new set

#### 2. OAuth Telegram Login

**Hiện trạng**:

- Chỉ có `link-telegram` (link account sau khi login)
- Chưa có Telegram login flow

**Khuyến nghị**:

- [ ] Implement `POST /auth/oauth/telegram` tương tự Google
- [ ] Verify Telegram login data (HMAC)
- [ ] Tích hợp với authTx flow
- [ ] Support MFA challenge/enroll

#### 3. Error Code Standardization

**Hiện trạng**:

- Đã có `ErrCode` enum
- Một số error codes còn thiếu:
  - `BackupCodesExhausted` (khi user đã dùng hết)
  - `MfaNotEnabled` (khi thao tác MFA nhưng chưa enable)

**Khuyến nghị**:

- [ ] Thêm missing error codes
- [ ] Đảm bảo error messages không leak thông tin
- [ ] Document error codes trong API spec

#### 4. AuthTx Cleanup & Monitoring

**Hiện trạng**:

- AuthTx tự expire sau 300s (Redis TTL)
- Không có monitoring/metrics

**Khuyến nghị**:

- [ ] (Optional) Background job để log expired transactions
- [ ] Metrics: track số lượng transactions created vs completed
- [ ] Alert nếu completion rate thấp (có thể do UX issue)

#### 5. Session Management

**Hiện trạng**:

- Single session mode: revoke all khi login
- Không có session timeout (chỉ có refresh token expiration)

**Khuyến nghị**:

- [ ] (Optional) Session timeout: auto-revoke sau inactivity
- [ ] (Optional) Session limit: max số sessions per user
- [ ] (Optional) Session device management UI

#### 6. Testing Coverage

**Hiện trạng**:

- Có test folder nhưng chưa rõ coverage

**Khuyến nghị**:

- [ ] Unit tests cho `AuthFlowService`:
  - `startLogin()` với các scenarios
  - `completeChallenge()` TOTP/backup code
  - `enrollStart()` và `enrollConfirm()`
  - `resolveNextStep()` decision logic
- [ ] Integration tests:
  - Full login flow (password → MFA → complete)
  - OAuth → MFA flow
  - Enroll flow
- [ ] Security tests:
  - Brute-force protection
  - AuthTx binding (IP/UA mismatch)
  - Expired authTx
  - Invalid backup codes

### 10.3. ❌ Chưa Triển Khai (Missing)

#### 1. Step-up Authentication

**Mô tả**: Re-authenticate cho sensitive actions (change email, delete account, etc.)

**Cần làm**:

- [ ] Middleware `requireStepUp(action)`
- [ ] Tạo authTx cho step-up (không phải login)
- [ ] Challenge user với TOTP/password
- [ ] Cache "step-up verified" trong session (TTL ngắn: 5-10 phút)

#### 2. MFA Recovery Codes

**Phân biệt với Backup Codes**:

- **Backup codes**: Dùng thay TOTP để login (tiêu hao sau khi dùng)
- **Recovery codes**: Dùng để disable MFA hoàn toàn (khi mất authenticator app)

**Cần làm**:

- [ ] Generate recovery code khi enroll MFA (1 code duy nhất, dài hơn backup code)
- [ ] Endpoint: `POST /auth/mfa/recover` (public, không cần auth)
  - Input: email + recovery code
  - Action: disable MFA cho user
  - Audit log + email notification
- [ ] Store recovery code hash trong DB

#### 3. Email Notification cho Security Events

**Hiện trạng**:

- Audit log đầy đủ
- Chưa có email notification

**Cần làm**:

- [ ] Email khi disable MFA
- [ ] Email khi password changed
- [ ] Email khi login từ new device
- [ ] Email khi suspicious activity detected

#### 4. Account Lockout

**Hiện trạng**:

- Password attempt limit → throw error
- Chưa có account lockout (temporary ban)

**Cần làm**:

- [ ] Account lockout sau N failed attempts
- [ ] Lockout duration: configurable (15 phút, 1 giờ, etc.)
- [ ] Auto-unlock sau duration
- [ ] Admin unlock endpoint

---

## 11. Security Audit & Recommendations

### 11.1. Security Strengths ✅

1. **Strong Password Hashing**

   - ✅ Bun.password (bcrypt-like)
   - ✅ Pepper từ environment
   - ✅ Expiration support

2. **MFA Implementation**

   - ✅ TOTP với otplib
   - ✅ Backup codes (hashed storage, single-use)
   - ✅ Email OTP fallback

3. **Session Security**

   - ✅ JWT với encrypted payload
   - ✅ Refresh token rotation
   - ✅ Session revocation on security changes

4. **Rate Limiting**

   - ✅ Applied to critical endpoints
   - ✅ Redis-based sliding window

5. **Audit Logging**

   - ✅ Comprehensive security events
   - ✅ Visibility levels
   - ✅ User and session tracking

6. **IP/UA Binding**
   - ✅ Prevent authTxId theft
   - ✅ Hash-based (SHA256)

### 11.2. Security Concerns ⚠️

#### 1. TOTP Secret Storage

**Vấn đề**: `totpSecret` lưu plain text trong database

**Risk**: Nếu database bị compromise → attacker có thể generate TOTP codes

**Mitigation hiện tại**: Database encryption at rest (nếu có)

**Khuyến nghị**:

- [ ] (Optional) Encrypt `totpSecret` với AES-256
- [ ] Key management: Store encryption key trong secure vault
- [ ] Decrypt on-the-fly khi verify

#### 2. Backup Code Storage

**Vấn đề**: Chỉ 1 backup code tại một thời điểm

**Risk**: User mất code → không thể recover

**Khuyến nghị**: Đã đề cập ở phần 10.2.1

#### 3. AuthTx TTL

**Vấn đề**: TTL 300s (5 phút) có thể quá ngắn cho một số UX flows

**Risk**: User mất nhiều thời gian → authTx expire → phải login lại

**Khuyến nghị**:

- [ ] (Optional) Extend TTL lên 10 phút (600s)
- [ ] (Optional) Refresh TTL khi user interact (submit challenge)

#### 4. Challenge Attempt Limit

**Vấn đề**: Hardcoded 5 attempts

**Risk**: Không flexible, có thể quá strict hoặc quá lenient

**Khuyến nghị**:

- [ ] Move to settings: `MFA_CHALLENGE_MAX_ATTEMPTS`
- [ ] Support different limits cho different challenge types

#### 5. Email OTP Security

**Vấn đề**: Email không phải secure channel

**Risk**: Email có thể bị intercept (MITM, compromised email account)

**Khuyến nghị**:

- [ ] Chỉ dùng email OTP như fallback (risk HIGH)
- [ ] Khuyến khích user enable TOTP
- [ ] (Optional) SMS OTP (nếu có budget)

#### 6. Session Token Storage

**Vấn đề**: Refresh token lưu trong database (plain text)

**Risk**: Database compromise → attacker có thể refresh tokens

**Mitigation hiện tại**:

- Token là random 32-char string
- Revoked flag
- Expiration date

**Khuyến nghị**:

- [ ] (Optional) Hash refresh tokens (nhưng cần trade-off với lookup performance)
- [ ] Ensure database encryption at rest
- [ ] Regular security audits

### 11.3. Security Best Practices ✅

1. **No Information Leakage**

   - ✅ Generic error messages (`InvalidCredentials` thay vì `UserNotFound`)
   - ✅ Consistent response times (không leak user existence)

2. **Defense in Depth**

   - ✅ Multiple layers: Password → MFA → Device verification
   - ✅ Risk-based MFA
   - ✅ Rate limiting + attempt limits

3. **Audit Trail**

   - ✅ Comprehensive logging
   - ✅ User and session tracking
   - ✅ Security event categorization

4. **Secure Defaults**
   - ✅ MFA required (configurable)
   - ✅ Password expiration (configurable)
   - ✅ Session revocation on password change (configurable)

---

## 12. Code Quality & Best Practices

### 12.1. Code Organization ✅

**Strengths**:

- ✅ Separation of concerns: Services tách biệt rõ ràng
- ✅ Dependency injection: Services nhận deps qua constructor
- ✅ Type safety: TypeScript với proper types
- ✅ Error handling: Centralized error codes

### 12.2. Code Issues & Improvements

#### 1. Hardcoded Values

**Vấn đề**:

- Challenge attempt limit: 5 (hardcoded)
- AuthTx TTL: 300s (hardcoded)
- Backup code length: 8 (hardcoded)

**Khuyến nghị**:

- [ ] Move to settings hoặc environment variables
- [ ] Document defaults

#### 2. Magic Strings

**Vấn đề**:

- Một số strings không được extract thành constants
- Ví dụ: `'Admin Base Portal'` trong `enrollStart()`

**Khuyến nghị**:

- [ ] Extract thành constants
- [ ] Hoặc move to settings

#### 3. Error Handling

**Strengths**:

- ✅ Centralized error codes
- ✅ Proper error types (BadReqErr, UnAuthErr, etc.)

**Improvements**:

- [ ] Consistent error response format
- [ ] Error context trong audit logs

#### 4. Code Duplication

**Vấn đề**:

- Một số logic lặp lại giữa password login và OAuth login

**Khuyến nghị**:

- [ ] Extract common logic thành shared functions
- [ ] Đã tốt: `resolveNextStep()` được reuse

#### 5. Testing

**Vấn đề**:

- Chưa có unit tests cho auth flow

**Khuyến nghị**:

- [ ] Viết tests cho critical paths
- [ ] Integration tests cho full flows
- [ ] Security tests

### 12.3. Performance Considerations

#### 1. Database Queries

**Strengths**:

- ✅ Selective fields (`userResSelect`)
- ✅ Indexed lookups (email, userId)

**Improvements**:

- [ ] (Optional) Cache user permissions (đã có trong middleware)
- [ ] (Optional) Batch queries nếu cần

#### 2. Redis Usage

**Strengths**:

- ✅ AuthTx trong Redis (fast)
- ✅ User cache trong middleware

**Improvements**:

- [ ] (Optional) Monitor Redis memory usage
- [ ] (Optional) TTL optimization

#### 3. Async Operations

**Strengths**:

- ✅ Email queue (async)
- ✅ GeoIP queue (async)

**Improvements**:

- [ ] (Optional) Parallel operations khi có thể (đã có trong `completeLogin()`)

### 12.4. Documentation

**Strengths**:

- ✅ Swagger/OpenAPI docs
- ✅ Code comments (một số)

**Improvements**:

- [ ] Sequence diagrams cho flows
- [ ] Postman collection
- [ ] Client integration guide
- [ ] Architecture diagrams

---

## 13. Migration & Deployment

### 13.1. Database Migrations

**Required Fields**:

- `User.mfaTotpEnabled`, `User.totpSecret`, `User.mfaEnrollRequired`
- `MfaBackupCode` table
- `Session` table với `deviceFingerprint`, `sessionType`
- `AuditLog` với `SecurityEventType` enum

### 13.2. Environment Variables

**Required**:

- `PASSWORD_PEPPER`: Pepper cho password hashing
- `JWT_ACCESS_TOKEN_SECRET_KEY`: JWT signing key
- `JWT_ACCESS_TOKEN_EXPIRED`: Access token expiration
- `JWT_REFRESH_TOKEN_EXPIRED`: Refresh token expiration
- `PASSWORD_EXPIRED`: Password expiration duration
- `PASSWORD_MAX_ATTEMPT`: Max password attempts
- `CAPTCHA_REQUIRED`: Enable captcha
- `MFA_REQUIRED`: Require MFA for all users
- `MFA_RISK_BASED_ENABLED`: Enable risk-based MFA
- `DEVICE_VERIFICATION_ENABLED`: Enable device verification
- `REVOKE_SESSIONS_ON_PASSWORD_CHANGE`: Revoke sessions on password change

### 13.3. Redis Configuration

**Required**:

- Redis instance cho:
  - AuthTx cache
  - OTP cache
  - Captcha cache
  - User cache
  - Rate limiting

### 13.4. Queue Configuration

**Required**:

- Bull queue cho:
  - Email queue (OTP sending)
  - GeoIP queue (session location update)

---

## 14. Future Enhancements

### 14.1. Short-term (P1)

1. **Multiple Backup Codes**

   - Generate 8-10 codes khi enroll
   - Store trong array hoặc separate table

2. **Telegram OAuth Login**

   - Implement login flow (không chỉ link)

3. **Error Code Standardization**

   - Thêm missing error codes
   - Document trong API spec

4. **Testing Coverage**
   - Unit tests cho critical paths
   - Integration tests

### 14.2. Medium-term (P2)

1. **Step-up Authentication**

   - Re-auth cho sensitive actions

2. **MFA Recovery Codes**

   - Recovery flow khi mất device

3. **Email Notifications**

   - Security event emails

4. **Account Lockout**
   - Temporary ban sau failed attempts

### 14.3. Long-term (P3)

1. **SMS OTP**

   - Alternative to email OTP

2. **WebAuthn / FIDO2**

   - Passwordless authentication
   - Hardware keys support

3. **Social Login Expansion**

   - Facebook, GitHub, etc.

4. **Advanced Analytics**
   - Login patterns
   - Security insights
   - User behavior

---

## 15. Appendix

### 15.1. File Structure

```
server/src/
├── services/auth/
│   ├── auth-flow.service.ts      # Main orchestrator
│   ├── auth-tx.service.ts        # Auth transaction management
│   ├── auth.service.ts           # Legacy auth (register, change password, etc.)
│   ├── mfa.service.ts            # MFA logic
│   ├── password.service.ts        # Password hashing/verification
│   ├── session.service.ts        # Session management
│   ├── security-monitor.service.ts # Risk evaluation
│   ├── oauth.service.ts          # OAuth integration
│   ├── authorization.service.ts   # Permission checking
│   ├── otp.service.ts            # OTP generation/verification
│   ├── captcha.service.ts        # Captcha generation/validation
│   ├── auth-util.service.ts      # User utilities, token service
│   ├── middleware.ts             # Auth middleware
│   └── constants.ts              # Auth constants
├── modules/auth/
│   ├── auth-flow.controller.ts   # New auth endpoints
│   └── auth.controller.ts        # Legacy auth endpoints
├── dtos/
│   └── auth.dto.ts               # Request/Response DTOs
└── types/
    └── auth.types.ts             # Type definitions
```

### 15.2. Key Dependencies

- `otplib`: TOTP generation/verification
- `jose`: JWT signing/verification
- `google-auth-library`: Google OAuth
- `svg-captcha`: Captcha generation
- `bun`: Runtime (password hashing)

### 15.3. Database Schema (Key Tables)

**User**:

- `id`, `email`, `password`, `status`
- `mfaTotpEnabled`, `totpSecret`, `mfaEnrollRequired`
- `passwordAttempt`, `passwordExpired`, `lastPasswordChangeAt`

**Session**:

- `id`, `token` (refresh token), `expired`, `revoked`
- `createdById`, `ip`, `device`, `userAgent`
- `deviceFingerprint`, `sessionType`

**MfaBackupCode**:

- `id`, `userId`, `codeHash`, `usedAt`, `created`

**RolePlayer**:

- `id`, `playerId` (userId), `roleId`, `expiresAt`

**RolePermission**:

- `id`, `roleId`, `permissionId`

**AuditLog**:

- `id`, `category`, `eventType`, `severity`
- `subjectUserId`, `userId`, `sessionId`
- `visibility`, `metadata`

---

## Kết luận

Tài liệu này mô tả đầy đủ hệ thống authentication và authorization hiện tại, bao gồm:

- ✅ **Core Architecture**: Auth Transaction + Challenge pattern
- ✅ **Complete Flows**: Password login, OAuth, MFA, Device verification
- ✅ **Security Features**: Rate limiting, captcha, device recognition, audit logging
- ✅ **Implementation Status**: Đã triển khai, cần cải thiện, và missing features
- ✅ **Security Audit**: Strengths, concerns, và recommendations
- ✅ **Code Quality**: Best practices và improvements

**Lưu ý**: Tài liệu này được cập nhật dựa trên codebase thực tế tại thời điểm review. Khi có thay đổi code, cần cập nhật tài liệu tương ứng.

---

**Cập nhật lần cuối**: Dựa trên code review ngày [DATE]
**Người review**: [REVIEWER]
**Version**: 2.0
