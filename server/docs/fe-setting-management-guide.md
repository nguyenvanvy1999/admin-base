# Hướng dẫn FE triển khai trang quản lý Settings (CRUD)

Tài liệu này mô tả chi tiết cách phía FE tương tác với các API `admin/settings` đã có sẵn để xây dựng trang quản trị settings với các thao tác cơ bản: xem danh sách và cập nhật. Tất cả response đều được bọc trong cấu trúc `ResWrapper` (`{ data: ..., code: string, t: string }`), vì vậy FE cần truy cập payload chính thông qua trường `data`.

## 1. Điều kiện tiên quyết

- **Base URL:** cùng origin với service `server`, các route nằm dưới `/admin/settings`.
- **Xác thực:** gửi header `Authorization: Bearer <access_token>` lấy từ flow đăng nhập Admin. Token phải còn hạn.
- **Quyền (permission) ứng với hành động UI:**
    - `SETTING.VIEW`: bắt buộc để tải danh sách settings.
    - `SETTING.UPDATE`: bắt buộc cho thao tác cập nhật setting.
- **Kiểu dữ liệu chung:**
    - `SettingDataType`: enum backend định nghĩa với các giá trị: `string`, `number`, `boolean`, `date`, `json`.
    - `value`: luôn là string trong request/response, nhưng được parse theo `type` khi backend xử lý.
    - `isSecret`: boolean, nếu `true` thì value sẽ bị mask thành `"************"` khi list (bảo mật thông tin nhạy cảm).
    - `key`: string unique, định danh setting (ví dụ: `ENB_MFA_REQUIRED`, `LOGIN_RATE_LIMIT_MAX`).

## 2. Danh sách endpoint

| Hành động              | Method & Path                    | Mô tả nhanh                                                      |
|------------------------|-----------------------------------|------------------------------------------------------------------|
| Lấy danh sách settings | `GET /admin/settings`             | Trả về tất cả settings trong hệ thống                           |
| Cập nhật setting       | `POST /admin/settings/:id`         | Cập nhật value và isSecret của một setting cụ thể               |

Chi tiết từng endpoint được mô tả dưới đây.

### 2.1 GET `/admin/settings`

- **Query params:** không có.
- **Response `data`:**
  ```json
  [
    {
      "id": "setting_abc123",
      "key": "ENB_MFA_REQUIRED",
      "description": "Enable MFA requirement for all users",
      "type": "boolean",
      "value": "false"
    },
    {
      "id": "setting_def456",
      "key": "LOGIN_RATE_LIMIT_MAX",
      "description": "Maximum login attempts per time window",
      "type": "number",
      "value": "10"
    },
    {
      "id": "setting_ghi789",
      "key": "API_SECRET_KEY",
      "description": "Secret API key for external services",
      "type": "string",
      "isSecret": true,
      "value": "************"
    },
    {
      "id": "setting_jkl012",
      "key": "MAINTENANCE_END_DATE",
      "description": "Scheduled maintenance end date",
      "type": "date",
      "value": "2025-12-31T23:59:59.000Z"
    },
    {
      "id": "setting_mno345",
      "key": "CUSTOM_CONFIG",
      "description": "Custom JSON configuration",
      "type": "json",
      "value": "{\"featureA\": true, \"featureB\": false}"
    }
  ]
  ```
- **Lưu ý:**
    - Response là mảng trực tiếp, không có phân trang.
    - Nếu setting có `isSecret: true`, giá trị `value` sẽ được mask thành `"************"` để bảo mật.
    - Trường `isSecret` chỉ xuất hiện trong response nếu giá trị là `true` (có thể không có trong response nếu `false`).
    - Các giá trị `value` luôn là string, nhưng cần được parse theo `type` khi hiển thị trên UI.

### 2.2 POST `/admin/settings/:id`

- **Path params:**
    - `id`: string - ID của setting cần cập nhật.
- **Body:**
  ```json
  {
    "value": "true",
    "isSecret": false
  }
  ```
- **Validation:**
    - `value`: string, bắt buộc, phải phù hợp với `type` của setting:
        - `boolean`: chỉ nhận `"true"` hoặc `"false"`.
        - `number`: chuỗi số hợp lệ (ví dụ: `"10"`, `"3.14"`, `"-5"`).
        - `string`: bất kỳ chuỗi nào.
        - `date`: ISO 8601 date-time string (ví dụ: `"2025-12-31T23:59:59.000Z"`).
        - `json`: chuỗi JSON hợp lệ (ví dụ: `"{\"key\": \"value\"}"`).
    - `isSecret`: boolean, bắt buộc, xác định setting có phải là secret hay không.
- **Response `data`:** `null` (thành công).
- **Logic backend:**
    - Backend sẽ validate `value` theo `type` của setting.
    - Nếu `isSecret: true`, value sẽ được mã hóa bằng AES-256 trước khi lưu vào database.
    - Sau khi cập nhật, cache của setting sẽ được làm mới tự động.
    - Nếu setting không tồn tại, trả về lỗi `NotFoundErr`.
    - Nếu `value` không phù hợp với `type`, trả về lỗi `BadRequest`.
- **Gợi ý UI:**
    - Form cập nhật nên hiển thị `key`, `description`, `type` để user biết đang chỉnh sửa setting nào.
    - Render input phù hợp theo `type`:
        - `boolean`: toggle switch hoặc radio button.
        - `number`: number input với validation.
        - `string`: text input (nếu `isSecret: true` thì dùng password input).
        - `date`: date-time picker.
        - `json`: textarea với JSON validation (có thể highlight syntax).
    - Nếu setting hiện tại có `isSecret: true` và value bị mask, khi edit nên hiển thị placeholder hoặc yêu cầu nhập lại giá trị mới (không hiển thị giá trị cũ).
    - Hiển thị toggle `isSecret` để user có thể đánh dấu setting là secret hoặc không.

## 3. Danh sách Settings có sẵn trong hệ thống

Dưới đây là danh sách các setting keys được định nghĩa sẵn trong hệ thống (enum `SETTING`):

### 3.1 Bảo mật và Xác thực

| Key                                  | Type    | Mô tả                                                      | Default Value |
|--------------------------------------|---------|------------------------------------------------------------|---------------|
| `ENB_MFA_REQUIRED`                   | boolean | Bắt buộc MFA cho tất cả user                               | `false`       |
| `ENB_ONLY_ONE_SESSION`               | boolean | Chỉ cho phép một session đăng nhập tại một thời điểm      | `false`       |
| `ENB_PASSWORD_ATTEMPT`               | boolean | Bật tính năng theo dõi số lần thử mật khẩu                | `false`       |
| `ENB_PASSWORD_EXPIRED`               | boolean | Bật tính năng hết hạn mật khẩu                             | `false`       |
| `ENB_IP_WHITELIST`                   | boolean | Bật tính năng IP whitelist                                 | `true`        |
| `ENB_SECURITY_DEVICE_RECOGNITION`    | boolean | Bật nhận diện thiết bị                                      | `false`       |
| `ENB_SECURITY_BLOCK_UNKNOWN_DEVICE`  | boolean | Chặn thiết bị không nhận diện được                         | `false`       |
| `ENB_SECURITY_AUDIT_WARNING`        | boolean | Cảnh báo audit khi có thiết bị mới                         | `true`        |

### 3.2 Rate Limiting

| Key                                      | Type   | Mô tả                                          | Default Value |
|------------------------------------------|--------|------------------------------------------------|---------------|
| `LOGIN_RATE_LIMIT_MAX`                   | number | Số lần đăng nhập tối đa trong một cửa sổ thời gian | `10`          |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS`        | number | Thời gian cửa sổ rate limit đăng nhập (giây)   | `900` (15 phút)|
| `REGISTER_OTP_LIMIT`                     | number | Số lần gửi OTP đăng ký tối đa                  | `5`           |
| `REGISTER_RATE_LIMIT_MAX`                | number | Số lần đăng ký tối đa trong một cửa sổ thời gian| `5`           |
| `REGISTER_RATE_LIMIT_WINDOW_SECONDS`     | number | Thời gian cửa sổ rate limit đăng ký (giây)      | `900` (15 phút)|

### 3.3 Hệ thống

| Key                      | Type   | Mô tả                                    | Default Value           |
|--------------------------|--------|------------------------------------------|-------------------------|
| `MAINTENANCE_END_DATE`    | date   | Ngày kết thúc bảo trì hệ thống           | `1970-01-01T00:00:00Z`  |

**Lưu ý:** Danh sách này có thể mở rộng trong tương lai. FE nên động lấy danh sách từ API thay vì hardcode.

## 4. Quy ước UI khuyến nghị

### 4.1 Danh sách Settings

- **Hiển thị dạng bảng hoặc card:**
    - Cột/card: `key`, `description`, `type`, `value` (hiển thị đã parse), `isSecret` (badge).
    - Sắp xếp theo nhóm logic (Bảo mật, Rate Limiting, Hệ thống) hoặc theo `key` alphabetically.
    - Mỗi row/card có action: Edit (ẩn nếu thiếu permission `SETTING.UPDATE`).
    - Nếu `isSecret: true`, hiển thị badge "Secret" và value bị mask.
    - Hiển thị giá trị đã parse theo type:
        - `boolean`: hiển thị "Bật" / "Tắt" hoặc icon check/x.
        - `number`: hiển thị số với format phù hợp.
        - `date`: hiển thị theo timezone người dùng, format dễ đọc.
        - `json`: hiển thị dạng formatted JSON (có thể collapse/expand).

### 4.2 Form cập nhật Setting

- **Modal hoặc Drawer:**
    - Header: hiển thị `key` và `description` của setting.
    - Form fields:
        - **Value input:** render theo `type`:
            - `boolean`: Toggle switch với label "Bật" / "Tắt".
            - `number`: Number input với min/max validation nếu cần.
            - `string`: Text input (nếu `isSecret: true` thì dùng Password input).
            - `date`: Date-time picker với timezone support.
            - `json`: Textarea với:
                - JSON syntax highlighting (nếu có thư viện).
                - Validation real-time (highlight lỗi nếu JSON không hợp lệ).
                - Format button (format JSON tự động).
        - **Is Secret toggle:** checkbox hoặc switch với label "Đánh dấu là Secret".
    - Footer: nút "Hủy" và "Lưu" (disabled nếu form invalid).
- **Validation:**
    - Validate `value` theo `type` trước khi submit:
        - `boolean`: chỉ nhận `"true"` hoặc `"false"`.
        - `number`: kiểm tra chuỗi số hợp lệ.
        - `date`: kiểm tra ISO 8601 format.
        - `json`: parse JSON và kiểm tra lỗi syntax.
    - Hiển thị error message rõ ràng nếu validation fail.
- **UX tốt:**
    - Nếu setting có `isSecret: true` và value bị mask, khi mở form edit:
        - Hiển thị placeholder: "Nhập giá trị mới (giá trị cũ đã được ẩn vì lý do bảo mật)".
        - Hoặc có nút "Giữ nguyên giá trị hiện tại" nếu không muốn thay đổi.
    - Sau khi cập nhật thành công:
        - Đóng modal/drawer.
        - Refresh danh sách settings.
        - Hiển thị toast success.
        - Nếu setting quan trọng (ví dụ: `ENB_MFA_REQUIRED`), có thể hiển thị cảnh báo về tác động.

### 4.3 Nhóm Settings theo Category

- **Gợi ý tổ chức UI:**
    - Tab hoặc Accordion theo category:
        - **Bảo mật:** MFA, Password, Session, Device Recognition.
        - **Rate Limiting:** Login, Register.
        - **Hệ thống:** Maintenance, General.
    - Filter/search theo `key` hoặc `description`.
    - Có thể thêm tag/badge để phân loại (ví dụ: "Critical", "Security", "Performance").

### 4.4 Xử lý lỗi

- Backend trả `ErrorResDto` với `code` cụ thể:
    - `ERR_ITEM_NOT_FOUND`: setting không tồn tại.
    - `ERR_BAD_REQUEST`: value không phù hợp với type.
    - `ERR_PERMISSION_DENIED`: thiếu quyền.
- FE nên map `code` sang message tiếng Việt thân thiện:
    ```typescript
    const errorMessages = {
      ERR_ITEM_NOT_FOUND: 'Setting không tồn tại',
      ERR_BAD_REQUEST: 'Giá trị không hợp lệ. Vui lòng kiểm tra lại định dạng.',
      ERR_PERMISSION_DENIED: 'Bạn không có quyền thực hiện thao tác này',
    };
    ```

## 5. Test nhanh bằng cURL (tham khảo)

```bash
# Lấy danh sách settings
curl -X GET https://api.example.com/admin/settings \
  -H "Authorization: Bearer <token>"

# Cập nhật setting boolean
curl -X POST https://api.example.com/admin/settings/setting_abc123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "true",
    "isSecret": false
  }'

# Cập nhật setting number
curl -X POST https://api.example.com/admin/settings/setting_def456 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "20",
    "isSecret": false
  }'

# Cập nhật setting date
curl -X POST https://api.example.com/admin/settings/setting_jkl012 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "2025-12-31T23:59:59.000Z",
    "isSecret": false
  }'

# Cập nhật setting JSON
curl -X POST https://api.example.com/admin/settings/setting_mno345 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "{\"featureA\": true, \"featureB\": false}",
    "isSecret": false
  }'

# Cập nhật setting secret
curl -X POST https://api.example.com/admin/settings/setting_ghi789 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "new-secret-key-12345",
    "isSecret": true
  }'
```

FE có thể dùng các request này để verify kết nối trước khi ghép UI.

## 6. Checklist triển khai FE

- [ ] Đồng bộ permission flow, ẩn nút Edit nếu thiếu quyền `SETTING.UPDATE`.
- [ ] Xây dựng hook/service `useAdminSettings` wrap toàn bộ endpoint trên, luôn đọc/ghi `data`.
- [ ] Xử lý parse `value` theo `type` khi hiển thị trên UI.
- [ ] Xử lý mask value cho settings có `isSecret: true`.
- [ ] Render input phù hợp theo `type` (boolean → toggle, number → number input, date → date picker, json → textarea với validation).
- [ ] Validate `value` theo `type` trước khi submit (client-side validation).
- [ ] Xử lý JSON input với syntax highlighting và format button (optional nhưng recommended).
- [ ] Chuẩn hóa error handler và toast theo `code`.
- [ ] Tổ chức UI theo category (Bảo mật, Rate Limiting, Hệ thống).
- [ ] Xử lý UX cho secret settings (placeholder, không hiển thị giá trị cũ).
- [ ] Viết unit test/mock API cho các hook chính (list, update).

## 7. Ví dụ code TypeScript (tham khảo)

```typescript
// types/admin-settings.ts
export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

export interface AdminSetting {
  id: string;
  key: string;
  description: string | null;
  type: SettingDataType;
  value: string;
  isSecret?: boolean;
}

export interface UpdateSettingDto {
  value: string;
  isSecret: boolean;
}

// services/api/admin-settings.service.ts
import { apiClient } from 'src/lib/api/client';

const ADMIN_SETTING_BASE_PATH = '/admin/settings';

export const adminSettingsService = {
  list(): Promise<AdminSetting[]> {
    return apiClient.get<AdminSetting[]>(ADMIN_SETTING_BASE_PATH);
  },

  update(id: string, data: UpdateSettingDto): Promise<void> {
    return apiClient.post<void>(`${ADMIN_SETTING_BASE_PATH}/${id}`, data);
  },
};

// hooks/useAdminSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsService } from 'src/services/api/admin-settings.service';
import { useNotify } from 'src/hooks/useNotify';

export const useAdminSettings = () => {
  const queryClient = useQueryClient();
  const notify = useNotify();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingsService.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSettingDto) =>
      adminSettingsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      notify.success('Cập nhật setting thành công');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.code
        ? getErrorMessage(error.response.data.code)
        : 'Có lỗi xảy ra khi cập nhật setting';
      notify.error(message);
    },
  });

  return {
    settings,
    isLoading,
    updateSetting: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

// utils/setting.utils.ts
import { SettingDataType, AdminSetting } from 'src/types/admin-settings';

export const parseSettingValue = (setting: AdminSetting): any => {
  const { value, type } = setting;
  
  switch (type) {
    case SettingDataType.BOOLEAN:
      return value === 'true';
    case SettingDataType.NUMBER:
      return Number(value);
    case SettingDataType.DATE:
      return new Date(value);
    case SettingDataType.JSON:
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
};

export const formatSettingValue = (
  value: any,
  type: SettingDataType,
): string => {
  switch (type) {
    case SettingDataType.BOOLEAN:
      return value ? 'true' : 'false';
    case SettingDataType.NUMBER:
      return String(value);
    case SettingDataType.DATE:
      return value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString();
    case SettingDataType.JSON:
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      return String(value);
  }
};

export const validateSettingValue = (
  value: string,
  type: SettingDataType,
): { valid: boolean; error?: string } => {
  switch (type) {
    case SettingDataType.BOOLEAN:
      if (value !== 'true' && value !== 'false') {
        return { valid: false, error: 'Giá trị phải là "true" hoặc "false"' };
      }
      break;
    case SettingDataType.NUMBER:
      if (isNaN(Number(value)) || value.trim() === '') {
        return { valid: false, error: 'Giá trị phải là số hợp lệ' };
      }
      break;
    case SettingDataType.DATE:
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Giá trị phải là định dạng ngày giờ hợp lệ (ISO 8601)' };
      }
      break;
    case SettingDataType.JSON:
      try {
        JSON.parse(value);
      } catch {
        return { valid: false, error: 'Giá trị phải là JSON hợp lệ' };
      }
      break;
  }
  return { valid: true };
};
```

## 8. Tính năng đề xuất bổ sung (nếu cần)

### 8.1 Reset về giá trị mặc định

- **Endpoint:** `POST /admin/settings/:id/reset`
- **Mô tả:** Reset setting về giá trị mặc định ban đầu.
- **Use case:** Khi admin muốn khôi phục setting về trạng thái ban đầu.

### 8.2 Lịch sử thay đổi Settings

- **Endpoint:** `GET /admin/settings/:id/history`
- **Mô tả:** Lấy lịch sử thay đổi của một setting (tích hợp với audit log).
- **Use case:** Theo dõi ai đã thay đổi setting nào, khi nào, giá trị cũ và mới.

### 8.3 Export/Import Settings

- **Endpoints:**
    - `GET /admin/settings/export`: Export tất cả settings ra file JSON.
    - `POST /admin/settings/import`: Import settings từ file JSON.
- **Use case:** Backup/restore settings, migrate giữa các môi trường.

### 8.4 Bulk Update Settings

- **Endpoint:** `POST /admin/settings/bulk-update`
- **Body:** `{ updates: [{ id: string, value: string, isSecret: boolean }] }`
- **Mô tả:** Cập nhật nhiều settings cùng lúc.
- **Use case:** Khi cần cập nhật nhiều settings liên quan (ví dụ: tất cả rate limit settings).

### 8.5 Validation Rules cho Settings

- **Mở rộng schema:** Thêm trường `validation` vào Setting model (ví dụ: `min`, `max` cho number, `pattern` cho string).
- **Use case:** Validate chặt chẽ hơn ở cả client và server (ví dụ: rate limit max phải >= 1).

### 8.6 Settings Groups/Categories

- **Mở rộng schema:** Thêm trường `category` hoặc `group` vào Setting model.
- **Use case:** Tổ chức settings tốt hơn, filter theo category.

### 8.7 Settings Description i18n

- **Mở rộng:** Description có thể là object i18n thay vì string đơn giản.
- **Use case:** Hiển thị description theo ngôn ngữ của user.

---

**Lưu ý:** Các tính năng trên là đề xuất, chưa được implement trong backend hiện tại. FE có thể đề xuất với backend team nếu cần thiết.

