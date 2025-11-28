# Auth Login & MFA Flow (FE Guide)

## 0. Phạm vi

- Bao phủ toàn bộ luồng `login → bắt buộc setup MFA → xác thực OTP/backup code → sinh & tiêu thụ backup code`.
- Tài liệu nhằm hỗ trợ FE map màn hình và sequence call API theo chuẩn BE hiện tại.

## 1. Kiến trúc response cốt lõi

| `type` trong `POST /auth/login` | Ý nghĩa                                                            | Việc FE cần làm                                      |
|---------------------------------|--------------------------------------------------------------------|------------------------------------------------------|
| `completed`                     | Đăng nhập thành công, trả về `accessToken`, `refreshToken`, `user` | Lưu token, chuyển App Shell                          |
| `mfa-confirm`                   | User đã bật MFA, cần OTP hoặc backup code                          | Điều hướng sang màn `MFAChallenge` và lưu `mfaToken` |
| `mfa-setup`                     | Hệ thống bắt buộc user setup MFA trước khi vào app                 | Điều hướng sang wizard setup MFA, lưu `setupToken`   |

## 2. Flow chi tiết theo màn hình

### Flow A – Login không yêu cầu MFA

| Bước | Màn hình | API                | Payload chính         | Kết quả/ghi chú                                                          |
|------|----------|--------------------|-----------------------|--------------------------------------------------------------------------|
| 1    | `Login`  | `POST /auth/login` | `{ email, password }` | Nếu `type=completed` → lưu token, gọi `/auth/me` nếu cần & vào dashboard |

### Flow B – Login với MFA đã bật

| Bước | Màn hình                     | API                                  | Payload chính              | Kết quả/ghi chú                                                |
|------|------------------------------|--------------------------------------|----------------------------|----------------------------------------------------------------|
| 1    | `Login`                      | `POST /auth/login`                   | `{ email, password }`      | Nếu `type=mfa-confirm` → chuyển `MFAChallenge`, lưu `mfaToken` |
| 2    | `MFAChallenge` (OTP)         | `POST /auth/login/mfa`               | `{ mfaToken, otp }`        | Nhận `type=completed` + tokens → lưu và vào app                |
| 2b   | `MFAChallenge` (backup code) | `POST /auth/mfa/backup-codes/verify` | `{ mfaToken, backupCode }` | Case user mất app OTP; response vẫn là `completed`             |

### Flow C – Login bị bắt buộc setup MFA trước khi vào app

| Bước | Màn hình                                       | API                                  | Payload chính                                 | Kết quả/ghi chú                                                  |
|------|------------------------------------------------|--------------------------------------|-----------------------------------------------|------------------------------------------------------------------|
| 1    | `Login`                                        | `POST /auth/login`                   | `{ email, password }`                         | Nếu `type=mfa-setup` → chuyển `MFASetupWizard`, lưu `setupToken` |
| 2    | `MFASetupWizard - Request secret`              | `POST /auth/mfa/setup/request`       | `{ setupToken }` (không header Authorization) | Nhận `{ mfaToken, totpSecret }`; render QR + secret cho user     |
| 3    | `MFASetupWizard - Confirm OTP`                 | `POST /auth/mfa/setup/confirm`       | `{ mfaToken, otp }`                           | Response `{ mfaToken, loginToken }`                              |
| 4    | `MFAChallenge`                                 | `POST /auth/login/mfa/confirm`       | `{ mfaToken, loginToken, otp }`               | Nhận token hoàn chỉnh → lưu và vào app                           |
| 4b   | Nếu user muốn dùng backup code ngay sau bước 3 | `POST /auth/mfa/backup-codes/verify` | `{ mfaToken, backupCode }`                    | Hoàn tất login bằng backup code                                  |

### Flow D – Setup MFA trong trang Setting (đã login)

| Bước | Màn hình                              | API                                    | Payload chính                                       | Kết quả/ghi chú                                                                                |
|------|---------------------------------------|----------------------------------------|-----------------------------------------------------|------------------------------------------------------------------------------------------------|
| 1    | `SecuritySettings`                    | `POST /auth/mfa/setup/request`         | `{}` + header `Authorization: Bearer <accessToken>` | Trả `{ mfaToken, totpSecret }`                                                                 |
| 2    | `SecuritySettings` modal nhập OTP     | `POST /auth/mfa/setup/confirm`         | `{ mfaToken, otp }`                                 | Trả `{ mfaToken, loginToken }`; vì user đã login nên không cần bước 3, chỉ cần refetch profile |
| 3    | (tuỳ chọn) `Generate backup code` CTA | `POST /auth/mfa/backup-codes/generate` | `{ otp }`                                           | Nhận danh sách `codes`; FE hiển thị một lần & yêu cầu user lưu                                 |

### Flow E – Backup code management

| Tác vụ              | Màn hình           | API                                    | Payload                         | Ghi chú                                                         |
|---------------------|--------------------|----------------------------------------|---------------------------------|-----------------------------------------------------------------|
| Sinh lại            | `SecuritySettings` | `POST /auth/mfa/backup-codes/generate` | `{ otp }`                       | Yêu cầu OTP để xác nhận đúng chủ                                |
| Kiểm tra remaining  | `SecuritySettings` | `GET /auth/mfa/backup-codes/remaining` | Header `Authorization`          | Trả `{ remaining, total }` để render UI                         |
| Vô hiệu hóa MFA     | `SecuritySettings` | `POST /auth/mfa/disable`               | `{ otp }` hoặc `{ backupCode }` | Sau khi disable cần yêu cầu user login lại vì BE revoke session |
| Reset qua email OTP | `Support` flow     | `POST /auth/mfa/reset`                 | `{ otpToken, otp }`             | Dùng khi user mất cả app OTP lẫn backup codes                   |

## 3. Payload & response quan trọng

### 3.1 Login APIs

- `POST /auth/login`: body `{ email, password }`. Response union `completed | mfa-confirm | mfa-setup`. (
  `LoginRequestDto`, `LoginResponseDto`)
- `POST /auth/login/mfa`: body `{ mfaToken, otp }`. Trả `completed`.
- `POST /auth/login/mfa/confirm`: body `{ mfaToken, loginToken, otp }`. Sử dụng riêng cho flow sau khi `setup/confirm`.

### 3.2 Setup MFA APIs

- `POST /auth/mfa/setup/request`: body `{ setupToken? }`. Nếu user đã login chỉ cần header Authorization (body rỗng).
  Trả `{ mfaToken, totpSecret }`.
- `POST /auth/mfa/setup/confirm`: body `{ mfaToken, otp }`. Trả `{ mfaToken, loginToken }`.
- `GET /auth/mfa/status`: header Authorization, trả `{ enabled, hasBackupCodes, backupCodesRemaining }`.

### 3.3 Backup code APIs

- `POST /auth/mfa/backup-codes/generate`: body `{ otp }`, trả `{ codes[], message }`. FE phải render & yêu cầu user lưu,
  server chỉ trả plaintext 1 lần.
- `POST /auth/mfa/backup-codes/verify`: body `{ mfaToken, backupCode }`, dùng cả khi login thường hoặc sau
  `setup/confirm`.
- `GET /auth/mfa/backup-codes/remaining`: header Authorization, trả `{ remaining, total }`.

## 4. UI/UX note & error handling

- `mfaToken` sống ngắn; BE limit 5 lần nhập sai (`ErrCode.TooManyAttempts`). FE nên khóa nút gửi OTP khi nhận 400 với
  message `Too many attempts`.
- Backup code dài 8 ký tự uppercase. Hiển thị kiểu block (XXXX-XXXX) để user dễ nhập nhưng gửi lên không có dấu gạch.
- `setupToken` chỉ tồn tại một lần duy nhất cho mỗi login flow; nếu user reload wizard cần phát lại from step 2 (call
  `setup/request` với cùng token).
- Khi generate backup codes mới, codes cũ bị revoke; hiển thị cảnh báo trước khi gọi API.
- Sau `POST /auth/mfa/disable` hoặc `reset`, server revoke session ⇒ FE cần buộc user login lại.

## 5. Tham chiếu nhanh đến định nghĩa API

```33:82:server/src/modules/auth/controllers/auth.controller.ts
  .post('/login', async ({ body }) => castToRes(await authService.login(body)))
  .post('/login/mfa/confirm', async ({ body }) =>
    castToRes(await authService.confirmMfaLogin(body)),
  )
  .post('/login/mfa', async ({ body }) =>
    castToRes(await authService.loginWithMfa(body)),
  )
```

```20:114:server/src/modules/auth/controllers/mfa/mfa.controller.ts
export const mfaController = new Elysia({ prefix: 'auth/mfa' })
  .post('setup/request', async ({ body }) =>
    castToRes(await mfaSetupService.setupMfaRequest(body)),
  )
  .post('setup/confirm', async ({ body }) =>
    castToRes(await mfaSetupService.setupMfa(body)),
  )
  .post('disable', async ({ body, currentUser: { id } }) =>
    castToRes(await mfaSetupService.disableMfa({ userId: id, ...body })),
  )
  .get('status', async ({ currentUser: { id } }) =>
    castToRes(await mfaSetupService.getMfaStatus(id)),
  );
```

```20:94:server/src/modules/auth/controllers/mfa/backup.controller.ts
export const backupController = new Elysia({ prefix: 'auth/mfa/backup-codes' })
  .post('generate', async ({ body: { otp }, currentUser: { id } }) =>
    castToRes(await mfaBackupService.generateBackupCodes({ otp })),
  )
  .post('verify', async ({ body: { backupCode, mfaToken } }) =>
    castToRes(await mfaBackupService.verifyBackupCode({ mfaToken, backupCode })),
  )
  .get('remaining', async ({ currentUser: { id } }) =>
    castToRes(await mfaBackupService.getBackupCodesRemaining(id)),
  );
```


