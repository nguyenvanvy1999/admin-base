# Tài liệu API Luồng Authentication (Auth Flow)

Tài liệu này mô tả chi tiết các luồng logic liên quan đến xác thực và quản lý tài khoản trong hệ thống, giúp Front-End (FE) tích hợp một cách chính xác nhất.

## 1. Tổng quan hệ thống Auth

Hệ thống sử dụng cơ chế **Unified Auth Flow** (Luồng xác thực thống nhất) dựa trên Transaction ID (`authTxId`). Điều này cho phép xử lý linh hoạt các tình huống như Login thông thường, MFA (Multi-Factor Authentication), và Xác thực thiết bị mới.

---

## 2. Luồng Đăng ký & Kích hoạt tài khoản

### Bước 1: Đăng ký tài khoản

- **Màn hình**: [Register Page]
- **Hành động**: Người dùng nhập Email và Password để đăng ký.
- **API**: `POST /auth/user/register`
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "password": "strongPassword123"
  }
  ```

- **Response (200 OK)**:

  ```json
  {
    "data": {
      "otpToken": "abc123token..."
    }
  }
  ```

- **Ý nghĩa**: Tạo user ở trạng thái `inactive`. Hệ thống gửi email chứa mã OTP 6 số đến người dùng. `otpToken` được dùng để định danh giao dịch OTP ở bước sau.

### Bước 2: Kích hoạt tài khoản

- **Màn hình**: [Verify Account Page]
- **Hành động**: Người dùng nhập mã OTP từ email.
- **API**: `POST /auth/user/verify-account`
- **Request Body**:

  ```json
  {
    "otp": "123456",
    "otpToken": "abc123token..."
  }
  ```

- **Response (200 OK)**: `{ "data": null }`
- **Ý nghĩa**: Xác thực OTP thành công, chuyển trạng thái user sang `active`. Sau bước này FE có thể chuyển hướng người dùng về trang Login.

---

## 3. Luồng Đăng nhập Thống nhất (Unified Login)

Đây là luồng quan trọng nhất, xử lý hầu hết các kịch bản đăng nhập.

### Bước 1: Khởi tạo Đăng nhập

- **Màn hình**: [Login Page]
- **API**: `POST /auth/login`
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "captcha": {
      // Optional tùy cấu hình server
      "token": "...",
      "userInput": "..."
    }
  }
  ```

- **Response (Trường hợp thành công ngay - Không có MFA)**:

  ```json
  {
    "data": {
      "status": "COMPLETED",
      "session": {
        "type": "COMPLETED",
        "accessToken": "...",
        "refreshToken": "...",
        "exp": 1234567890,
        "expired": "2024-01-01T00:00:00Z",
        "user": {
          "id": "...",
          "email": "user@example.com",
          "status": "active",
          "mfaTotpEnabled": false,
          "permissions": ["..."],
          "created": "...",
          "modified": "..."
        },
        "sessionId": "..."
      }
    }
  }
  ```

- **Response (Trường hợp gặp thử thách - Challenge)**:

  ```json
  {
    "data": {
      "status": "CHALLENGE",
      "authTxId": "tx_uuid_here",
      "challenge": {
        "type": "MFA_REQUIRED" | "DEVICE_VERIFY",
        "availableMethods": [
          {
            "method": "MFA_TOTP" | "MFA_BACKUP_CODE" | "MFA_EMAIL_OTP" | "DEVICE_VERIFY",
            "label": "Authenticator App",
            "description": "Use your TOTP app",
            "requiresSetup": false
          }
        ],
        "metadata": {
          "totp": {
            "allowBackupCode": true
          },
          "email": {
            "destination": "v*@example.com",
            "sentAt": 1234567890
          },
          "device": {
            "isNewDevice": true,
            "deviceFingerprint": "..."
          }
        }
      }
    }
  }
  ```

- **Giải thích Challenge Response**:
  - `type`: Loại challenge hiện tại
    - `MFA_REQUIRED`: Yêu cầu xác thực MFA. Nếu user đã có MFA TOTP, có thể dùng TOTP hoặc Backup Code. Nếu user chưa có MFA nhưng hệ thống yêu cầu, hệ thống sẽ tự động gửi Email OTP và phương thức `MFA_EMAIL_OTP` sẽ có sẵn.
    - `DEVICE_VERIFY`: Xác thực thiết bị mới (chỉ khi user chưa có MFA và device verification được bật)
  - `availableMethods`: Danh sách các phương thức xác thực có sẵn cho challenge này
  - `metadata`: Thông tin bổ sung tùy theo loại challenge:
    - **MFA_REQUIRED**: Có `metadata.totp.allowBackupCode` (boolean) - cho biết user có backup code chưa sử dụng không. Nếu user chưa có MFA, hệ thống sẽ tự động gửi email OTP và `metadata.email` sẽ có `destination` (email đã mask) và `sentAt` (timestamp).
    - **DEVICE_VERIFY**: Có `metadata.device` (isNewDevice, deviceFingerprint) và `metadata.email` (destination, sentAt)

### Bước 2: Xử lý các Thử thách (Challenges)

Dựa vào `challenge.type` trả về ở Bước 1, FE hiển thị UI tương ứng:

#### 2.1. Lấy danh sách phương thức xác thực có sẵn (Optional)

- **API**: `GET /auth/challenge/:authTxId/methods`
- **Response**:
  ```json
  {
    "data": {
      "availableMethods": [
        {
          "method": "MFA_TOTP",
          "label": "Authenticator App",
          "description": "Use your TOTP app",
          "requiresSetup": false
        },
        {
          "method": "MFA_BACKUP_CODE",
          "label": "Backup Code",
          "description": "Use one of your backup codes",
          "requiresSetup": false
        },
        {
          "method": "MFA_EMAIL_OTP",
          "label": "Email OTP",
          "description": "Receive code via email",
          "requiresSetup": false
        }
      ]
    }
  }
  ```
- **Lưu ý**: API này hữu ích khi FE muốn hiển thị danh sách các phương thức cho user chọn. Nếu không cần, có thể bỏ qua và sử dụng `availableMethods` từ response của Bước 1.

#### 2.2. Xác thực Challenge (MFA_REQUIRED / DEVICE_VERIFY)

- **Màn hình**: Hiển thị popup hoặc trang nhập mã xác thực tương ứng.
- **Hành động**: Người dùng chọn phương thức từ `availableMethods` và nhập mã code (6 số TOTP, 8 ký tự Backup code, hoặc OTP từ email).
- **API**: `POST /auth/login/challenge`
- **Request Body**:

  ```json
  {
    "authTxId": "tx_uuid_here",
    "method": "MFA_TOTP" | "MFA_BACKUP_CODE" | "MFA_EMAIL_OTP" | "DEVICE_VERIFY",
    "code": "123456"
  }
  ```

- **Lưu ý**:

  - `method` là bắt buộc. FE phải chỉ định rõ ràng phương thức xác thực.

- **Response**:
  - Nếu thành công: Trả về `status: "COMPLETED"` kèm `session` object (cấu trúc giống response của login thành công).
  - Nếu cần challenge tiếp theo: Trả về `status: "CHALLENGE"` với `authTxId` và `challenge` mới (hiện tại hệ thống không hỗ trợ multiple challenges trong một login flow).

---

## 4. Luồng Google OAuth

- **Hành động**: Người dùng click "Login with Google". FE lấy `idToken` từ Google SDK.
- **API**: `POST /auth/oauth/google`
- **Request Body**:
  ```json
  {
    "idToken": "google_id_token_here"
  }
  ```
- **Response**: Trả về cấu trúc giống hệt API `POST /auth/login`:
  - Nếu thành công: `{ "data": { "status": "COMPLETED", "session": {...} } }`
  - Nếu cần challenge: `{ "data": { "status": "CHALLENGE", "authTxId": "...", "challenge": {...} } }`
- **Lưu ý**: FE xử lý các bước tiếp theo (challenge) giống như luồng đăng nhập thường. Nếu user chưa có MFA nhưng hệ thống yêu cầu, hệ thống sẽ tự động gửi Email OTP và user có thể dùng `MFA_EMAIL_OTP` để hoàn thành đăng nhập.

### Link Telegram Account (Auth Required)

- **API**: `POST /auth/oauth/link-telegram`
- **Request Body**:
  ```json
  {
    "id": "telegram_user_id",
    "first_name": "...",
    "last_name": "...",
    "username": "...",
    "photo_url": "...",
    "auth_date": "1234567890",
    "hash": "telegram_hash"
  }
  ```
- **Response**: `{ "data": null }`
- **Ý nghĩa**: Liên kết tài khoản Telegram với tài khoản hiện tại. Yêu cầu đã đăng nhập.

---

## 5. Luồng Quên mật khẩu

### Bước 1: Yêu cầu mã OTP qua Email

- **API**: `POST /auth/otp/`
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "purpose": "forgot-password"
  }
  ```

- **Response**:

  ```json
  {
    "data": {
      "otpToken": "abc123token..."
    }
  }
  ```

  Hoặc `{ "data": null }` nếu không thể gửi email.

- **Lưu ý**: Các giá trị `purpose` hợp lệ:
  - `"register"` - Xác thực đăng ký tài khoản
  - `"forgot-password"` - Quên mật khẩu
  - `"reset-mfa"` - Reset MFA
  - `"mfa-login"` - MFA login
  - `"device-verify"` - Xác thực thiết bị mới

### Bước 2: Đặt lại mật khẩu

- **API**: `POST /auth/forgot-password`
- **Request Body**:

  ```json
  {
    "otp": "123456",
    "otpToken": "...",
    "newPassword": "newSecurePassword123"
  }
  ```

- **Response**: `{ "data": null }`. Đổi mật khẩu thành công và hủy toàn bộ session cũ.

---

## 6. Quản lý Phiên làm việc (Session)

### Refresh Token

- Khi Access Token hết hạn, FE dùng Refresh Token để lấy token mới.
- **API**: `POST /auth/refresh-token`
- **Request Body**:
  ```json
  {
    "token": "current_refresh_token_here"
  }
  ```
- **Response**:
  ```json
  {
    "data": {
      "type": "COMPLETED",
      "accessToken": "...",
      "refreshToken": "...",
      "exp": 1234567890,
      "expired": "2024-01-01T00:00:00Z",
      "user": { ... },
      "sessionId": "..."
    }
  }
  ```
- **Lưu ý**: `refreshToken` trong response là token cũ (giữ nguyên), không phải token mới.

### Đăng xuất (Logout)

- **Logout hiện tại**: `POST /auth/logout` (Auth required, xóa session hiện tại).
  - **Response**: `{ "data": null }`
- **Logout tất cả**: `POST /auth/logout/all` (Auth required, xóa tất cả các session khác).
  - **Response**: `{ "data": null }`

### Lấy thông tin User hiện tại

- **API**: `GET /auth/me` (Auth required).
- **Response**:
  ```json
  {
    "data": {
      "id": "...",
      "email": "user@example.com",
      "status": "active",
      "mfaTotpEnabled": false,
      "permissions": ["..."],
      "created": "...",
      "modified": "..."
    }
  }
  ```

---

## 7. Các API bổ trợ (Auth Required)

### Đổi mật khẩu

- **API**: `POST /auth/change-password`
- **Request Body**:
  ```json
  {
    "oldPassword": "...", // Optional nếu user chưa có password (ví dụ: đăng ký bằng OAuth)
    "newPassword": "newSecurePassword123"
  }
  ```
- **Response**: `{ "data": null }`
- **Lưu ý**: Nếu user đã có password thì `oldPassword` là bắt buộc.

### Đăng ký MFA (MFA Enrollment)

Đăng ký MFA chỉ có thể thực hiện khi user đã đăng nhập. Không thể đăng ký MFA trong luồng login.

1. **Bắt đầu đăng ký MFA**:

   - **API**: `POST /auth/mfa/enroll/start`
   - **Request Body**: Không cần body (sử dụng token từ header)
   - **Response**:
     ```json
     {
       "data": {
         "authTxId": "...",
         "enrollToken": "...",
         "otpauthUrl": "..."
       }
     }
     ```
   - **Hành động**: FE dùng `otpauthUrl` để generate mã QR. Người dùng quét bằng app Authenticator (Google Authenticator, Authy, etc.).

2. **Xác nhận đăng ký MFA**:
   - **API**: `POST /auth/mfa/enroll/confirm`
   - **Request Body**:
     ```json
     {
       "authTxId": "...",
       "enrollToken": "...",
       "otp": "123456"
     }
     ```
   - **Response**:
     ```json
     {
       "data": {
         "backupCodes": ["XXXXXXXX"] // Một mã backup code duy nhất
       }
     }
     ```
   - **Lưu ý quan trọng**: FE **bắt buộc** phải hiển thị `backupCodes[0]` cho người dùng lưu lại ở bước này vì mã chỉ trả về 1 lần duy nhất và không thể lấy lại sau này.

### Tạo mới Backup Code

- **API**: `POST /auth/mfa/backup-codes/regenerate`
- **Response**:
  ```json
  {
    "data": {
      "backupCodes": ["XXXXXXXX"] // Một mã backup code mới
    }
  }
  ```
- **Lưu ý**: Mã backup code cũ sẽ bị vô hiệu hóa. Mã mới chỉ trả về 1 lần duy nhất, FE cần hiển thị cho người dùng lưu lại.

### Tắt MFA

- **API**: `POST /auth/mfa/disable`
- **Request Body**:
  ```json
  {
    "password": "user_password",
    "code": "123456" // Mã TOTP từ app Authenticator
  }
  ```
- **Response**: `{ "data": null }`
- **Lưu ý**: Sau khi tắt MFA, tất cả session hiện tại sẽ bị hủy và user cần đăng nhập lại.

---

## 8. Lưu ý quan trọng cho FE

1. **Error Handling**: Toàn bộ API trả về cấu trúc chuẩn: `{ "data": ..., "error": { "code": "...", "message": "..." } }`. Hãy dựa vào `error.code` để hiển thị thông báo lỗi đa ngôn ngữ.

2. **Base URL**:

   - `/auth` - Các API chính (login, challenge, refresh token, logout, MFA, etc.)
   - `/auth/user` - Đăng ký và xác thực tài khoản
   - `/auth/oauth` - OAuth (Google, Telegram)
   - `/auth/otp` - Gửi OTP

3. **MFA Storage**: Khi nhận được mã `backupCode` sau khi enroll hoặc regenerate, hãy đảm bảo người dùng đã lưu lại. Mã này chỉ sử dụng được một lần duy nhất (one-time use) và chỉ trả về 1 lần duy nhất.

4. **Transaction ID**: `authTxId` có thời hạn ngắn (mặc định 10-15 phút), FE cần xử lý nếu transaction hết hạn (thường là báo lỗi và bắt người dùng quay lại bước đăng nhập).

5. **Rate Limiting**: Một số API có rate limiting (như `/auth/login`, `/auth/refresh-token`, `/auth/forgot-password`, `/auth/change-password`). FE cần xử lý lỗi 429 (Too Many Requests) một cách phù hợp.

6. **Captcha**: API `/auth/login` có thể yêu cầu captcha tùy theo cấu hình server. FE cần kiểm tra response error để biết khi nào cần hiển thị captcha.

7. **Session Structure**: Object `session` trong response có cấu trúc:

   - `type`: Luôn là `"COMPLETED"`
   - `accessToken`: JWT token để xác thực các request tiếp theo
   - `refreshToken`: Token để refresh access token khi hết hạn
   - `exp`: Timestamp (milliseconds) khi access token hết hạn
   - `expired`: ISO string của thời gian hết hạn
   - `user`: Thông tin user với permissions
   - `sessionId`: ID của session hiện tại

8. **Challenge Types và Available Methods**:

   - Challenge type `MFA_REQUIRED`:
     - Nếu user đã có MFA TOTP: Có thể có các method `MFA_TOTP`, `MFA_BACKUP_CODE` (nếu có backup code chưa dùng)
     - Nếu user chưa có MFA nhưng hệ thống yêu cầu: Hệ thống tự động gửi Email OTP và có method `MFA_EMAIL_OTP`
   - Challenge type `DEVICE_VERIFY`: Chỉ có method `DEVICE_VERIFY` (gửi OTP qua email). Chỉ xuất hiện khi user chưa có MFA và device verification được bật.
   - FE nên hiển thị danh sách `availableMethods` để user chọn phương thức xác thực phù hợp

9. **Method Requirement**: Khi gửi challenge, FE **bắt buộc** phải chỉ định rõ ràng `method` để code đơn giản, dễ hiểu và minh bạch. Hệ thống không tự động phát hiện method dựa trên format của code.

10. **MFA Enrollment trong Login Flow**: Hệ thống **không** hỗ trợ đăng ký MFA trong luồng đăng nhập. Nếu user chưa có MFA nhưng hệ thống yêu cầu, hệ thống sẽ tự động gửi Email OTP và user có thể dùng `MFA_EMAIL_OTP` để hoàn thành đăng nhập. Để đăng ký MFA, user cần đăng nhập trước và sử dụng các API trong mục 7 (Đăng ký MFA).
