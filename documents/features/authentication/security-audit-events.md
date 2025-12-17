## Security audit events

Danh sách các `SecurityEventType` hiện đang được dùng cho audit log bảo mật, và guideline sử dụng.

### Auth session

- `login_success`: đăng nhập hoàn tất (đã có session).
- `login_failed`: đăng nhập thất bại (mật khẩu sai, user không active, security monitor chặn, OAuth thất bại, v.v.).
- `logout`: user logout một session.
- `logout_all_sessions`: user logout toàn bộ session.
- `refresh_token_success`: refresh token thành công, cấp access token mới.
- `refresh_token_failed`: refresh token thất bại (token không hợp lệ, hết hạn, bị revoke, v.v.).

### Registration & account state

- `register_started`: bắt đầu flow đăng ký (tạo user, gửi OTP xác minh).
- `register_completed`: tài khoản được kích hoạt thành công.
- `register_failed`: đăng ký thất bại (user đã tồn tại, OTP sai, v.v. – chi tiết nằm trong `error`).
- `account_locked`: tài khoản bị khoá (lý do trong `reason`).
- `account_unlocked`: tài khoản được mở khoá trở lại.

### Password & recovery

- `password_changed`: mật khẩu được thay đổi (bởi user hoặc admin).
- `password_reset_requested`: yêu cầu reset mật khẩu (gửi OTP / link).
- `password_reset_completed`: reset mật khẩu hoàn tất.
- `password_reset_failed`: reset mật khẩu thất bại (OTP/ token sai hoặc hết hạn).

### OTP

- `otp_sent`: gửi OTP thành công, phân biệt bằng `purpose`:
  - `REGISTER`
  - `FORGOT_PASSWORD`
  - `RESET_MFA`
- `otp_send_failed`: gửi OTP thất bại (user không tồn tại, không thoả điều kiện, rate limit, lỗi queue, v.v. – chi tiết trong `error`).
- `otp_invalid`: OTP không hợp lệ trong bước verify (sai, hết hạn, không khớp purpose).
- `otp_rate_limited`: bị giới hạn gửi OTP do chạm ngưỡng bảo mật.

### MFA

- `mfa_setup_started`: bắt đầu setup MFA (phát TOTP secret, tạo mfaToken).
- `mfa_setup_completed`: setup MFA hoàn tất, user đã bật MFA.
- `mfa_setup_failed`: setup MFA thất bại (OTP sai, session hết hạn, v.v.).
- `mfa_enabled`: trạng thái MFA đã được bật (sau khi setup xong hoặc generate backup codes).
- `mfa_disabled`: MFA bị tắt (bởi user hoặc admin).
- `mfa_verified`: MFA challenge thành công trong flow đăng nhập.
- `mfa_failed`: MFA challenge thất bại (OTP sai, backup code sai, session hết hạn, quá nhiều attempts, v.v.).
- `mfa_challenge_started`: bắt đầu bước xác thực MFA (sau khi username/password hoặc OAuth thành công nhưng trước khi có session).

### Security posture & monitoring

- `suspicious_activity`: ghi nhận hành vi bất thường (unknown device, IP lạ, location bất thường, permission escalation, v.v.). Chi tiết nằm trong:
  - `activity`: loại hành vi (ví dụ: `unknown_device`, `ip_not_whitelisted`, …).
  - `details`: metadata tuỳ ý.
- `ip_changed`: IP user thay đổi bất thường (nếu cần tách riêng khỏi `suspicious_activity`).
- `device_changed`: thiết bị user thay đổi bất thường.
- `permission_escalation`: quyền của user tăng bất thường (so sánh `previousPermissions` và `newPermissions`).

### API key

- `api_key_created`: API key mới được tạo (chứa `keyPrefix`, `name`).
- `api_key_revoked`: API key bị revoke (có thể có `reason`).
- `api_key_usage_blocked`: request dùng API key bị chặn (key invalid, revoked, expired, IP không được phép, v.v. – lý do trong `reason`).

### Data & bulk

- `data_exported`: dữ liệu được export (loại export và số bản ghi).
- `bulk_operation`: thực thi thao tác hàng loạt (operation, entityType, recordCount).

### Rate limit

- `rate_limit_exceeded`: vi phạm rate limit trên route cụ thể (`routePath`, `identifier`, `count`, `limit`).

### Guideline sử dụng

- **Khi nào dùng security event vs CUD audit**:
  - Các thay đổi dữ liệu thông thường (create/update/delete entity) → dùng `pushCud` với `AuditLogCategory.cud`.
  - Các hành vi liên quan tới authentication, bảo mật, rate limit, API key, suspicious activity → dùng `pushSecurity` với `SecurityEventType` tương ứng.
- **Tên event**:
  - Dùng động từ + trạng thái rõ ràng: `*_started`, `*_completed`, `*_failed`, `*_success`, `*_failed`.
  - Không reuse `login_success/login_failed` cho các bước không phải login thực sự (ví dụ gửi OTP, logout, setup MFA).
- **Metadata**:
  - Thông tin chi tiết nên đặt trong các field chuẩn hoặc `metadata`:
    - `method` (email/oauth/api_key/totp/backup-code).
    - `email` (nếu có).
    - `reason` / `error` (chuỗi ngắn, có thể dùng để filter và thống kê).
    - `purpose` cho OTP (`REGISTER`, `FORGOT_PASSWORD`, `RESET_MFA`).
    - `routePath`, `identifier` cho rate limit.
  - Tránh log dữ liệu nhạy cảm (plaintext password, OTP, token, …).
