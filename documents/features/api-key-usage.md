## Mục tiêu

- **Chuẩn hoá tích hợp tính năng API key usage** trên FE/BE theo mô hình unified controller (dùng chung cho cả user và admin).
- **Đảm bảo UI/UX nhất quán** với các tài liệu `ui-design/resource-management.md` và `features/admin-user-shared-ui.md`.
- **Giảm trùng lặp code** giữa trang dành cho user và admin, tận dụng `GenericResourcePage` + `ResourceContext`.

---

## Phạm vi tính năng

- **Đối tượng sử dụng**:
  - **End-user**: Xem chi tiết lịch sử sử dụng API key của chính mình, tự kiểm tra bất thường.
  - **Admin/Security**: Giám sát việc sử dụng API key trên toàn hệ thống, điều tra sự cố, audit.
- **Use cases chính**:
  - Xem danh sách request theo API key:
    - Thời gian, endpoint, status code, latency, IP, user/owner, quota/plan, ...
  - Lọc theo:
    - Thời gian, API key, user, endpoint, status code, IP, kết quả (success/error), ...
  - Thống kê (tab / view `stats`):
    - Số request theo thời gian.
    - Top API key theo số request/lỗi.
    - Top endpoint được gọi nhiều nhất.

---

## Backend – Unified controller cho API key usage

### 1. Controller

File `server/src/modules/api-key-usage/api-key-usage.controller.ts`:

```18:67:server/src/modules/api-key-usage/api-key-usage.controller.ts
const canApiKeyView = (user: ICurrentUser) =>
  user.permissions.includes('API_KEY.VIEW');

export const apiKeyUsageController = new Elysia({
  prefix: '/api-key-usage',
  tags: [DOC_TAG.USER_API_KEY_USAGE, DOC_TAG.ADMIN_API_KEY_USAGE],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyUsageService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      query: ApiKeyUsageListQueryDto,
      response: {
        200: ResWrapper(ApiKeyUsagePaginatedResponseDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/stats',
    async ({ query, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyUsageService.getStatsWithFilter({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      query: ApiKeyUsageStatsQueryDto,
      response: {
        200: ResWrapper(ApiKeyUsageStatsResponseDto),
        ...authErrors,
      },
    },
  );
```

### 2. Nguyên tắc phân quyền BE

- **Endpoint duy nhất** cho cả user & admin:
  - `GET /api-key-usage` – danh sách log usage (có phân trang, filter).
  - `GET /api-key-usage/stats` – thống kê aggregate.
- **Xác định quyền**:
  - BE đang dùng quyền `API_KEY.VIEW` làm điều kiện tối thiểu (`canApiKeyView`).
  - `apiKeyUsageService` nhận:
    - `currentUserId`
    - `hasViewPermission`
  - Service sẽ:
    - **User thường**: chỉ được xem usage của API key thuộc về chính mình (filter theo owner/currentUser).
    - **Admin** (hoặc role nâng cao, tuỳ BE): có thể xem usage của nhiều user/API key (BE quyết định dựa trên `hasViewPermission` hoặc các quyền mở rộng trong tương lai).
- **Lưu ý bảo mật**:
  - FE **không được giả định** rằng chỉ cần có quyền là thấy mọi thứ; mọi ràng buộc thực tế về dữ liệu luôn nằm ở BE (filter theo `currentUserId`, kiểm tra ownership, ...).

---

## Nguyên tắc UI/UX chung (theo tài liệu shared admin/user)

Tham chiếu từ:

- `documents/ui-design/resource-management.md`
- `documents/features/admin-user-shared-ui.md`

Áp dụng cho API key usage:

- **Một ResourceContext + một base page** cho toàn bộ resource `api-key-usage`.
- **Admin và user dùng chung implementation**:
  - Cùng một `ResourceContext` (`apiKeyUsageResource`).
  - Cùng một base component (ví dụ: `ApiKeyUsagePageBase` hoặc dùng trực tiếp `GenericResourcePage`).
  - Khác nhau chủ yếu ở:
    - **Scope** (`'user'` vs `'admin'` vs `'both'`).
    - **Header / copywriting** (My vs Admin).
    - **Columns / filters** được hiển thị (ẩn cột user cho user thường, thêm filter user cho admin, ...).
- **Endpoint FE trùng BE unified controller**:
  - `list: '/api-key-usage'`
  - `stats: '/api-key-usage/stats'`
- **Phân quyền ở FE là lớp cuối**:
  - Dùng `ProtectedRoute`, `useResourcePermissions`, `usePermissions` để:
    - Quyết định có cho truy cập page không.
    - Ẩn/hiện một số filter/cột/biểu đồ.
  - Không dùng FE làm nguồn bảo mật chính.

---

## Thiết kế ResourceContext cho API key usage

### 1. Định nghĩa ResourceContext

Tên gợi ý: `apiKeyUsageResource`, đặt trong `client/src/features/.../resources/api-key-usage.resource.ts` (tuân theo pattern hiện tại).

```typescript
// Ví dụ định nghĩa ResourceContext cho API key usage (mang tính định hướng)
export const apiKeyUsageResource: ResourceContext<
  ApiKeyUsageRecord,
  ApiKeyUsageListParams,
  never
> = {
  name: "api-key-usage",
  displayName: "API Key Usage",

  permissions: {
    // Tối thiểu phải có để xem được usage
    view: ["API_KEY.VIEW"],
    // Có thể bổ sung viewAll tuỳ BE (ví dụ 'API_KEY.VIEW_USAGE_ALL')
    // viewAll: 'API_KEY.VIEW_USAGE_ALL',
  },

  endpoints: {
    list: "/api-key-usage",
    // stats dùng service riêng, không cần map vào actions nếu FE tách hook
  },

  dataConfig: {
    idField: "id",
    // Tên field owner có thể là userId / apiKeyId tuỳ DTO thực tế
    ownerField: "ownerId",
  },

  uiConfig: {
    columns: [
      // Thời gian gọi API
      createDateColumn({ dataIndex: "createdAt", title: "Thời gian" }),
      // API key / tên key
      { dataIndex: "apiKeyName", title: "API key" },
      // Endpoint + method
      { dataIndex: "method", title: "Method" },
      { dataIndex: "path", title: "Endpoint" },
      // Kết quả
      { dataIndex: "statusCode", title: "Status" },
      // Hiệu năng
      { dataIndex: "latencyMs", title: "Latency (ms)" },
      // IP
      { dataIndex: "ip", title: "IP" },
      // User (ẩn nếu user thường)
      { dataIndex: "userEmail", title: "User" },
    ],
    filters: [
      { type: "dateRange", field: "createdAt", label: "Thời gian" },
      { type: "text", field: "apiKey", label: "API key" },
      { type: "text", field: "ip", label: "IP" },
      {
        type: "select",
        field: "statusCode",
        label: "Status",
        // FE có thể map thành khoảng: 2xx / 4xx / 5xx hoặc list mã cụ thể
      },
      // Filter user chỉ hiển thị khi là admin
      // { type: 'userSelect', field: 'userId', label: 'User' },
    ],
    actions: [],
    bulkActions: [],
  },

  scope: "both",
};
```

### 2. Quy tắc hiển thị cột & filter theo vai trò

- **User thường (My view)**:
  - Ẩn cột:
    - `User` (vì chỉ xem chính mình).
  - Ẩn filter:
    - Filter theo user (userId, email, ...).
  - Vẫn dùng endpoint `/api-key-usage`, BE tự filter theo `currentUserId`.
- **Admin (Admin view)**:
  - Hiện cột User (email/ID).
  - Thêm filter user (search theo user, filter theo tổ chức/nhóm nếu BE hỗ trợ).
  - Giữ nguyên endpoint; BE cho phép xem rộng hơn.

---

## Kiến trúc FE – Base page dùng chung admin & user

### 1. Base page: `ApiKeyUsagePageBase`

- Đặt ở `client/src/features/.../pages/ApiKeyUsagePageBase.tsx`.
- Dùng chung cho cả user & admin:

```typescript
type ApiKeyUsagePageMode = "user" | "admin" | "auto";

interface ApiKeyUsagePageBaseProps {
  mode?: ApiKeyUsagePageMode; // 'auto' = auto detect từ permission
  customTitle?: string;
  customDescription?: string;
}

export function ApiKeyUsagePageBase(props: ApiKeyUsagePageBaseProps) {
  const { mode = "auto", customTitle, customDescription } = props;
  const permissions = useResourcePermissions(apiKeyUsageResource);

  if (!permissions.canView) {
    return <AccessDeniedPage />;
  }

  const effectiveScope =
    mode === "auto" ? (permissions.canViewAll ? "admin" : "user") : mode;

  const title =
    customTitle ??
    (effectiveScope === "admin"
      ? "API key usage (toàn hệ thống)"
      : "Lịch sử sử dụng API key của bạn");

  const description =
    customDescription ??
    (effectiveScope === "admin"
      ? "Giám sát hành vi sử dụng API key trên toàn hệ thống để phát hiện bất thường và điều tra sự cố."
      : "Theo dõi lịch sử các request dùng API key của bạn để phát hiện truy cập lạ hoặc nghi ngờ lộ key.");

  return (
    <PageContainer title={title} description={description}>
      <GenericResourcePage
        resource={apiKeyUsageResource}
        scope={effectiveScope} // 'user' | 'admin'
        // Có thể truyền thêm initialParams: default date range 7 ngày, ...
      />
      {/* Tab / section thống kê có thể dùng hook riêng gọi /api-key-usage/stats */}
    </PageContainer>
  );
}
```

### 2. Wrapper cho user & admin

- **User page** (ví dụ: trong nhóm Settings hoặc Security):

```typescript
// Ví dụ: UserApiKeyUsagePage.tsx
export default function UserApiKeyUsagePage() {
  return (
    <ApiKeyUsagePageBase
      mode="user"
      customTitle="Lịch sử sử dụng API key của bạn"
      customDescription="Theo dõi các request dùng API key của bạn để phát hiện truy cập bất thường."
    />
  );
}
```

- **Admin page**:

```typescript
// Ví dụ: AdminApiKeyUsagePage.tsx
export default function AdminApiKeyUsagePage() {
  return (
    <ApiKeyUsagePageBase
      mode="admin"
      customTitle="API key usage (Admin)"
      customDescription="Giám sát và phân tích việc sử dụng API key trên toàn hệ thống, hỗ trợ điều tra và audit bảo mật."
    />
  );
}
```

### 3. Router & ProtectedRoute

- Gợi ý route (có thể điều chỉnh theo cấu trúc hiện tại):
  - User:
    - `/settings/api-key-usage` hoặc `/security/api-key-usage`.
  - Admin:
    - `/admin/api-key-usage`.
- `ProtectedRoute`:
  - Cho phép vào nếu có ít nhất `API_KEY.VIEW`:
    - Mode `any`: `['API_KEY.VIEW']`.
  - Nếu sau này có thêm quyền nâng cao cho admin:
    - Có thể dùng chung route nhưng UI tự chuyển admin mode khi `canViewAll === true`.

---

## Tích hợp phần thống kê (`/api-key-usage/stats`)

### 1. Hook gọi BE

- Tạo hook riêng (ví dụ `useApiKeyUsageStats`) trong `client/src/hooks/api`:

```typescript
export function useApiKeyUsageStats(params: ApiKeyUsageStatsQueryDto) {
  return useQuery({
    queryKey: ["api-key-usage-stats", params],
    queryFn: () =>
      apiClient.get<ApiKeyUsageStatsResponseDto>("/api-key-usage/stats", {
        params,
      }),
  });
}
```

### 2. UI thống kê – định hướng UI/UX chi tiết với Ant Design Charts

- **Ưu tiên thư viện**:
  - Ưu tiên dùng hệ sinh thái Ant Design:
    - `@ant-design/plots` (hoặc `@ant-design/charts` – wrapper G2Plot).
    - Các component layout/typography từ Ant Design (`Card`, `Space`, `Typography`, `Row`, `Col`).
- **Vị trí trong page**:
  - Dùng một tab riêng trong `ApiKeyUsagePageBase`:
    - Tab `Lịch sử` (table).
    - Tab `Thống kê` (charts).
  - Hoặc section `Stats` phía trên table:
    - Hàng trên: số liệu tổng quan (cards).
    - Hàng dưới: 1–2 chart chính.

#### 2.1. Bộ chỉ số tổng quan (KPI cards)

- Dùng `Card` + `Statistic`/`Typography` của Ant Design, ví dụ:
  - **Tổng số request** trong khoảng thời gian filter.
  - **Tổng số lỗi** (4xx, 5xx).
  - **Tỉ lệ lỗi** (% error).
  - **Request gần nhất** (thời gian / IP).
- Yêu cầu UX:
  - Rõ ràng về đơn vị (%, ms, số lượng).
  - Màu sắc:
    - Màu trung tính cho tổng request.
    - Màu đỏ/“danger” cho lỗi.
  - Hover tooltip đơn giản (hoặc chỉ hiển thị số cố định, không cần tương tác).

#### 2.2. Biểu đồ theo thời gian (Time-series chart)

- Mục tiêu:
  - Cho thấy xu hướng request và lỗi theo thời gian.
- Gợi ý implement:
  - Dùng `Line` chart từ `@ant-design/plots`:
    - `xField: 'timeBucket'` (ví dụ: theo giờ/ngày).
    - `yField: 'count'`.
    - `seriesField: 'type'` với hai series:
      - `"requests"` – tổng request.
      - `"errors"` – tổng lỗi.
  - UX:
    - Legend cho phép bật/tắt từng series.
    - Tooltip hiển thị:
      - Thời gian.
      - Số request.
      - Số lỗi.
    - Hỗ trợ responsive tốt trên chiều ngang.

Ví dụ cấu hình (pseudo-code):

```typescript
const config: LineConfig = {
  data: stats.timeSeries, // từ BE
  xField: "timeBucket",
  yField: "count",
  seriesField: "type", // 'request' | 'error'
  smooth: true,
  height: 260,
  xAxis: {
    type: "timeCat",
  },
  legend: {
    position: "top",
  },
  tooltip: {
    showMarkers: true,
  },
};
```

#### 2.3. Biểu đồ phân bổ theo API key (Top API keys)

- Mục tiêu:
  - Giúp admin nhanh chóng xác định API key nào đang tạo nhiều traffic nhất / nhiều lỗi nhất.
- Gợi ý implement:
  - Dùng `Column` chart (`@ant-design/plots`):
    - `xField: 'apiKeyName'`.
    - `yField: 'requestCount'` hoặc `errorCount`.
  - UX:
    - Giới hạn **top N** (ví dụ top 10).
    - Label trục X:
      - Dùng `ellipsis`/rotate nếu tên key dài.
      - Tooltip hiển thị đầy đủ tên key.

Ví dụ cấu hình:

```typescript
const topKeyConfig: ColumnConfig = {
  data: stats.topApiKeys,
  xField: "apiKeyName",
  yField: "requestCount",
  height: 260,
  xAxis: {
    label: {
      autoRotate: true,
    },
  },
  tooltip: {
    showMarkers: false,
  },
};
```

#### 2.4. Biểu đồ phân bổ theo endpoint / status

- **Endpoint**:
  - Dùng `Column` chart:
    - `xField: 'path'` (endpoint).
    - `yField: 'requestCount'`.
  - Thích hợp cho admin khi cần biết API nào được gọi nhiều nhất.
- **Status code**:
  - Dùng `Column` hoặc `Pie` chart:
    - Hiển thị số lượng request theo nhóm `2xx`, `4xx`, `5xx`.
  - Màu gợi ý:
    - `2xx`: xanh lá (success).
    - `4xx`: vàng/cam (warning).
    - `5xx`: đỏ (danger).

#### 2.5. Quy tắc phân quyền cho chart

- Áp dụng giống table:
  - Cùng hook và endpoint `/api-key-usage/stats` cho cả user/admin.
  - BE tự filter theo `currentUserId`/`hasViewPermission`.
- Khác biệt UI:
  - **User**:
    - Chỉ hiển thị stats liên quan đến key của chính họ.
    - Có thể ẩn bớt chart phức tạp (ví dụ không cần “Top users”).
  - **Admin**:
    - Hiển thị thêm:
      - Chart top API key.
      - Chart top endpoint.
      - Bảng tổng hợp theo user nếu BE có dữ liệu.

#### 2.6. Trạng thái loading / empty / error

- **Loading**:
  - Dùng `Spin` hoặc skeleton chart (container có `Skeleton` + height cố định).
  - Tránh layout “nhảy” khi dữ liệu load xong: cố định chiều cao block chart.
- **Empty**:
  - Khi không có dữ liệu trong khoảng thời gian filter:
    - Hiển thị trạng thái empty của AntD (`Empty`) kèm message:
      - “Không có dữ liệu usage trong khoảng thời gian đã chọn.”
    - Gợi ý:
      - Nút “Reset filter” hoặc “Xem 30 ngày gần nhất”.
- **Error**:
  - Hiển thị `Alert` kiểu `error`:
    - Thông báo không lấy được dữ liệu thống kê.
    - Có nút “Thử lại” gọi lại query.

#### 2.7. Tương tác filter giữa table và chart

- Các filter ở phần “Lọc” của page (date range, API key, user, status, ...) nên:
  - Áp dụng **cùng một source state** cho:
    - Query list (table).
    - Query stats (chart).
- Hành vi mong muốn:
  - Khi user đổi date range / API key:
    - Table và toàn bộ chart update đồng bộ.
  - Khi đổi tab:
    - Không reset filter.
    - Chỉ refetch stats nếu filter thay đổi.

#### 2.8. Performance & UX

- Giới hạn:
  - Tránh vẽ quá nhiều điểm trên chart (down-sampling theo giờ/ngày).
  - Với khoảng thời gian lớn (ví dụ > 30 ngày):
    - BE nên aggregate theo ngày/tuần.
  - Hiển thị rõ ràng đơn vị trên trục thời gian (HH:mm vs YYYY-MM-DD).
- Responsive:
  - Dùng layout `Row`/`Col`:
    - Màn hình rộng: 2 chart cạnh nhau.
    - Màn hình hẹp: các chart xếp dọc.

---

### 3. Quy tắc phân quyền tổng quan cho phần thống kê

- Dùng chung hook cho cả user & admin, BE tự lọc.
- FE chỉ khác nhau ở:
  - **Mặc định filter**:
    - User: focus vào API key của chính mình (BE lọc theo owner).
    - Admin: có thể filter theo user/API key khác.
  - **Số lượng chart**:
    - User: tập trung vào biểu đồ giúp phát hiện bất thường cho chính họ.
    - Admin: bổ sung chart toàn hệ thống, top API key, top endpoint, phân bổ status.

---

## Hành vi UX mong muốn

### 1. Đối với user (My view)

- **Mục tiêu UX**:
  - Giúp user tự phát hiện:
    - Request lạ từ IP/địa lý khác thường.
    - Số lượng request bất thường (tăng đột biến).
  - Khuyến khích hành động bảo mật:
    - Revoke key, tạo key mới, đổi mật khẩu, bật 2FA (tuỳ hệ thống).
- **Gợi ý UI**:
  - Header copy:
    - Tiêu đề: “Lịch sử sử dụng API key của bạn”.
    - Mô tả: giải thích ngắn về mục đích giám sát bảo mật.
  - Filter:
    - Default date range: 7–30 ngày gần nhất.
    - Cho phép nhanh: “24h qua”, “7 ngày qua”, “30 ngày qua”.
  - Table:
    - Columns tập trung vào:
      - Thời gian, endpoint, status, IP, latency.
    - Ẩn cột user.
  - Stats:
    - Đường biểu diễn số request theo thời gian.
    - Số lượng error 4xx/5xx.

### 2. Đối với admin

- **Mục tiêu UX**:
  - Giúp team vận hành/bảo mật:
    - Phát hiện misuse/misconfiguration của client.
    - Điều tra sự cố (ví dụ: tăng 5xx, leak key).
    - Audit hành vi sử dụng API theo user/client.
- **Gợi ý UI**:
  - Thêm filter:
    - Theo user, API key, app/project (nếu có), IP, endpoint.
  - Bổ sung stats:
    - Top API key theo số request / lỗi.
    - Top endpoint theo traffic.
  - Có thể thêm:
    - Export CSV dành cho phân tích sâu (nếu BE hỗ trợ).

---

## Checklist tích hợp

### 1. Backend

- [ ] Đảm bảo `apiKeyUsageController` đã được mount vào app chính (`app.ts` / `modules/index.ts`).
- [ ] Kiểm tra DTO `ApiKeyUsageListQueryDto`, `ApiKeyUsageStatsQueryDto` có đầy đủ field cần cho FE (date range, filter theo status, endpoint, user, ...).
- [ ] Đảm bảo service:
  - [ ] Luôn nhận `currentUserId`, `hasViewPermission`.
  - [ ] Luôn filter theo ownership khi người dùng không có quyền mở rộng.

### 2. Frontend

- [ ] Tạo `apiKeyUsageResource` theo pattern `ResourceContext` (scope `'both'`, endpoint `/api-key-usage`).
- [ ] Tạo `ApiKeyUsagePageBase` dùng `GenericResourcePage`.
- [ ] Tạo 2 wrapper page (nếu cần tách route):
  - [ ] `UserApiKeyUsagePage` (mode `'user'`).
  - [ ] `AdminApiKeyUsagePage` (mode `'admin'`).
- [ ] Thêm route + `ProtectedRoute` đúng permission (`API_KEY.VIEW` tối thiểu).
- [ ] Tạo hook `useApiKeyUsageStats` và UI thống kê gắn với `/api-key-usage/stats`.
- [ ] Kiểm tra UI:
  - [ ] User thường không nhìn thấy filter/cột dành cho admin.
  - [ ] Admin có thể xem/locate usage của nhiều user/API key.

---

## Kết luận

- API key usage là **resource dùng chung** cho cả user và admin, nên cần tuân thủ chặt chẽ các nguyên tắc trong:
  - `ui-design/resource-management.md`
  - `features/admin-user-shared-ui.md`
- Thiết kế đề xuất:
  - **Một unified controller** `/api-key-usage` trên BE, tự phân biệt phạm vi dữ liệu theo permission.
  - **Một ResourceContext + một base page** trên FE, với wrapper mỏng cho user/admin (nếu cần).
- Cách tiếp cận này giúp:
  - **Giảm trùng lặp code**, dễ maintain.
  - **UI/UX nhất quán** giữa các resource khác như sessions, audit-logs, API keys.
  - **Đảm bảo phân quyền chặt chẽ**, BE là nguồn bảo mật chính, FE là lớp trải nghiệm và guard cuối.
