# Hướng dẫn FE triển khai trang quản lý Role (CRUD)

Tài liệu này mô tả chi tiết cách phía FE tương tác với các API `admin/roles` đã có sẵn để xây dựng trang quản trị role
với các thao tác cơ bản: xem danh sách, tạo mới, cập nhật và xóa. Tất cả response đều được bọc trong cấu trúc
`ResWrapper` (`{ data: ..., code: string, t: string }`), vì vậy FE cần truy cập payload chính thông qua trường `data`.

## 1. Điều kiện tiên quyết

- **Base URL:** cùng origin với service `server`, các route nằm dưới `/api/admin/roles`.
- **Xác thực:** gửi header `Authorization: Bearer <access_token>` lấy từ flow đăng nhập Admin. Token phải còn hạn.
- **Quyền (permission) ứng với hành động UI:**
    - `ROLE.VIEW`: bắt buộc để tải danh sách role.
    - `ROLE.UPDATE`: bắt buộc cho create/update role.
    - `ROLE.DELETE`: bắt buộc cho thao tác xóa role (cần kết hợp với `ROLE.UPDATE`).
- **Kiểu dữ liệu chung:**
    - `permissionIds`: danh sách id permission, backend coi đây là danh sách đầy đủ nên FE phải gửi toàn bộ permission
      hiện có mỗi lần update.
    - `playerIds`: danh sách id user được gán role, backend coi đây là danh sách đầy đủ nên FE phải gửi toàn bộ user
      hiện có mỗi lần update.
    - `enabled`: boolean, mặc định `true`, dùng để bật/tắt role.

## 2. Danh sách endpoint

| Hành động          | Method & Path               | Mô tả nhanh                                                               |
|--------------------|-----------------------------|---------------------------------------------------------------------------|
| Lấy danh sách role | `GET /api/admin/roles`      | Hỗ trợ filter theo userId                                                 |
| Tạo/Cập nhật role  | `POST /api/admin/roles`     | Nhận payload `UpsertRoleDto`, nếu có `id` thì update, không có thì create |
| Xóa role           | `POST /api/admin/roles/del` | Xóa một hoặc nhiều role (không được xóa nếu còn user đang sử dụng)        |

Chi tiết từng endpoint được mô tả dưới đây.

### 2.1 GET `/api/admin/roles`

- **Query params (tất cả optional):**
    - `userId`: string - filter role theo user cụ thể (lấy các role mà user đó đang có).
- **Response `data`:**
  ```json
  [
    {
      "id": "role_123",
      "title": "Administrator",
      "description": "Full access to all features",
      "permissionIds": ["PERM_001", "PERM_002", "PERM_003"],
      "playerIds": ["user_001", "user_002"]
    },
    {
      "id": "role_456",
      "title": "Editor",
      "description": "Can edit content",
      "permissionIds": ["PERM_001", "PERM_002"],
      "playerIds": ["user_003"]
    }
  ]
  ```
- **Lưu ý:**
    - Response là mảng trực tiếp, không có phân trang.
    - Nếu có `userId` trong query, chỉ trả về các role mà user đó đang sở hữu.
    - Trường `enabled` không được trả về trong response (chỉ dùng khi upsert).

### 2.2 POST `/api/admin/roles`

- **Body:**
  ```json
  {
    "id": "role_123",
    "title": "Administrator",
    "description": "Full access to all features",
    "enabled": true,
    "permissionIds": ["PERM_001", "PERM_002", "PERM_003"],
    "playerIds": ["user_001", "user_002"]
  }
  ```
- **Validation:**
    - `id`: optional string - nếu có thì update role hiện có, không có thì tạo mới.
    - `title`: string, bắt buộc, tối thiểu 3 ký tự.
    - `description`: string hoặc null, optional.
    - `enabled`: boolean, mặc định `true`.
    - `permissionIds`: array string, bắt buộc, tối thiểu 1 phần tử.
    - `playerIds`: array string, bắt buộc, tối thiểu 0 phần tử (có thể là mảng rỗng).
- **Response `data`:** `null` (thành công).
- **Logic backend:**
    - Nếu có `id`: update role hiện có, đồng bộ `permissionIds` và `playerIds` (xóa những cái không có trong danh sách
      mới, thêm những cái mới).
    - Nếu không có `id`: tạo role mới với UUID tự động.
- **Gợi ý UI:**
    - Form tạo mới: không gửi trường `id`.
    - Form chỉnh sửa: populate đầy đủ thông tin bao gồm `id`, `title`, `description`, `enabled`, `permissionIds`,
      `playerIds`.
    - Khi cập nhật permission hoặc player, FE phải gửi toàn bộ danh sách mới (không phải chỉ gửi phần thay đổi).

### 2.3 POST `/api/admin/roles/del`

- **Body:**
  ```json
  {
    "ids": ["role_123", "role_456"]
  }
  ```
- **Validation:**
    - `ids`: array string, bắt buộc, tối thiểu 1 phần tử.
- **Response `data`:** `null` (thành công).
- **Lưu ý:**
    - Backend sẽ kiểm tra xem có user nào đang sử dụng role này không.
    - Nếu có user đang sử dụng, sẽ trả về lỗi `PermissionDenied` và không xóa.
    - Chỉ xóa được role khi không còn user nào đang sử dụng.
- **Gợi ý UI:**
    - Hiển thị modal xác nhận trước khi xóa.
    - Nếu xóa thất bại do còn user đang sử dụng, hiển thị thông báo rõ ràng và gợi ý gỡ role khỏi user trước.

## 3. API liên quan: Lấy danh sách Permission

Để hiển thị danh sách permission cho form tạo/sửa role, FE cần gọi endpoint:

### GET `/api/admin/permissions`

- **Query params (optional):**
    - `roleId`: string - filter permission theo role cụ thể (lấy các permission mà role đó đang có).
- **Response `data`:**
  ```json
  [
    {
      "id": "PERM_001",
      "title": "User Management",
      "description": "Can manage users"
    },
    {
      "id": "PERM_002",
      "title": "Role Management",
      "description": "Can manage roles"
    }
  ]
  ```
- **Permission cần thiết:** `ROLE.VIEW` (cùng với endpoint list role).

## 4. Quy ước UI khuyến nghị

- **Danh sách role:**
    - Hiển thị cột: `title`, `description`, số lượng `permissionIds`, số lượng `playerIds`.
    - Có thể thêm filter theo user (dropdown chọn user, gọi API với `userId`).
    - Mỗi row có action: Edit, Delete (ẩn nếu thiếu permission).
- **Form tạo/sửa role:**
    - **Tab/Form chính:**
        - Input `title` (required, min 3 ký tự).
        - Textarea `description` (optional).
        - Toggle `enabled` (mặc định bật).
    - **Tab Permissions:**
        - Hiển thị danh sách permission dạng checkbox hoặc multi-select.
        - Load danh sách từ `/api/admin/permissions`.
        - Khi edit, pre-select các permission hiện có của role.
        - Lưu ý: khi submit phải gửi toàn bộ danh sách permission đã chọn.
    - **Tab Users:**
        - Hiển thị danh sách user dạng multi-select hoặc tag input.
        - Load danh sách user từ `/api/admin/users` (nếu có).
        - Khi edit, pre-select các user hiện có của role.
        - Lưu ý: khi submit phải gửi toàn bộ danh sách user đã chọn.
- **Xóa role:**
    - Hiển thị modal xác nhận với thông tin role sẽ bị xóa.
    - Nếu xóa thất bại do còn user đang sử dụng, hiển thị thông báo: "Không thể xóa role này vì vẫn còn user đang sử
      dụng. Vui lòng gỡ role khỏi user trước."
- **Thông báo lỗi:** backend trả `ErrorResDto` với `code` cụ thể (ví dụ `ERR_PERMISSION_DENIED`, `ERR_VALIDATION`). FE
  nên map sang copy tiếng Việt thân thiện.

## 5. Test nhanh bằng cURL (tham khảo)

```bash
# Lấy danh sách role
curl -X GET https://api.example.com/api/admin/roles \
  -H "Authorization: Bearer <token>"

# Lấy role của user cụ thể
curl -X GET "https://api.example.com/api/admin/roles?userId=user_001" \
  -H "Authorization: Bearer <token>"

# Tạo role mới
curl -X POST https://api.example.com/api/admin/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Editor",
    "description": "Can edit content",
    "enabled": true,
    "permissionIds": ["PERM_001", "PERM_002"],
    "playerIds": []
  }'

# Cập nhật role
curl -X POST https://api.example.com/api/admin/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "role_123",
    "title": "Administrator Updated",
    "description": "Updated description",
    "enabled": true,
    "permissionIds": ["PERM_001", "PERM_002", "PERM_003"],
    "playerIds": ["user_001"]
  }'

# Xóa role
curl -X POST https://api.example.com/api/admin/roles/del \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["role_123"]
  }'

# Lấy danh sách permission
curl -X GET https://api.example.com/api/admin/permissions \
  -H "Authorization: Bearer <token>"
```

FE có thể dùng các request này để verify kết nối trước khi ghép UI.

## 6. Checklist triển khai FE

- [ ] Đồng bộ permission flow, ẩn nút nếu thiếu quyền (`ROLE.VIEW`, `ROLE.UPDATE`, `ROLE.DELETE`).
- [ ] Xây dựng hook/service `useAdminRoles` wrap toàn bộ endpoint trên, luôn đọc/ghi `data`.
- [ ] Xây dựng hook/service `useAdminPermissions` để lấy danh sách permission cho form.
- [ ] Chuẩn hóa error handler và toast theo `code`.
- [ ] Xử lý logic upsert: phân biệt create (không có `id`) và update (có `id`).
- [ ] Xử lý đồng bộ permission và player: luôn gửi toàn bộ danh sách mới khi update.
- [ ] Xử lý lỗi xóa role khi còn user đang sử dụng, hiển thị thông báo rõ ràng.
- [ ] Viết unit test/mock API cho các hook chính (list, upsert, delete).

## 7. Ví dụ code TypeScript (tham khảo)

```typescript
// types/admin-roles.ts
export interface AdminRole {
  id: string;
  title: string;
  description?: string | null;
  permissionIds: string[];
  playerIds: string[];
}

export interface UpsertRoleDto {
  id?: string;
  title: string;
  description?: string | null;
  enabled: boolean;
  permissionIds: string[];
  playerIds: string[];
}

// services/api/admin-roles.service.ts
import { apiClient } from 'src/lib/api/client';

const ADMIN_ROLE_BASE_PATH = '/api/admin/roles';

export const adminRolesService = {
  list(params?: { userId?: string }): Promise<AdminRole[]> {
    return apiClient.get<AdminRole[]>(ADMIN_ROLE_BASE_PATH, { params });
  },

  upsert(data: UpsertRoleDto): Promise<void> {
    return apiClient.post<void>(ADMIN_ROLE_BASE_PATH, data);
  },

  delete(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${ADMIN_ROLE_BASE_PATH}/del`, { ids });
  },
};
```

