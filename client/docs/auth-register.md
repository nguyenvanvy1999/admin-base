# Đăng ký tài khoản người dùng

## Bối cảnh & phạm vi

- Tài liệu này hướng dẫn đội FE xây UI đăng ký (signup) cho người dùng tiêu chuẩn dựa trên API hiện có ở `@server`.
- Flow mới nên tái sử dụng hạ tầng sẵn có: `AppForm`, `AppModal`, `@tanstack/react-query` (`useMutation`), `authStore`
  và `AuthProvider`.
- Đăng ký là quy trình hai bước: tạo tài khoản → xác thực email bằng OTP → điều hướng về trang đăng nhập hoặc tự động
  đăng nhập (tùy yêu cầu sản phẩm).

## API contract ghép với @server

| Use case                               | Method | Endpoint                        | Payload                                                      | Response                                                             |
|----------------------------------------|--------|---------------------------------|--------------------------------------------------------------|----------------------------------------------------------------------|
| Gửi thông tin đăng ký                  | `POST` | `/api/auth/user/register`       | `{ email: string; password: string }` (password 8-128 ký tự) | `{ data: { otpToken: string } }` hoặc `{ data: null }` (`OtpResDto`) |
| Xác thực tài khoản bằng OTP            | `POST` | `/api/auth/user/verify-account` | `{ otpToken: string; otp: string }` (OTP 6 chữ số)           | `{ data: null }`                                                     |
| Gửi lại OTP (nếu người dùng chưa nhận) | `POST` | `/api/auth/otp`                 | `{ email: string; purpose: 'register' }`                     | `{ data: { otpToken: string } }` hoặc `{ data: null }`               |

> Các schema ở backend được định nghĩa trong `RegisterRequestDto`, `VerifyAccountRequestDto` và `OtpResDto`. Endpoint
`/auth/user/register` trả về `200` ngay cả khi không cấp OTP mới; FE cần đọc `data` để quyết định bước tiếp theo.

## Luồng FE đề xuất

1. **Bước nhập thông tin (`credentials`)**
    - Form gồm email + password, dùng cùng bộ quy tắc với backend:
        - Email: định dạng chuẩn, lowercase trước khi gửi.
        - Password: tối thiểu 8, tối đa 128 ký tự; có thể tái sử dụng validater hiện có của login.
    - Mutation `registerMutation` gọi `/auth/user/register`. Thành công trả `otpToken` (hoặc `null`).
        - Giữ `otpToken` và `email` trong local state (ví dụ hook `useRegisterFlow`).
        - Nếu response `null`, nghĩa là backend không yêu cầu OTP (ít xảy ra), có thể điều hướng thẳng đến `/login` với
          toast thành công.

2. **Bước nhập OTP (`otp`)**
    - Hiển thị component OTP 6 chữ số (có thể tái dùng `Input.OTP`).
    - Mutation `verifyAccount` gọi `/auth/user/verify-account` với `otpToken` (từ bước trước hoặc lần resend) và OTP.
    - Thành công → hiện màn hình “đăng ký thành công”, điều hướng về `/login` và auto-điền email của người dùng.

3. **Resend OTP**
    - CTA “Gửi lại” gọi `/auth/otp` với payload `{ email, purpose: 'register' }`.
    - Nếu API trả `null`, backend đã chặn (do vượt giới hạn `otp_limit` hoặc user không còn ở trạng thái `inactive`). FE
      cần hiển thị lỗi tổng quát và khóa nút resend.

4. **Sau khi xác thực**
    - Hiện thông báo và chuyển về trang đăng nhập.
    - Tùy yêu cầu, có thể tự động đăng nhập bằng cách gọi lại `/auth/login` với email/password người dùng đã nhập (cần
      lưu password an toàn trong memory tới khi OTP xong).

## Rate limit & UX cần lưu ý

- **Register rate limit**: backend giới hạn số lần gửi `POST /auth/user/register` theo cặp `{IP, email}` (
  `registerRateLimit`). Nếu vi phạm, API trả `400` với thông điệp “Too many registration attempts…”. FE nên gom lỗi này
  vào banner và khóa form trong vài chục giây.
- **OTP resend limit**: backend theo dõi số lần gửi OTP đăng ký (`registerOtpLimit`). Khi vượt ngưỡng khai báo trong
  `settingService.registerRateLimit().otpLimit`, hệ thống tự động chuyển user sang trạng thái `suspendded`. FE cần cảnh
  báo người dùng sau 3–5 lần gửi lại thất bại, đồng thời disable resend.
- **OTP hết hạn**: token OTP do backend cấp sẽ hết hạn theo cấu hình chung của dịch vụ OTP. Nếu `/verify-account` trả
  `InvalidOtp`, hiển thị lỗi, reset input và cho phép gửi lại.

## Kiến trúc FE gợi ý

- Tạo hook `useRegisterFlow` trong `src/features/auth/hooks/` để gom state (`step`, `email`, `password`, `otpToken`,
  `errors`). Hook sử dụng `useMutation` cho từng API và expose các handler: `submitCredentials`, `submitOtp`,
  `resendOtp`, `reset`.
- UI có thể gom thành hai component:
    1. `RegisterForm` (bước credentials) — tái dùng layout và styles của `LoginForm`.
    2. `RegisterOtpStep` — chứa input OTP, nút resend, hiển thị countdown.
- Store: không cần đẩy state vào `authStore` cho tới khi người dùng đăng nhập. Tuy nhiên, có thể lưu `registerEmail`
  trong `localStorage` để tự động điền vào login.
- Service layer: mở rộng `src/services/auth.ts` với 3 hàm `register`, `verifyAccount`, `sendRegisterOtp`. Các URL được
  cấu hình trong `AUTH_ENDPOINTS`.
- Types: bổ sung `RegisterPayload`, `RegisterResponse`, `VerifyAccountPayload`, `OtpPurpose = 'register' | ...` trong
  `src/types/auth.ts` để đồng bộ với server.

## Test checklist

- Gửi form với email đã tồn tại → API trả `400` (ErrCode `UserExisted`). UI phải hiển thị lỗi cụ thể.
- Nhập password < 8 ký tự → validation client-side chặn trước khi gọi API.
- Sau khi đăng ký, nhập OTP sai (hoặc hết hạn) → hiển thị lỗi và giữ nguyên bước OTP.
- Gửi lại OTP quá nhiều lần → API trả `null`. UI hiển thị thông báo và disable resend.
- Sau khi xác thực, điều hướng về `/login`, email được auto-fill.

## Tham chiếu backend

```194:233:server/src/modules/auth/controllers/auth.controller.ts
.post(
  '/register',
  async ({ body }) => castToRes(await authService.register(body)),
  { body: RegisterRequestDto, response: ResWrapper(OtpResDto) }
)
```

```563:600:server/src/service/auth/auth.service.ts
async verifyAccount(params: VerifyAccountParams): Promise<void> {
  const userId = await this.deps.otpService.verifyOtp(otpToken, PurposeVerify.REGISTER, otp);
  await tx.user.update({ status: UserStatus.active });
}
```

```12:37:server/src/modules/auth/controllers/otp.controller.ts
post('/auth/otp', { body: { email, purpose }, response: ResWrapper(OtpResDto) })
```

