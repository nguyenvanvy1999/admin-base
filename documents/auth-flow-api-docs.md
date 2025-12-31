# Tài liệu API Luồng Authentication (Auth Flow)

Tài liệu này mô tả chi tiết các luồng logic liên quan đến xác thực và quản lý tài khoản trong hệ thống, giúp Front-End (FE) tích hợp một cách chính xác nhất.

## 1. Tổng quan hệ thống Auth

Hệ thống sử dụng cơ chế **Unified Auth Flow** (Luồng xác thực thống nhất) dựa trên Transaction ID (`authTxId`). Điều này cho phép xử lý linh hoạt các tình huống như Login thông thường, MFA (Multi-Factor Authentication), Đăng ký thiết bị mới, và Bắt buộc đăng ký MFA ngay trong luồng đăng nhập.

---

## 2. Luồng Đăng ký & Kích hoạt tài khoản

### Bước 1: Đăng ký tài khoản

* **Màn hình**: [Register Page]
* **Hành động**: Người dùng nhập Email và Password để đăng ký.
* **API**: `POST /auth/user/register`
* **Request Body**:

    ```json
    {
      "email": "user@example.com",
      "password": "strongPassword123"
    }
    ```

* **Response (200 OK)**:

    ```json
    {
      "data": {
        "otpToken": "abc123token..."
      }
    }
    ```

* **Ý nghĩa**: Tạo user ở trạng thái `inactive`. Hệ thống gửi email chứa mã OTP 6 số đến người dùng. `otpToken` được dùng để định danh giao dịch OTP ở bước sau.

### Bước 2: Kích hoạt tài khoản

* **Màn hình**: [Verify Account Page]
* **Hành động**: Người dùng nhập mã OTP từ email.
* **API**: `POST /auth/user/verify-account`
* **Request Body**:

    ```json
    {
      "otp": "123456",
      "otpToken": "abc123token..."
    }
    ```

* **Response (200 OK)**: `{ "data": null }`
* **Ý nghĩa**: Xác thực OTP thành công, chuyển trạng thái user sang `active`. Sau bước này FE có thể chuyển hướng người dùng về trang Login.

---

## 3. Luồng Đăng nhập Thống nhất (Unified Login)

Đây là luồng quan trọng nhất, xử lý hầu hết các kịch bản đăng nhập.

### Bước 1: Khởi tạo Đăng nhập

* **Màn hình**: [Login Page]
* **API**: `POST /auth/login`
* **Request Body**:

    ```json
    {
      "email": "user@example.com",
      "password": "password123",
      "captcha": { // Optional tùy cấu hình server
        "token": "...",
        "userInput": "..."
      }
    }
    ```

* **Response (Trường hợp thành công ngay - Không có MFA)**:

    ```json
    {
      "data": {
        "status": "COMPLETED",
        "session": {
          "accessToken": "...",
          "refreshToken": "...",
          "user": { ... }
        }
      }
    }
    ```

* **Response (Trường hợp gặp thử thách - Challenge)**:

    ```json
    {
      "data": {
        "status": "CHALLENGE",
        "authTxId": "tx_uuid_here",
        "challenge": {
          "type": "MFA_TOTP" | "MFA_BACKUP_CODE" | "MFA_EMAIL_OTP" | "MFA_ENROLL" | "DEVICE_VERIFY",
          "allowBackupCode": true, // Nếu type là MFA_TOTP
          "destination": "v*@example.com" // Nếu type là DEVICE_VERIFY hoặc MFA_EMAIL_OTP
        }
      }
    }
    ```

### Bước 2: Xử lý các Thử thách (Challenges)

Dựa vào `challenge.type` trả về ở Bước 1, FE hiển thị UI tương ứng:

#### 2.1. MFA_TOTP / MFA_BACKUP_CODE / MFA_EMAIL_OTP / DEVICE_VERIFY

* **Màn hình**: Hiển thị popup hoặc trang nhập mã xác thực tương ứng.
* **Hành động**: Người dùng nhập mã code (6 số TOTP, 8 ký tự Backup code, hoặc OTP từ email).
* **API**: `POST /auth/login/challenge`
* **Request Body**:

    ```json
    {
      "authTxId": "tx_uuid_here",
      "type": "MFA_TOTP" | "MFA_BACKUP_CODE" | "MFA_EMAIL_OTP" | "DEVICE_VERIFY",
      "code": "123456"
    }
    ```

* **Response**: Trả về `status: "COMPLETED"` nếu thành công, hoặc một `CHALLENGE` tiếp theo nếu cần xác thực thêm.

#### 2.2. Luồng Đăng ký MFA ngay khi Login (MFA_ENROLL)

Nếu user chưa cài MFA nhưng hệ thống bắt buộc (hoặc phát hiện rủi ro), server trả về `type: "MFA_ENROLL"`.

1. **Lấy secret cài đặt**: FE gọi `POST /auth/mfa/enroll/start` với payload `{ "authTxId": "..." }`.
    * **Response**: `{ "authTxId": "...", "enrollToken": "...", "otpauthUrl": "..." }`.
    * **Hành động**: FE dùng `otpauthUrl` để generate mã QR. Người dùng quét bằng app Authenticator.
2. **Xác nhận cài đặt**: Sau khi quét, người dùng nhập mã từ app. FE gọi `POST /auth/mfa/enroll/confirm`.
    * **Request Body**: `{ "authTxId": "...", "enrollToken": "...", "otp": "..." }`.
    * **Response**: Trả về `status: "COMPLETED"` kèm session và **một mã Backup Code** duy nhất (FE **bắt buộc** phải hiển thị cho người dùng lưu lại ở bước này vì mã chỉ trả về 1 lần duy nhất).

---

## 4. Luồng Google OAuth

* **Hành động**: Người dùng click "Login with Google". FE lấy `idToken` từ Google SDK.
* **API**: `POST /auth/oauth/google`
* **Request Body**: `{ "idToken": "..." }`
* **Response**: Trả về cấu trúc giống hệt API `POST /auth/login` (có thể là `COMPLETED` hoặc `CHALLENGE`). FE xử lý các bước tiếp theo như luồng đăng nhập thường.

---

## 5. Luồng Quên mật khẩu

### Bước 1: Yêu cầu mã OTP qua Email

* **API**: `POST /auth/otp/`
* **Request Body**:

    ```json
    {
      "email": "user@example.com",
      "purpose": "FORGOT_PASSWORD"
    }
    ```

* **Response**: `{ "data": { "otpToken": "..." } }`. Hệ thống gửi OTP về email.

### Bước 2: Đặt lại mật khẩu

* **API**: `POST /auth/forgot-password`
* **Request Body**:

    ```json
    {
      "otp": "123456",
      "otpToken": "...",
      "newPassword": "newSecurePassword123"
    }
    ```

* **Response**: `{ "data": null }`. Đổi mật khẩu thành công và hủy toàn bộ session cũ.

---

## 6. Quản lý Phiên làm việc (Session)

### Refresh Token

* Khi Access Token hết hạn, FE dùng Refresh Token để lấy token mới.
* **API**: `POST /auth/refresh-token`
* **Request Body**: `{ "token": "current_refresh_token_here" }`
* **Response**: Trả về object session mới (accessToken, refreshToken mới).

### Đăng xuất (Logout)

* **Logout hiện tại**: `POST /auth/logout` (Auth required, xóa session hiện tại).
* **Logout tất cả**: `POST /auth/logout/all` (Auth required, xóa tất cả các device khác).

### Lấy thông tin User hiện tại

* **API**: `GET /auth/me` (Auth required).
* **Response**: Thông tin profile, quyền hạn (`permissions`) và trạng thái MFA.

---

## 7. Các API bổ trợ (Auth Required)

* **Đổi mật khẩu**: `POST /auth/change-password` (Payload: `{ oldPassword?, newPassword }`).
* **Tạo mới Backup Code**: `POST /auth/mfa/backup-codes/regenerate` (Trả về một mã backup code mới, mã cũ sẽ bị vô hiệu hóa).
* **Tắt MFA**: `POST /auth/mfa/disable` (Payload: `{ password, code }`).

---

## 8. Lưu ý quan trọng cho FE

1. **Error Handling**: Toàn bộ API trả về cấu trúc chuẩn: `{ "data": ..., "error": { "code": "...", "message": "..." } }`. Hãy dựa vào `error.code` để hiển thị thông báo lỗi đa ngôn ngữ.
2. **Base URL**: `/auth` (dành cho phần lớn các flow) và `/auth/user` (cho register/verify).
3. **MFA Storage**: Khi nhận được mã `backupCode` sau khi enroll hoặc regenerate, hãy đảm bảo người dùng đã lưu lại. Mã này chỉ sử dụng được một lần duy nhất (one-time use).
4. **Transaction ID**: `authTxId` có thời hạn ngắn (mặc định 10-15 phút), FE cần xử lý nếu transaction hết hạn (thường là báo lỗi và bắt người dùng quay lại bước đăng nhập).
