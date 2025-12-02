# Hướng dẫn FE triển khai trang quản lý User (CRUD)

Tài liệu này mô tả chi tiết cách phía FE tương tác với các API `admin/users` đã có sẵn để xây dựng trang quản trị user
với các thao tác cơ bản: xem danh sách, xem chi tiết, tạo mới, cập nhật và thao tác MFA. Tất cả response đều được bọc
trong cấu trúc `ResWrapper` (`{ data: ..., code: string, t: string }`), vì vậy FE cần truy cập payload chính thông qua
trường `data`.

## 1. Điều kiện tiên quyết

- **Base URL:** cùng origin với service `server`, các route nằm dưới `/admin/users`.
- **Xác thực:** gửi header `Authorization: Bearer <access_token>` lấy từ flow đăng nhập Admin. Token phải còn hạn.
- **Quyền (permission) ứng với hành động UI:**
    - `USER.VIEW`: bắt buộc để tải danh sách và xem chi tiết.
    - `USER.UPDATE`: bắt buộc cho create/update profile.
    - `USER.RESET_MFA`: bắt buộc cho các thao tác reset/disable MFA.
- **Kiểu dữ liệu chung:**
    - `UserStatus`: enum backend định nghĩa (ví dụ `ACTIVE`, `SUSPENDED`, ...).
    - `LockoutReason`: enum backend định nghĩa (ví dụ `MANUAL`, `SECURITY_EVENT`, ...).
    - `roleIds`: danh sách id role, backend coi đây là danh sách đầy đủ nên FE phải gửi toàn bộ role hiện có mỗi lần
      update.
    - Phân trang dùng `skip` + `take` (mặc định `skip=0`, `take=20`).

## 2. Danh sách endpoint

| Hành động          | Method & Path                       | Mô tả nhanh                                    |
|--------------------|-------------------------------------|------------------------------------------------|
| Lấy danh sách user | `GET /admin/users`                  | Hỗ trợ filter email/status/role và phân trang  |
| Xem chi tiết user  | `GET /admin/users/:id`              | Trả profile đầy đủ phục vụ form detail         |
| Tạo user mới       | `POST /admin/users`                 | Nhận payload `AdminUserCreateDto`              |
| Cập nhật user      | `PATCH /admin/users/:id`            | Cho phép cập nhật status, roleIds, lockout,... |
| Reset MFA          | `POST /admin/users/:id/mfa/reset`   | Reset secret và ghi log, yêu cầu reason        |
| Disable MFA        | `POST /admin/users/:id/mfa/disable` | Vô hiệu hoàn toàn MFA hiện tại                 |

Chi tiết từng endpoint được mô tả dưới đây.

### 2.1 GET `/admin/users`

- **Query params (tất cả optional):**
    - `skip`: số item bỏ qua.
    - `take`: số item muốn lấy.
    - `email`: chuỗi filter chứa email (case-insensitive).
    - `status`: một giá trị `UserStatus`.
    - `roleId`: filter theo role cụ thể.
- **Response `data`:**
  ```json
  {
    "docs": [
      {
        "id": "usr_123",
        "email": "jane@example.com",
        "status": "ACTIVE",
        "name": "Jane Doe",
        "created": "2025-11-28T07:35:01.000Z",
        "emailVerified": true,
        "roles": [{ "roleId": "admin" }]
      }
    ],
    "count": 123
  }
  ```
- **Gợi ý UI:** sử dụng `count` để tính tổng trang; khi thay đổi filter nên reset `skip=0`.

### 2.2 GET `/admin/users/:id`

- **Response `data`:** bao gồm tất cả trường trong danh sách cộng thêm:
    - `modified`, `lockoutUntil`, `lockoutReason`, `passwordAttempt`, `passwordExpired`.
- **Use case:** populate form chi tiết, modal xem audit, hoặc kiểm tra trạng thái lockout.

### 2.3 POST `/admin/users`

- **Body (ít nhất phải có email + password):**
  ```json
  {
    "email": "new.admin@example.com",
    "password": "Sup3rSecr3t",
    "name": "New Admin",
    "roleIds": ["admin"],
    "baseCurrencyId": "USD",
    "status": "ACTIVE",
    "emailVerified": true
  }
  ```
  Các trường `name`, `roleIds`, `status`, `emailVerified` là optional.
- **Response `data`:** `{ "userId": "...", "auditLogId": "..." }`.
- **Gợi ý UI:** sau khi tạo thành công có thể điều hướng sang trang detail bằng `userId`. Hiển thị toast chứa
  `auditLogId` để admin dễ đối chiếu.

### 2.4 PATCH `/admin/users/:id`

- **Body:** mọi trường đều optional, FE chỉ gửi những field thay đổi.
    - `status`, `name`, `roleIds`, `lockoutUntil`, `lockoutReason`, `emailVerified`, `passwordAttempt`,
      `passwordExpired`, `reason`.
    - Nếu user đang bị lockout và muốn mở, gửi `lockoutUntil: null` và `lockoutReason: null`.
    - Khi cập nhật role, gửi toàn bộ danh sách role hiện muốn gán (không phải diff).
- **Response `data`:** giống create (`userId`, `auditLogId`).
- **Validation phía FE:** giới hạn `roleIds` là array string, `lockoutUntil/passwordExpired` phải dùng ISO string hoặc
  Date object trước khi stringify.

### 2.5 POST `/admin/users/:id/mfa/reset`

- **Body:** `{ "reason": "User lost device" }` (reason optional nhưng nên yêu cầu FE nhập để audit).
- **Tác dụng:** backend reset secret + revoke backup codes; sau đó user phải setup MFA lại khi đăng nhập.
- **Response:** `{ "userId", "auditLogId" }`.

### 2.6 POST `/admin/users/:id/mfa/disable`

- **Body:** cùng schema với reset.
- **Tác dụng:** vô hiệu hóa MFA hoàn toàn (dùng cho tình huống khẩn).
- **Response:** `{ "userId", "auditLogId" }`.

## 3. Quy ước UI khuyến nghị

- **Danh sách:**
    - Hiển thị cột `status`, `emailVerified`, `roles`, `created`.
    - Ô tìm kiếm email nên debounce 300ms rồi gọi lại API với `email`.
    - Dropdown filter status + role; gộp query vào URL để share link.
- **Chi tiết / form:**
    - Chia tab: *Thông tin chung*, *Bảo mật* (lockout, MFA).
    - Các trường thời gian (`created`, `modified`, `lockoutUntil`, `passwordExpired`) hiển thị theo timezone người dùng
      nhưng vẫn gửi ISO khi update.
    - Nếu bật toggle “Khóa tạm thời” => yêu cầu FE gửi `lockoutUntil` + `lockoutReason`.
- **Hành động nguy hiểm:** reset/disable MFA, thay đổi status → dùng modal xác nhận, bắt nhập `reason` để ghi log trọn
  vẹn.
- **Thông báo lỗi:** backend trả `ErrorResDto` với `code` cụ thể (ví dụ `ERR_PERMISSION_DENIED`, `ERR_VALIDATION`). FE
  nên map sang copy tiếng Việt thân thiện.

## 4. Test nhanh bằng cURL (tham khảo)

```bash
curl -X GET https://api.example.com/admin/users \
  -H "Authorization: Bearer <token>"

curl -X POST https://api.example.com/admin/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new.admin@example.com","password":"Sup3rSecr3t"}'
```

FE có thể dùng các request này để verify kết nối trước khi ghép UI.

## 5. Checklist triển khai FE

- [ ] Đồng bộ permission flow, ẩn nút nếu thiếu quyền.
- [ ] Xây dựng hook/service `useAdminUsers` wrap toàn bộ endpoint trên, luôn đọc/ghi `data`.
- [ ] Chuẩn hóa error handler và toast theo `code`.
- [ ] Thêm tracking hoặc audit context (ví dụ gửi `reason`) cho hành động nhạy cảm.
- [ ] Viết unit test/mock API cho các hook chính (list, detail, create, update, MFA).

