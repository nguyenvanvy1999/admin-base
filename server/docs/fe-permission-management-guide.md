# Hướng dẫn FE triển khai tích hợp API Permissions

Tài liệu này mô tả chi tiết cách phía FE tương tác với API `admin/permissions` để lấy danh sách permissions phục vụ cho
việc quản lý roles. Permissions được sử dụng để gán vào roles, và mỗi role có thể có nhiều permissions. Tất cả response
đều được bọc trong cấu trúc `ResWrapper` (`{ data: ..., code: string, t: string }`), vì vậy FE cần truy cập payload
chính thông qua trường `data`.

## 1. Điều kiện tiên quyết

- **Base URL:** cùng origin với service `server`, các route nằm dưới `/api/admin/permissions`.
- **Xác thực:** gửi header `Authorization: Bearer <access_token>` lấy từ flow đăng nhập Admin. Token phải còn hạn.
- **Quyền (permission) ứng với hành động UI:**
    - `ROLE.VIEW`: bắt buộc để tải danh sách permissions.
- **Kiểu dữ liệu:**
    - Permissions được định nghĩa theo format `CATEGORY.ACTION` (ví dụ: `ROLE.VIEW`, `USER.UPDATE`, `SESSION.REVOKE`).
    - Mỗi permission có `id`, `title` (chính là format `CATEGORY.ACTION`), và `description` (optional).

## 2. Danh sách endpoint

| Hành động                | Method & Path                | Mô tả nhanh                                         |
|--------------------------|------------------------------|-----------------------------------------------------|
| Lấy danh sách permission | `GET /api/admin/permissions` | Lấy tất cả permissions hoặc filter theo role cụ thể |

Chi tiết endpoint được mô tả dưới đây.

### 2.1 GET `/api/admin/permissions`

- **Query params (tất cả optional):**
    - `roleId`: string - filter permission theo role cụ thể (lấy các permission mà role đó đang có).
- **Response `data`:**
  ```json
  [
    {
      "id": "perm_abc123",
      "title": "ROLE.VIEW",
      "description": "Can view roles"
    },
    {
      "id": "perm_def456",
      "title": "ROLE.UPDATE",
      "description": "Can create and update roles"
    },
    {
      "id": "perm_ghi789",
      "title": "USER.VIEW",
      "description": "Can view users"
    },
    {
      "id": "perm_jkl012",
      "title": "SESSION.VIEW_ALL",
      "description": "Can view all sessions"
    }
  ]
  ```
- **Lưu ý:**
    - Response là mảng trực tiếp, không có phân trang.
    - Nếu có `roleId` trong query, chỉ trả về các permission mà role đó đang sở hữu.
    - Permissions được sắp xếp theo `title` giảm dần (desc).
    - Trường `description` có thể là `null` nếu không có mô tả.

## 3. Use cases phổ biến

### 3.1 Hiển thị danh sách permissions trong form tạo/sửa role

Khi tạo hoặc chỉnh sửa role, FE cần hiển thị danh sách tất cả permissions để user chọn:

```typescript
// Load tất cả permissions
const { data: allPermissions } = await adminPermissionsService.list();

// Hiển thị dạng checkbox hoặc multi-select
// Khi edit role, pre-select các permission hiện có của role
```

### 3.2 Filter permissions theo role

Để xem một role cụ thể đang có những permissions nào:

```typescript
// Load permissions của role cụ thể
const { data: rolePermissions } = await adminPermissionsService.list({ 
  roleId: 'role_123' 
});
```

### 3.3 Nhóm permissions theo category

FE có thể nhóm permissions theo category để dễ quản lý:

```typescript
// Parse title để nhóm theo category
const grouped = permissions.reduce((acc, perm) => {
  const [category] = perm.title.split('.');
  if (!acc[category]) acc[category] = [];
  acc[category].push(perm);
  return acc;
}, {} as Record<string, Permission[]>);

// Kết quả:
// {
//   "ROLE": [perm1, perm2],
//   "USER": [perm3, perm4],
//   "SESSION": [perm5, perm6]
// }
```

## 4. Quy ước UI khuyến nghị

- **Hiển thị permissions trong form role:**
    - Sử dụng checkbox group hoặc multi-select component.
    - Có thể nhóm permissions theo category (ROLE, USER, SESSION, ...) để dễ tìm kiếm.
    - Hiển thị `title` (ví dụ: `ROLE.VIEW`) và `description` (nếu có) để user hiểu rõ quyền.
    - Khi edit role, pre-select các permission hiện có của role (so sánh `permissionIds` từ role với `id` của
      permissions).
- **Tìm kiếm và filter:**
    - Có thể thêm search box để filter permissions theo `title` hoặc `description`.
    - Có thể filter theo category (phần trước dấu chấm trong `title`).
- **Validation:**
    - Khi submit form role, đảm bảo gửi toàn bộ danh sách `permissionIds` đã chọn (không phải chỉ phần thay đổi).
    - Backend yêu cầu tối thiểu 1 permission khi tạo/sửa role.

## 5. Test nhanh bằng cURL (tham khảo)

```bash
# Lấy danh sách tất cả permissions
curl -X GET https://api.example.com/api/admin/permissions \
  -H "Authorization: Bearer <token>"

# Lấy permissions của role cụ thể
curl -X GET "https://api.example.com/api/admin/permissions?roleId=role_123" \
  -H "Authorization: Bearer <token>"
```

FE có thể dùng các request này để verify kết nối trước khi ghép UI.

## 6. Checklist triển khai FE

- [ ] Đồng bộ permission flow, ẩn nút nếu thiếu quyền (`ROLE.VIEW`).
- [ ] Xây dựng hook/service `useAdminPermissions` wrap endpoint trên, luôn đọc/ghi `data`.
- [ ] Xử lý loading state và error state khi fetch permissions.
- [ ] Implement UI component để hiển thị danh sách permissions (checkbox/multi-select).
- [ ] Nhóm permissions theo category để dễ quản lý (optional nhưng khuyến nghị).
- [ ] Pre-select permissions khi edit role (so sánh `permissionIds` từ role với `id` của permissions).
- [ ] Thêm search/filter cho permissions (optional).
- [ ] Viết unit test/mock API cho hook `useAdminPermissions`.

## 7. Ví dụ code TypeScript (tham khảo)

```typescript
// types/admin-permissions.ts
export interface AdminPermission {
  id: string;
  title: string;
  description: string | null;
}

// services/api/admin-permissions.service.ts
import { apiClient } from 'src/lib/api/client';

const ADMIN_PERMISSION_BASE_PATH = '/api/admin/permissions';

export const adminPermissionsService = {
  list(params?: { roleId?: string }): Promise<AdminPermission[]> {
    return apiClient.get<AdminPermission[]>(ADMIN_PERMISSION_BASE_PATH, { params });
  },
};

// hooks/api/useAdminPermissions.ts
import { useQuery } from '@tanstack/react-query';
import { adminPermissionsService } from 'src/services/api/admin-permissions.service';

export const useAdminPermissions = (params?: { roleId?: string }) => {
  return useQuery({
    queryKey: ['admin-permissions', params],
    queryFn: () => adminPermissionsService.list(params),
  });
};

// Component sử dụng
const PermissionSelector = ({ value, onChange, roleId }: Props) => {
  const { data: permissions = [], isLoading } = useAdminPermissions(roleId ? { roleId } : undefined);

  // Nhóm permissions theo category
  const grouped = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      const [category] = perm.title.split('.');
      if (!acc[category]) acc[category] = [];
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, AdminPermission[]>);
  }, [permissions]);

  if (isLoading) return <Spin />;

  return (
    <Checkbox.Group value={value} onChange={onChange}>
      {Object.entries(grouped).map(([category, perms]) => (
        <div key={category}>
          <h4>{category}</h4>
          {perms.map((perm) => (
            <Checkbox key={perm.id} value={perm.id}>
              {perm.title} {perm.description && `- ${perm.description}`}
            </Checkbox>
          ))}
        </div>
      ))}
    </Checkbox.Group>
  );
};
```

## 8. Lưu ý quan trọng

- **Permissions được seed từ backend:** Permissions được tạo tự động từ constant `PERMISSIONS` trong backend khi seed
  database. FE không thể tạo/sửa/xóa permissions trực tiếp qua API.
- **Permissions được gán vào roles:** Để gán permissions vào role, FE cần sử dụng API `/api/admin/roles` (POST) với
  `permissionIds` trong body. Xem thêm tài liệu `fe-role-management-guide.md`.
- **Format permission:** Mỗi permission có format `CATEGORY.ACTION` (ví dụ: `ROLE.VIEW`, `USER.UPDATE`). Category thường
  là module/feature, Action là hành động cụ thể.
- **Mối quan hệ với roles:** Một role có thể có nhiều permissions, và một permission có thể được gán cho nhiều roles (
  many-to-many).

## 9. Các permissions phổ biến trong hệ thống

Dưới đây là danh sách các permissions thường gặp (tham khảo, có thể thay đổi tùy theo backend):

- **ROLE:** `ROLE.VIEW`, `ROLE.UPDATE`, `ROLE.DELETE`
- **USER:** `USER.VIEW`, `USER.UPDATE`, `USER.RESET_MFA`
- **SESSION:** `SESSION.VIEW`, `SESSION.VIEW_ALL`, `SESSION.REVOKE`, `SESSION.REVOKE_ALL`
- **SETTING:** `SETTING.VIEW`, `SETTING.UPDATE`
- **I18N:** `I18N.VIEW`, `I18N.UPDATE`, `I18N.DELETE`
- **API_KEY:** `API_KEY.VIEW`, `API_KEY.VIEW_ALL`, `API_KEY.UPDATE`, `API_KEY.UPDATE_ALL`, `API_KEY.DELETE`,
  `API_KEY.DELETE_ALL`

Để biết danh sách đầy đủ, FE nên gọi API `/api/admin/permissions` để lấy danh sách permissions hiện có trong hệ thống.

