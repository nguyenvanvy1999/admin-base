## Hướng dẫn FE triển khai tính năng User–Role Expired

Tài liệu này mô tả:

- **Data model** cho tính năng hết hạn role theo user (`user-role expired`) dựa trên `schema.prisma`.
- **Cách đọc dữ liệu hết hạn role** từ các API **đã có**.
- **Định hướng API mở rộng** (đề xuất) để cập nhật hạn sử dụng role.
- **Hướng dẫn UI/UX chi tiết** cho các màn:
  - Danh sách User.
  - Danh sách Role.
  - Tạo User.
  - Sửa User.
  - Xem chi tiết User.

---

## 1. Mô hình dữ liệu liên quan (theo `schema.prisma`)

### 1.1 Bảng `role_players`

Trong `schema.prisma`:

- Bảng trung gian `RolePlayer` gán **Role** cho **User**:
  - `playerId`: id user.
  - `roleId`: id role.
  - `expiresAt: DateTime?`: thời điểm role hết hạn đối với user đó.

Quy ước logic:

- **`expiresAt = null`**:
  - Role **không tự hết hạn** (coi như luôn còn hạn cho tới khi bị gỡ đi).
- **`expiresAt > now()`**:
  - Role **đang còn hạn**, sẽ hết hạn trong tương lai.
- **`expiresAt <= now()`**:
  - Role **đã hết hạn** (backend sẽ **không tính** role này trong quá trình authorize).

Related code:

```20:25:server/src/prisma/schema.prisma
// Assigns roles to users
model RolePlayer {
  ...
  // Role expiration
  expiresAt DateTime? @map("expires_at")
  ...
}
```

Backend khi build context quyền cho user sẽ chỉ lấy các role:

- `expiresAt IS NULL` **hoặc**
- `expiresAt > now()`.

```110:116:server/src/service/auth/auth-util.service.ts
const rolePlayers = await this.deps.db.rolePlayer.findMany({
  where: {
    playerId: userId,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  },
  select: { roleId: true },
});
```

---

## 2. API hiện có hỗ trợ xem role còn hạn / hết hạn

### 2.1 Danh sách user – `GET /admin/users`

Tài liệu tổng quát xem trong `fe-user-management-guide.md`. Phần liên quan đến role:

- **Response `data.docs[].roles`**:
  - Mỗi phần tử là một object gồm:
    - `role.id`: id role.
    - `role.title`: tên role.
    - `expiresAt`: ngày hết hạn (ISO datetime) hoặc `null`.

Dto backend:

```28:36:server/src/modules/admin/dtos/user.dto.ts
const roleListDto = t.Array(
  t.Object({
    role: t.Object({
      title: t.String(),
      id: t.String(),
    }),
    expiresAt: t.Nullable(isoDateField),
  }),
);
```

Điều này áp dụng cho:

- **Danh sách user** (`AdminUserListResDto`).
- **Chi tiết user** (`AdminUserDetailResDto`).

#### Mapping trạng thái role theo user trên FE

Với từng phần tử `user.roles[i]`:

- **`expiresAt === null`**:
  - Trạng thái: **“Không hết hạn”**.
- **`expiresAt > now()`**:
  - Trạng thái: **“Còn hạn đến {ngày}”**.
- **`expiresAt <= now()`**:
  - Trạng thái: **“Đã hết hạn”**.

> Gợi ý: FE nên chuẩn hóa về type `Date` khi parse để dễ so sánh/mặc định timezone.

### 2.2 Danh sách role – `GET /api/admin/roles`

Tài liệu tổng quát xem trong `fe-role-management-guide.md`.

Trong response `data[]` của `GET /api/admin/roles`, backend đã bổ sung:

- Trường `players: { playerId: string; expiresAt: string | null }[]`.

```57:77:server/src/service/admin/role.service.ts
const roles = await this.deps.db.role.findMany({
  where,
  select: {
    id: true,
    title: true,
    description: true,
    protected: true,
    enabled: true,
    permissions: { select: { permissionId: true } },
    players: { select: { playerId: true, expiresAt: true } },
  },
});

return roles.map((role) => ({
  ...role,
  permissionIds: role.permissions.map((p) => p.permissionId),
  players: role.players.map((p) => ({
    playerId: p.playerId,
    expiresAt: p.expiresAt?.toString() ?? null,
  })),
}));
```

Dto trả về:

```12:25:server/src/modules/admin/dtos/role.dto.ts
export const PaginateRoleResDto = t.Array(
  t.Intersect([
    t.Omit(UpsertRoleDto, ['enabled', 'playerIds']),
    t.Object({
      id: t.String(),
      permissionIds: t.Array(t.String()),
      protected: t.Boolean(),
      players: t.Array(
        t.Object({
          playerId: t.String(),
          expiresAt: t.Nullable(t.String()),
        }),
      ),
    }),
  ]),
);
```

#### Mapping trạng thái user theo role trên FE

Với từng phần tử `role.players[i]`:

- **`expiresAt === null`**:
  - Trạng thái: **“User giữ role vĩnh viễn”**.
- **`expiresAt > now()`**:
  - Trạng thái: **“User đang còn role, sẽ hết hạn vào {ngày}”**.
- **`expiresAt <= now()`**:
  - Trạng thái: **“User đã hết hạn role này”**.

---

## 3. Định nghĩa API đề xuất để chỉnh sửa hạn role (để FE chuẩn bị)

Hiện tại các DTO `AdminUserCreateDto`, `AdminUserUpdateDto`, `UpsertRoleDto` **chưa hỗ trợ** cập nhật `expiresAt` cho từng cặp `user–role`. Để FE triển khai màn chỉnh sửa/thiết lập hạn role một cách đầy đủ, đề xuất:

> **Lưu ý:** Phần này là **đề xuất mở rộng**, cần backend implement thêm. FE có thể chuẩn bị UI/flow sẵn, nhưng chỉ nên bật tính năng khi backend xác nhận đã hỗ trợ.

### 3.1 API 1 – Cập nhật danh sách role + hạn theo từng user

- **Endpoint đề xuất:** `PATCH /admin/users/:id/roles`
- **Permission:** `USER.UPDATE`.
- **Body (đề xuất):**

```json
{
  "roles": [
    {
      "roleId": "role_admin",
      "expiresAt": null
    },
    {
      "roleId": "role_support",
      "expiresAt": "2025-12-31T23:59:59.000Z"
    }
  ],
  "reason": "Điều chỉnh role cho kỳ chiến dịch cuối năm"
}
```

- **Quy ước xử lý backend (đề xuất):**
  - Xoá toàn bộ `RolePlayer` hiện tại của user.
  - Tạo lại `RolePlayer` dựa theo danh sách `roles` gửi lên.
  - `expiresAt: null` → không hết hạn.
  - `expiresAt` là ISO string.
- **Response `data` (đề xuất):**

```json
{
  "userId": "usr_123",
  "auditLogId": "log_abc"
}
```

### 3.2 API 2 – Mở rộng `UpsertRoleDto` để nhận hạn theo từng user (tuỳ chọn)

Hiện `UpsertRoleDto` chỉ có:

- `playerIds: string[]` (danh sách id user).

Đề xuất mở rộng:

- **Body mới (gợi ý):**

```json
{
  "id": "role_123",
  "title": "VIP Trader",
  "description": "Quyền giao dịch nâng cao",
  "enabled": true,
  "permissionIds": ["PERM_TRADE_ADVANCED"],
  "players": [
    {
      "playerId": "user_001",
      "expiresAt": null
    },
    {
      "playerId": "user_002",
      "expiresAt": "2025-12-31T23:59:59.000Z"
    }
  ]
}
```

- Ưu điểm:
  - Cho phép chỉnh hạn role trực tiếp từ màn Role detail.
- Nhược điểm:
  - Phức tạp hơn cho BE & FE (so với việc chỉnh từ phía user).

> Tùy theo quyết định của team backend, FE nên implement **một trong hai hướng** (ưu tiên API 1 cho UX tốt hơn ở màn User).

---

## 4. Hướng dẫn UI/UX – Danh sách User

### 4.1 Mục tiêu UX

- Admin nhìn nhanh:
  - User đang có những role nào?
  - Mỗi role:
    - Còn hạn đến khi nào?
    - Đã hết hạn hay chưa?
- Có thể filter / tìm user theo role, đồng thời **phân biệt role còn hạn vs hết hạn**.

### 4.2 Đề xuất layout bảng danh sách User

- **Cột mới/điều chỉnh:**
  - `Roles & Expiry`:
    - Mỗi role hiển thị dạng **badge/chip**:
      - **Label:** `role.title`.
      - **Sub-label nhỏ:** trạng thái:
        - “Không hết hạn”.
        - “Còn hạn đến dd/MM/yyyy”.
        - “Đã hết hạn dd/MM/yyyy”.
      - **Màu sắc (gợi ý):**
        - Còn hạn: badge màu xanh (success).
        - Đã hết hạn: badge viền xám/đỏ nhạt, text gạch ngang.
        - Sắp hết hạn (< 7 ngày): badge màu cam/cảnh báo.
    - Tooltip khi hover:
      - `Role: {title}`.
      - `Trạng thái: {Còn hạn/Đã hết hạn/Không hết hạn}`.
      - `Ngày hết hạn: {ISO -> local time}` (nếu có).

- **Filter gợi ý:**
  - Dropdown/multi-select `Role` (giống hiện tại).
  - Optional: toggle filter:
    - "Chỉ hiển thị user có **ít nhất 1 role hết hạn**".
    - "Chỉ hiển thị user có **ít nhất 1 role sắp hết hạn** (< X ngày)".
  - Lưu ý: hiện API chưa hỗ trợ filter theo trạng thái hết hạn role → ban đầu FE có thể filter client-side (từ dữ liệu `roles`).

### 4.3 Hành vi khi click

- Click vào **badge role** trong bảng:
  - Mở **drawer/side panel** “Chi tiết role cho user này”:
    - Thông tin:
      - Tên role, mô tả role.
      - Ngày cấp role, ngày hết hạn.
      - Trạng thái (còn hạn/hết hạn/sắp hết hạn).
    - Nút (sau khi backend hỗ trợ):
      - Sửa ngày hết hạn.
      - Gỡ role khỏi user.

---

## 5. Hướng dẫn UI/UX – Danh sách Role

### 5.1 Mục tiêu UX

- Từ màn Role, admin biết:
  - Mỗi role đang có bao nhiêu user:
    - Đang **còn hạn**.
    - Đã **hết hạn role**.

### 5.2 Layout bảng Role

- **Cột mới gợi ý:**
  - `Users (Active / Expired)`:
    - Hiển thị dạng: `5 / 2`:
      - `5`: số user có `expiresAt === null` hoặc `> now()`.
      - `2`: số user có `expiresAt <= now()`.
    - Tooltip:
      - “5 user đang còn role này, 2 user role đã hết hạn”.

### 5.3 Drawer danh sách user theo role

- Khi click vào cột `Users (Active / Expired)`:
  - Mở drawer hiển thị:
    - Bảng con:
      - `User`: email / tên hiển thị.
      - `Trạng thái role`:
        - Còn hạn / Hết hạn.
      - `Ngày hết hạn`.
      - (Tuỳ chọn) nút "Xem chi tiết user" → điều hướng sang trang User detail.

---

## 6. Hướng dẫn UI/UX – Create / Edit / View User

### 6.1 Khu vực quản lý Role trong form User

Áp dụng cho 3 màn:

- Tạo user (Create).
- Sửa user (Edit).
- Xem chi tiết user (View).

#### 6.1.1 Layout khuyến nghị

- Tab hoặc section riêng: **“Quyền & Role”**.
- Bên trong:
  - **Danh sách role được gán cho user**:
    - Dạng list hoặc tag list:
      - Mỗi dòng:
        - `Role name`.
        - Badge trạng thái: Còn hạn / Đã hết hạn / Không hết hạn.
        - Field ngày hết hạn:
          - `DateTimePicker` hoặc `DatePicker` + `TimePicker`.
          - Placeholder: “Không hết hạn” (khi `null`).
    - Nút “+ Thêm role”:
      - Mở modal chọn role (multi-select).
      - Sau khi chọn thêm role mới:
        - Default `expiresAt = null`.
        - Admin có thể chỉnh ngày hết hạn ngay tại list.

#### 6.1.2 Hành vi Create User (dựa trên API hiện tại)

- **Hiện tại (API đang có):**
  - `POST /admin/users` nhận:
    - `roleIds?: string[]`.
  - **Chưa nhận** thông tin `expiresAt`.
- **Đề xuất triển khai trước mắt:**
  - Khi tạo user:
    - Cho phép chọn danh sách role (`roleIds`).
    - Chỉ gửi `roleIds` lên API (không gửi `expiresAt`).
    - Phần UI “Ngày hết hạn” có thể:
      - Ẩn toàn bộ field expiry ở màn Create, hoặc
      - Hiển thị read-only note: “Thiết lập ngày hết hạn role sẽ được hỗ trợ trong bản cập nhật tiếp theo”.

#### 6.1.3 Hành vi Edit User (sau khi API 1 được backend hỗ trợ)

- Khi mở màn Edit User:
  - Gọi `GET /admin/users/:id`:
    - Đọc `roles[].role.id`, `roles[].role.title`, `roles[].expiresAt`.
  - Bind vào UI:
    - Mỗi role: hiển thị status + date picker như phần 6.1.1.

- Khi user bấm **Lưu**:
  - **Luồng đề xuất:**
    1. Gửi `PATCH /admin/users/:id` cho các trường chung (status, name, lockout, ...), như tài liệu hiện tại.
    2. Nếu có thay đổi role hoặc ngày hết hạn:
       - Gửi thêm `PATCH /admin/users/:id/roles` (API 1 ở mục 3.1) với payload:

```json
{
  "roles": [
    {
      "roleId": "role_admin",
      "expiresAt": null
    },
    {
      "roleId": "role_support",
      "expiresAt": "2025-12-31T23:59:59.000Z"
    }
  ],
  "reason": "Điều chỉnh hạn role sau kỳ đánh giá"
}
```

- **Validation phía FE:**
  - Không cho chọn ngày hết hạn **trước thời điểm hiện tại**:
    - Nếu user cố chọn, hiển thị lỗi: “Ngày hết hạn phải lớn hơn thời điểm hiện tại”.
  - Cho phép clear field để đưa về `null` (Không hết hạn).
  - Nếu role đang ở trạng thái “Đã hết hạn” và admin set ngày mới > now:
    - Trạng thái sẽ chuyển sang “Còn hạn từ bây giờ đến {ngày mới}”.

#### 6.1.4 Màn View User (read-only)

- Trong tab “Quyền & Role”:
  - Mỗi role hiển thị:
    - Tên role.
    - Badge trạng thái.
    - Text ngày hết hạn (hoặc “Không hết hạn”).
  - Không hiển thị input chỉnh sửa.

---

## 7. Quy ước UI/UX tổng quát cho trạng thái Role Expired

- **Màu & trạng thái gợi ý:**
  - **Còn hạn**:
    - Màu xanh (success).
    - Text: “Còn hạn” hoặc “Còn hạn đến dd/MM/yyyy”.
  - **Sắp hết hạn** (ví dụ: `expiresAt` trong vòng 7 ngày tới):
    - Màu cam (warning).
    - Text: “Sắp hết hạn dd/MM/yyyy”.
  - **Đã hết hạn**:
    - Màu xám hoặc đỏ nhạt.
    - Text: “Đã hết hạn dd/MM/yyyy”.
    - Có thể dùng gạch ngang tên role để nhấn mạnh.
  - **Không hết hạn**:
    - Màu trung tính (blue/gray).
    - Text: “Không hết hạn”.

- **Tooltip & chi tiết:**
  - Tooltip luôn hiển thị 3 dòng chuẩn:
    - `Role: {role.title}`.
    - `Trạng thái: {Còn hạn / Sắp hết hạn / Đã hết hạn / Không hết hạn}`.
    - `Ngày hết hạn: {formatted}` hoặc “Không hết hạn”.

- **Khả năng truy vết (audit):**
  - Khi có API cập nhật hạn role:
    - Bắt buộc field `reason` (tối thiểu 1 ký tự).
    - FE hiển thị modal confirm trước khi:
      - Rút ngắn hạn role.
      - Set role hết hạn ngay lập tức (đặt `expiresAt = now` hoặc xoá role).

---

## 8. Checklist triển khai FE

- **Backlog ngắn hạn (dùng API hiện có):**
  - [ ] Cập nhật **User List**:
    - [ ] Hiển thị cột `Roles & Expiry` với badge trạng thái dựa trên `roles[].expiresAt`.
  - [ ] Cập nhật **User Detail (View)**:
    - [ ] Tab “Quyền & Role” hiển thị đầy đủ role + trạng thái + ngày hết hạn.
  - [ ] Cập nhật **Role List**:
    - [ ] Dùng `players[].expiresAt` để tính `Active / Expired` user cho từng role (client-side).

- **Backlog trung hạn (sau khi backend mở rộng API):**
  - [ ] Thống nhất với backend về API cập nhật hạn role (ưu tiên `PATCH /admin/users/:id/roles`).
  - [ ] Bật UI chỉnh sửa ngày hết hạn role trong:
    - [ ] Màn Edit User.
    - [ ] (Tuỳ chọn) Màn Edit Role.
  - [ ] Bổ sung validation + confirm modal cho các hành động:
    - [ ] Rút ngắn hạn role.
    - [ ] Đặt role hết hạn ngay lập tức.
  - [ ] Bổ sung test unit/e2e cho flow:
    - [ ] User có role hết hạn không còn quyền trên hệ thống.
    - [ ] User sau khi gia hạn role được cấp lại quyền.

---

**Ghi chú:**  
Tài liệu này tập trung vào luồng FE. Các chi tiết implement backend (DTO mới, migration nếu cần) nên được thỏa thuận và versioning rõ ràng để tránh breaking change khi release.


