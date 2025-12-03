# Hướng dẫn FE triển khai trang quản lý Session

Tài liệu này mô tả chi tiết cách phía FE tương tác với:

- Các API `auth` (logout hiện tại/ logout toàn bộ).
- Các API `admin/sessions` (xem & revoke session ở mức admin).
- Các Settings liên quan tới session (`ENB_ONLY_ONE_SESSION`, rate limit, bảo mật thiết bị).

Mục tiêu:

- Xây UI/UX nhất quán với các màn Admin khác (Users, Roles, Settings).
- Đảm bảo **current user** có thể tự quản lý session của mình.
- Cho phép **một số user có quyền** quản lý **toàn bộ session** của hệ thống khi điều tra bảo mật.

Tất cả response admin đều được bọc trong cấu trúc `ResWrapper` (`{ data: ..., code: string, t: string }`), FE cần truy cập payload chính thông qua trường `data`.

---

## 1. Điều kiện tiên quyết

- **Base URL Auth:** cùng origin với service `server`, các route auth nằm dưới `/auth`.
- **Base URL Admin:** cùng origin với service `server`, các route admin session nằm dưới `/api/admin/sessions`.
- **Xác thực:** gửi header `Authorization: Bearer <access_token>` lấy từ flow đăng nhập Admin/User. Token phải còn hạn.
- **Permissions quan trọng cho Session:**
  - `SESSION.VIEW`: xem **session của chính mình**.
  - `SESSION.VIEW_ALL`: xem **tất cả session** trong hệ thống.
  - `SESSION.REVOKE`: revoke session của chính mình (qua admin panel).
  - `SESSION.REVOKE_ALL`: revoke **bất kỳ session** nào (toàn hệ thống).
- **Các Settings liên quan (đã mô tả chi tiết trong `fe-setting-management-guide.md`):**
  - `ENB_ONLY_ONE_SESSION` (boolean): nếu bật, hệ thống chỉ cho phép **một session đăng nhập tại một thời điểm**.
  - Các setting rate limit login/OTP: ảnh hưởng tới tần suất thao tác trên màn đăng nhập nhưng không thay đổi API session.

---

## 2. Danh sách endpoint liên quan

### 2.1 Endpoint Auth (tự quản lý session hiện tại)

| Hành động                                 | Method & Path      | Mô tả nhanh                                              |
|-------------------------------------------|--------------------|----------------------------------------------------------|
| Logout khỏi thiết bị hiện tại             | `POST /auth/logout`      | Invalidate session tương ứng với access token hiện tại    |
| Logout khỏi **tất cả** thiết bị của user | `POST /auth/logout/all`  | Invalidate toàn bộ session của current user              |

#### 2.1.1 `POST /auth/logout`

- **Body:** không có.
- **Response `data`:** `null`.
- **Use case FE:**
  - Nút "Đăng xuất" trong menu user (header).
  - Khi gọi thành công:
    - Xoá token khỏi storage.
    - Reset state auth (store).
    - Điều hướng về màn Login.

#### 2.1.2 `POST /auth/logout/all`

- **Body:** không có.
- **Response `data`:** `null`.
- **Use case FE:**
  - Nút "Đăng xuất khỏi tất cả thiết bị" trong:
    - Trang "My Account" / "Bảo mật tài khoản".
    - Hoặc trong màn "Phiên đăng nhập của tôi" (xem thêm mục 3).
  - Sau khi gọi thành công:
    - Session hiện tại cũng bị revoke → FE cần:
      - Xoá token khỏi storage.
      - Điều hướng về Login với thông báo "Bạn đã đăng xuất khỏi tất cả thiết bị".

---

### 2.2 Endpoint Admin Session (xem & revoke session)

| Hành động              | Method & Path             | Mô tả nhanh                                                                                 |
|------------------------|---------------------------|---------------------------------------------------------------------------------------------|
| Lấy danh sách sessions | `GET /api/admin/sessions` | Phân trang theo `cursor`, filter theo thời gian tạo, IP, trạng thái revoked; tôn trọng quyền |
| Revoke nhiều sessions  | `POST /api/admin/sessions/revoke` | Revoke 1 hoặc nhiều session theo `ids`; quyền kiểm tra theo `SESSION.REVOKE` / `SESSION.REVOKE_ALL` |

#### 2.2.1 `GET /api/admin/sessions`

- **Query params (bắt buộc & optional):**

```json
{
  "take": 20,                // required - page size, integer >= 1
  "cursor": "sess_123",      // optional - dùng cho phân trang cursor
  "created0": "2025-12-01T00:00:00.000Z", // required - from date
  "created1": "2025-12-02T23:59:59.999Z", // required - to date
  "revoked": false,          // optional - filter theo trạng thái revoked
  "ip": "203.113.0.1"        // optional - filter theo IP chính xác
}
```

- **Response `data`:**

```json
{
  "docs": [
    {
      "id": "sess_001",
      "created": "2025-12-02T10:00:00.000Z",
      "expired": "2025-12-02T12:00:00.000Z",
      "createdById": "usr_123",
      "revoked": false,
      "ip": "203.113.0.1"
    }
  ],
  "hasNext": true,
  "nextCursor": "sess_001"
}
```

- **Logic phân quyền (BE, FE cần nắm để thiết kế UI):**
  - Nếu user **không có** `SESSION.VIEW_ALL`:
    - Backend **tự động** thêm điều kiện `createdById = currentUser.id`.
    - → Dù FE có cố query gì, kết quả **chỉ chứa session của chính current user**.
  - Nếu user **có** `SESSION.VIEW_ALL`:
    - Backend **không thêm** filter theo `createdById`.
    - → Kết quả có thể chứa session của nhiều user khác nhau.

- **Gợi ý FE:**
  - Đối với user thường (chỉ `SESSION.VIEW`):
    - Không cần hiển thị filter "User" vì backend đã giới hạn theo current user.
  - Đối với admin (`SESSION.VIEW_ALL`):
    - Hiển thị thêm cột `createdById` (userId) và/hoặc email (nếu FE join thêm từ API Users).
    - Có thể filter client-side theo userId khi xem session của một user cụ thể (từ màn User detail).

#### 2.2.2 `POST /api/admin/sessions/revoke`

- **Path params:**

```json
{
  "id": "sess_001"
}
```

- **Body:** không có.
- **Response `data`:** `null`.

- **Logic phân quyền (BE):**
  - Cho phép nếu **thoả một trong hai**:
    - User có `SESSION.REVOKE_ALL`.
    - Hoặc user có `SESSION.REVOKE` **và** session thuộc về chính user đó (`createdById = currentUser.id`).
  - BE sử dụng cơ chế `isSelf(...)` để đảm bảo user không revoke session của người khác nếu chỉ có `SESSION.REVOKE`.

- **Use case FE:**
  - Nút "Revoke" / "Thu hồi" trên từng dòng session:
    - Nếu user chỉ có `SESSION.REVOKE`: chỉ show các session của chính họ (hoặc ẩn các session khác nếu có data).
    - Nếu user có `SESSION.REVOKE_ALL`: cho phép revoke mọi session trong danh sách.
  - Sau khi revoke thành công:
    - Refetch danh sách session.
    - Nếu revoke **session hiện tại**, FE cần xử lý như logout:
      - Xoá token.
      - Điều hướng về Login.

---

## 3. UI/UX – Màn "Phiên đăng nhập của tôi" (Current user sessions)

Màn này hướng tới **mọi user** có quyền tối thiểu `SESSION.VIEW` (hoặc chỉ cần token hợp lệ nếu team quyết định cho phép dựa trên `/auth/logout` + `/api/admin/sessions`).

### 3.1 Mục tiêu UX

- User tự trả lời được:
  - Mình đang đăng nhập từ **những thiết bị/IP nào**?
  - Có phiên nào **đã revoke** hoặc **sắp hết hạn**?
- Cho phép user:
  - Đăng xuất khỏi **thiết bị hiện tại**.
  - Đăng xuất khỏi **tất cả thiết bị**.
  - (Tuỳ quyền) revoke từng session cụ thể.

### 3.2 Layout gợi ý

- **Vị trí:** tab "Bảo mật" hoặc "Phiên đăng nhập" trong trang "My Account".
- **Filter phía trên:**
  - Date range (`created0`, `created1`) – mặc định:
    - `created1 = now`.
    - `created0 = now - 7 ngày` (hoặc 30 ngày tuỳ yêu cầu).
  - Checkbox/Segment:
    - "Chỉ hiển thị session đang hoạt động" (`revoked = false` và `expired > now` – phần `expired` FE tự kiểm tra client-side).
  - Input IP (optional).
- **Danh sách session (table/card):**
  - Cột gợi ý:
    - `Thiết bị` (nếu sau này có thêm user agent/device; hiện tại có thể bỏ trống hoặc hiển thị "Unknown device").
    - `IP`.
    - `Thời gian đăng nhập` (`created`, format local).
    - `Hết hạn` (`expired`, format local).
    - `Trạng thái`:
      - Active (chưa revoked, `expired > now`).
      - Revoked.
      - Expired.
    - `Hành động`:
      - Nút "Revoke" nếu user có `SESSION.REVOKE`.
  - Đánh dấu session hiện tại:
    - FE có thể so sánh `sessionId` trong token với `id` để hiển thị badge "Thiết bị hiện tại".

### 3.3 Hành động & flow

- **Đăng xuất thiết bị hiện tại:**
  - Gọi `POST /auth/logout`.
  - Hiển thị toast "Đăng xuất thành công".
  - Xoá token + điều hướng Login.
- **Đăng xuất khỏi tất cả thiết bị:**
  - Hiển thị modal confirm:
    - Copy gợi ý: "Bạn sẽ bị đăng xuất khỏi tất cả thiết bị, bao gồm cả thiết bị hiện tại."
  - Gọi `POST /auth/logout/all`.
  - Xử lý tương tự logout hiện tại.
- **Revoke một session:**
  - Nếu revoke **session khác** (không phải current):
    - Gọi `POST /api/admin/sessions/:id/revoke`.
    - Refetch danh sách, show toast success.
  - Nếu revoke **session hiện tại**:
    - Sau khi call thành công, coi như logout bắt buộc:
      - Xoá token.
      - Điều hướng Login với thông báo "Phiên hiện tại đã bị thu hồi".

---

## 4. UI/UX – Màn Admin quản lý Session (quản lý toàn bộ hệ thống)

Màn này chỉ hiển thị cho user có quyền:

- `SESSION.VIEW_ALL` để xem toàn bộ.
- `SESSION.REVOKE_ALL` để revoke bất kỳ session.

User chỉ có `SESSION.VIEW` và/hoặc `SESSION.REVOKE` có thể tái sử dụng cùng UI nhưng:

- Dữ liệu thực tế sẽ **chỉ chứa session của user đó**.
- Các cột, filter liên quan đến "User khác" nên được ẩn hoặc read-only.

### 4.1 Mục tiêu UX

- Hỗ trợ admin, security engineer:
  - Điều tra **hoạt động đăng nhập bất thường** (IP lạ, số lượng phiên nhiều).
  - Nhanh chóng revoke session nguy hiểm.
- Giữ UI đồng nhất với các trang Admin khác (Users, Roles, Settings).

### 4.2 Layout gợi ý

- **Filter bar:**
  - Date range bắt buộc (`created0`, `created1`):
    - Quick preset: Hôm nay / 7 ngày qua / 30 ngày qua.
  - Input IP (exact match).
  - Select trạng thái:
    - All.
    - Only active (client-side: `revoked = false` & `expired > now`).
    - Only revoked (`revoked = true`).
- **Bảng danh sách:**
  - Cột gợi ý:
    - `Thời gian đăng nhập` (`created`).
    - `Hết hạn` (`expired`).
    - `User ID` (`createdById`).
      - Nếu cần hiển thị email/username:
        - FE có thể join từ `admin/users` (cache map userId → email).
    - `IP`.
    - `Trạng thái`:
      - Badge: Active / Revoked / Expired.
    - `Hành động`:
      - Nút "Revoke", chỉ hiển thị nếu:
        - User có `SESSION.REVOKE_ALL`, hoặc
        - User có `SESSION.REVOKE` và `createdById === currentUser.id`.
- **Phân trang:**
  - Sử dụng `cursor` + `hasNext` + `nextCursor` để implement nút "Tải thêm" hoặc infinite scroll.

### 4.3 Hành vi & lỗi

- Khi revoke thành công:
  - Ghi log audit (BE đã làm sẵn qua `ACTIVITY_TYPE.REVOKE_SESSION`).
  - FE chỉ cần:
    - Refetch danh sách.
    - Hiển thị toast "Thu hồi session thành công".
- Trường hợp lỗi thường gặp:
  - `ERR_PERMISSION_DENIED`: thiếu quyền revoke → ẩn button hoặc disable từ đầu.
  - `ERR_ITEM_NOT_FOUND`: session không tồn tại hoặc đã revoke → refetch danh sách và show message "Phiên đã không còn tồn tại".

---

## 5. Liên hệ với Settings – `ENB_ONLY_ONE_SESSION`

`ENB_ONLY_ONE_SESSION` đã được mô tả trong `fe-setting-management-guide.md`. Ở đây tập trung vào **tác động UI/UX của Session**:

- Khi `ENB_ONLY_ONE_SESSION = true`:
  - Hệ thống chỉ cho phép **01 session active** cho mỗi user.
  - Khi user đăng nhập trên thiết bị mới:
    - BE sẽ tự động revoke các session cũ.
    - Màn "Phiên đăng nhập của tôi" sẽ thường chỉ có:
      - 1 session Active.
      - Một số session Revoked/Expired (lịch sử gần đây).
- Khi `ENB_ONLY_ONE_SESSION = false`:
  - User có thể đăng nhập từ nhiều thiết bị cùng lúc.
  - Trang session sẽ giúp:
    - User tự phát hiện login lạ.
    - Admin theo dõi pattern đăng nhập.

### 5.1 UI gợi ý khi setting thay đổi

- Trên màn "Phiên đăng nhập của tôi":
  - Nếu detect `ENB_ONLY_ONE_SESSION = true`:
    - Hiển thị notice: "Hệ thống chỉ cho phép một phiên đăng nhập hoạt động tại một thời điểm. Khi bạn đăng nhập từ thiết bị mới, các phiên cũ sẽ tự động bị đăng xuất."
- Trên màn Admin Settings:
  - Khi admin bật `ENB_ONLY_ONE_SESSION`:
    - FE có thể hiển thị cảnh báo tác động tới UX:
      - "Một số user có thể bị logout khỏi thiết bị cũ khi đăng nhập lại."

---

## 6. Đề xuất cải tiến BE/FE cho tính năng Session

Phần này là **đề xuất** để team cân nhắc, chưa được đảm bảo đã có trong code.

### 6.1 Đề xuất BE

- **Bulk revoke sessions:**
  - Hiện `SessionService.revoke(userId, sessionIds)` đã hỗ trợ mảng `sessionIds`.
  - Đề xuất thêm endpoint:

    - `POST /api/admin/sessions/revoke`

    ```json
    {
      "sessionIds": ["sess_001", "sess_002"]
    }
    ```

    - Logic quyền:
      - Tương tự `/:id/revoke`:
        - `SESSION.REVOKE_ALL`: revoke danh sách bất kỳ.
        - `SESSION.REVOKE`: chỉ revoke các session thuộc về current user.

- **Filter theo userId trực tiếp từ backend:**
  - Thêm `userId?: string` vào `SessionPaginateDto` và điều kiện query.
  - Cho phép FE gọi:

    ```text
    GET /api/admin/sessions?userId=usr_123&created0=...&created1=...&take=20
    ```

  - Giúp màn User Detail có tab "Phiên đăng nhập" trực tiếp filter đúng user.

- **Bổ sung thông tin thiết bị:**
  - Mở rộng model session và DTO để có:
    - `userAgent`.
    - `deviceFingerprint` (nếu sẵn logic device recognition).
  - FE có thể hiển thị:
    - "Chrome on Windows", "Safari on iOS", ...

### 6.2 Đề xuất FE

- **Tách service & hooks:**

```ts
// services/api/admin-sessions.service.ts
export interface AdminSession {
  id: string;
  created: string;
  expired: string;
  createdById: string;
  revoked: boolean;
  ip: string | null;
}

export interface AdminSessionListParams {
  take: number;
  cursor?: string;
  created0: string;
  created1: string;
  revoked?: boolean;
  ip?: string;
}
```

- Xây hook `useAdminSessions` (tương tự `useAdminRoles`, `useAdminSettings`) với:
  - Hỗ trợ infinite scroll bằng `cursor`.
  - Chuẩn hoá parse `created`, `expired` thành `Date`.
  - Expose helper để tính trạng thái `Active/Revoked/Expired`.

---

## 7. Checklist triển khai FE

- **Luồng current user:**
  - [ ] Thêm màn "Phiên đăng nhập của tôi" trong trang "My Account".
  - [ ] Gọi `GET /api/admin/sessions` với filter mặc định 7–30 ngày để hiển thị lịch sử phiên.
  - [ ] Implement nút "Đăng xuất" (`POST /auth/logout`) và "Đăng xuất khỏi tất cả thiết bị" (`POST /auth/logout/all`).
  - [ ] Cho phép revoke từng session (nếu user có quyền `SESSION.REVOKE`).
  - [ ] Xử lý đúng khi session hiện tại bị revoke (logout bắt buộc).

- **Luồng admin:**
  - [ ] Xây màn Admin Sessions với filter thời gian, IP, trạng thái.
  - [ ] Hiển thị cột `createdById` và, nếu cần, map sang email từ API Users.
  - [ ] Cho phép revoke session theo quyền `SESSION.REVOKE` / `SESSION.REVOKE_ALL`.
  - [ ] (Optional) Hỗ trợ bulk select + bulk revoke nếu backend bổ sung API.

- **Tích hợp Settings:**
  - [ ] Đọc `ENB_ONLY_ONE_SESSION` từ màn Settings và hiển thị notice phù hợp trên màn session.
  - [ ] Cập nhật tài liệu user-facing (help center) nếu cần khi bật tính năng "chỉ một session".

---

Tài liệu này tập trung vào luồng FE/UX. Mọi mở rộng API mới (bulk revoke, filter `userId`, device info) cần được thống nhất với team backend và được version hoá/ghi chú rõ ràng trong changelog để FE cập nhật kịp thời.


