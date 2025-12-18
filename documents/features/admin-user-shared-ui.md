## Mục tiêu

- **Giảm trùng lặp UI & logic** giữa các page admin và user cho cùng một resource (sessions, audit-logs, API keys, api-key-usage, notifications, IP whitelist, ...).
- **Giảm số lượng page** nhưng vẫn:
  - Giữ trải nghiệm phù hợp cho từng nhóm người dùng (end-user vs admin).
  - **Đảm bảo phân quyền chặt chẽ**, không lộ thêm dữ liệu/hành động vượt quyền.
- **Bám sát thiết kế BE mới** trong `admin-user-shared-controllers.md`: mỗi resource có **một controller hợp nhất**, endpoint chung cho cả admin và user; phân biệt hành vi bằng permission.

---

## Hiện trạng FE

### 1. Cấu trúc router

File `client/src/app/routes.tsx`:

- Route cho **user**:
  - `GET /me/sessions` → `MySessionsPage` với `ProtectedRoute` yêu cầu `['SESSION.VIEW', 'SESSION.VIEW_ALL']` (mode `any`).
  - `GET /me/audit-logs` → `MyAuditLogsPage`.
  - `GET /settings/api-keys` → `UserApiKeysPage` với `API_KEY.VIEW`.
- Route cho **admin**:
  - `/admin/sessions` → `AdminSessionsPage` với `SESSION.VIEW`.
  - `/admin/audit-logs` → `AdminAuditLogPage` với `AUDIT_LOG.VIEW` / `AUDIT_LOG.VIEW_ALL`.
  - `/admin/api-keys` → `AdminApiKeysPage` với `API_KEY.VIEW_ALL`.
  - `...` các resource admin khác (users, roles, settings, ip-whitelists, ...).

Kết quả: **cùng một resource** (sessions, audit-logs, api-keys) đang có **2 route/page khác nhau** cho admin và user.

### 2. Sessions

- `MySessionsPage` (`client/src/app/pages/MySessionsPage.tsx`):
  - Dùng `GenericResourcePage<AdminSession, AdminSessionListParams>`.
  - `resource={sessionResource}` (tạo từ `createSessionResource`).
  - `scope="user"`, `customColumns` thêm cột “current device”.
  - Custom header: card chứa title/subtitle + alert + nút `logout current` / `logout all`.
- `AdminSessionsPage` (`client/src/features/admin/sessions/pages/AdminSessionsPage.tsx`):
  - Cũng dùng `GenericResourcePage<AdminSession, AdminSessionListParams>`.
  - `scope="admin"`, thêm filter IP, status, userIds (với user search select).
  - Custom header hiển thị cảnh báo theo setting `ENB_ONLY_ONE_SESSION`.
- `session.resource.tsx`:
  - Định nghĩa `ResourceContext` cho sessions.
  - **Endpoints hiện tại**: `list: '/api/admin/sessions'`, `delete: '/api/admin/sessions/revoke'` (đang bám BE cũ `/admin/...`).

Nhận xét:

- Đã có **GenericResourcePage** + **sessionResource** tương đối giống tài liệu `resource-management.md`.
- Tuy nhiên:
  - Endpoint vẫn là `/api/admin/sessions` → chưa bám unified controller `/sessions`.
  - Vẫn có **2 page** (`MySessionsPage`, `AdminSessionsPage`) với nhiều logic giống nhau (date range, revoke, status, ...).

### 3. API Keys

- `UserApiKeysPage` (`client/src/features/settings/api-keys/pages/UserApiKeysPage.tsx`):
  - Dùng `AppTable` + hooks `useUserApiKeyList`, `useDeleteUserApiKeys`, ...
  - Gọi `apiKeyService` (non-admin) → endpoint user.
- `AdminApiKeysPage` (`client/src/features/admin/api-keys/pages/AdminApiKeysPage.tsx`):
  - Dùng `AppTable` + `useAdminTable`.
  - Gọi `adminApiKeyService` → endpoint admin.
- Logic list, filter, revoke, regenerate, delete **rất giống nhau**, chỉ khác:
  - Admin có thêm filter user, xem theo userId.
  - Phân quyền khác (`API_KEY.VIEW` vs `API_KEY.VIEW_ALL`, `API_KEY.UPDATE`, ...).

Nhận xét:

- Đây là ví dụ rõ ràng về **trùng lặp UI & logic** giữa admin/user cho cùng một resource.
- Chưa tận dụng `GenericResourcePage` cho API keys.

### 4. Audit Logs, Notifications, IP Whitelist

- Audit-logs:
  - `AdminAuditLogPage` (admin).
  - `MyAuditLogsPage` (user) trong `app/pages` (không phân tích chi tiết ở đây nhưng pattern tương tự sessions).
- Notifications, IP whitelist:
  - Kiến trúc BE đã unify controller (`notification.controller.ts`, `ip-whitelist.controller.ts`).
  - FE hiện có page admin và (sau này) có thể thêm page user cho cùng resource → nguy cơ lặp lại pattern My*/Admin*.

Kết luận hiện trạng:

- FE **đã có nền tảng generic** (GenericResourcePage, ResourceContext, useResourcePermissions, useResourcePagination).
- Nhưng:
  - Vẫn giữ nhiều page riêng: MySessions/AdminSessions, UserApiKeys/AdminApiKeys, MyAuditLogs/AdminAuditLogs (tiềm năng).
  - Endpoint trong resource config chưa nhất quán với BE unified controllers.

---

## Nguyên tắc thiết kế mới cho FE (align với BE unified controllers)

### 1. Mỗi resource = 1 `ResourceContext` + 1 base page

- **ResourceContext** (đã mô tả kỹ trong `ui-design/resource-management.md`):
  - Định nghĩa: permissions, endpoints, dataConfig, uiConfig (columns, filters, actions, bulkActions).
  - Ví dụ: `sessionResource`, `notificationResource`, `apiKeyResource`, ...
- **Base page** cho resource:
  - Ví dụ: `SessionsPage`, `AuditLogsPage`, `UserIpWhitelistPage`, `NotificationsPage`, `ApiKeysPage`.
  - Base page là nơi dùng `GenericResourcePage` + truyền `resource` tương ứng.

Từ base page này, chúng ta có 2 hướng:

- **Hướng A (ưu tiên – ít page nhất)**: **1 route duy nhất** cho resource, auto detect admin/user theo permission.
- **Hướng B (giữ 2 entry point nhưng 1 implementation)**: 2 route (me vs admin) nhưng dùng **cùng base page** với props khác (scope, header,...).

### 2. Endpoint FE phải trùng với unified controller BE

Theo tài liệu `admin-user-shared-controllers.md`, BE đã unify:

- Sessions: `prefix: '/sessions'`.
- API keys: `prefix: '/api-keys'`.
- Audit logs: `prefix: '/audit-logs'`.
- API key usage: `prefix: '/api-key-usage'`.
- Notifications: `prefix: '/notifications'`.
- IP whitelist: `prefix: '/user-ip-whitelists'`.

Do đó:

- **FE không nên tiếp tục gọi `/admin/...`** cho các resource này.
- Trong `ResourceContext.endpoints` và các `*.service.ts` tương ứng, cần chuẩn hóa endpoint về:
  - `list: '/sessions'`, `delete: '/sessions/revoke'`, ...
  - `list: '/api-keys'`, `delete: '/api-keys/del'`, ...
  - `list: '/audit-logs'`, `actions.resolve: '/audit-logs/:id/resolve'`, ...

BE sẽ quyết định:

- Áp dụng filter theo `currentUserId` khi user không có permission admin-like (`hasViewPermission = false`).
- Cho phép thao tác admin-like khi user có các permission `VIEW`, `UPDATE`, `DELETE` tương ứng.

### 3. Phân quyền ở FE: lớp cuối, không phải nguồn “bảo mật”

- **Nguồn bảo mật chính vẫn là BE**:
  - Controller check `currentUser.permissions`, `roleIds`.
  - Service luôn filter theo `currentUserId` nếu không có quyền “view all”.
- FE:
  - Dùng `ProtectedRoute` + `useResourcePermissions` để:
    - Ẩn route nếu không có quyền tối thiểu.
    - Ẩn/hạn chế UI (cột, nút, filter) nếu không có quyền nâng cao.
  - Không dựa vào FE để “chặn hẳn” quyền – chỉ là UX/guard thêm.

---

## Pattern UI/UX tổng quát cho resource dùng chung admin & user

### 1. GenericResourcePage + ResourceScope

`GenericResourcePage` hiện tại đã:

- Check quyền xem:
  - `const permissions = useResourcePermissions(resource);`
  - `if (!permissions.canView) return <AccessDeniedPage />;`
- Tự render:
  - Columns (ẩn cột owner nếu `!canViewAll`).
  - Actions/bulk actions theo permission.
  - Table, pagination, filter form.

Đề xuất bổ sung nhỏ:

- Cho phép `GenericResourcePage` nhận `scope?: 'user' | 'admin' | 'both'` (đã có trong type `ResourceScope`), và:
  - Nếu không truyền (`undefined`) → dùng `resource.scope`.
  - Nếu `scope === 'both'` → dựa trên `permissions.canViewAll` để quyết định “tâm thế” admin/user phía FE (chỉ ảnh hưởng UI, BE vẫn quyết định thật).

### 2. Cấu hình ResourceContext “chuẩn unified”

Ví dụ sessions (ý tưởng, code thật sẽ chỉnh lại endpoints, services):

```typescript
export const sessionResource: ResourceContext<
  AdminSession,
  AdminSessionListParams,
  { ids: string[] }
> = {
  name: 'session',
  displayName: 'Session',
  permissions: {
    view: ['SESSION.VIEW', 'SESSION.VIEW_ALL'],
    viewAll: 'SESSION.VIEW_ALL',
    delete: ['SESSION.REVOKE', 'SESSION.REVOKE_ALL'],
  },
  endpoints: {
    list: '/sessions',
    delete: '/sessions/revoke',
  },
  dataConfig: {
    idField: 'id',
    ownerField: 'createdById',
    // statusComputed như hiện tại
  },
  uiConfig: {
    columns: [...],
    actions: [...],
    bulkActions: [...],
  },
  scope: 'both',
  listService: (params) => unifiedSessionsService.list(params),
  actionService: (action, params) => unifiedSessionsService[action](params),
};
```

Các resource khác (api-keys, audit-logs, notifications, ip-whitelist, api-key-usage) sẽ:

- Dùng pattern tương tự.
- Khác nhau chủ yếu ở:
  - `permissions.*`.
  - `endpoints`.
  - `columns`, `filters`, `actions`.

### 3. 2 lựa chọn UX: 1 page hay 2 entry

#### Lựa chọn A – 1 page duy nhất cho cả admin & user (khuyến nghị)

- Router:
  - Sessions:
    - `/sessions` → `SessionsPage`.
  - Audit logs:
    - `/audit-logs` → `AuditLogsPage`.
  - API keys:
    - `/api-keys` → `ApiKeysPage`.
- `ProtectedRoute`:
  - Cho phép user có permission tối thiểu vào được:
    - `/sessions`: `['SESSION.VIEW', 'SESSION.VIEW_ALL']` (mode `any`).
    - `/audit-logs`: `['AUDIT_LOG.VIEW', 'AUDIT_LOG.VIEW_ALL']` (mode `any`).
    - `/api-keys`: `['API_KEY.VIEW', 'API_KEY.VIEW_ALL']` (mode `any`).
- Page (ví dụ `SessionsPage`):
  - Dùng `GenericResourcePage` với `resource={sessionResource}`, `scope="both"`.
  - Dựa trên `useResourcePermissions`:
    - Nếu `canViewAll === false` → UX “My ...”:
      - Ẩn cột user.
      - Không cho filter theo userIds.
      - Chỉ hiện hành động “revoke” trong phạm vi record của chính mình (BE đảm bảo).
    - Nếu `canViewAll === true` → UX “Admin ...”:
      - Hiện cột user, filter theo user.
      - Có thể xuất hiện thêm bulk actions.

Ưu điểm:

- **Ít page nhất**: mỗi resource chỉ 1 page.
- Code dễ maintain: fix 1 nơi.
- UX vẫn khác biệt rõ giữa user vs admin, nhờ quyền và cấu hình UI.

Nhược điểm:

- Menu/sidebar phải “map” role → cùng route:
  - Entry “My Sessions” và “Admin Sessions” có thể cùng navigate tới `/sessions` nhưng hiển thị cùng một UI, chỉ khác prefilter/title (có thể customize bằng props).

#### Lựa chọn B – 2 entry point nhưng dùng chung base page

- Vẫn tạo base page (ví dụ `SessionsPageBase`) dùng `GenericResourcePage`.
- Router:
  - `/me/sessions`:
    - Render `<SessionsPageBase scopeOverride="user" customHeader=... />`.
  - `/admin/sessions`:
    - Render `<SessionsPageBase scopeOverride="admin" customHeader=... />`.
- `SessionsPageBase`:
  - Nhận props:
    - `mode`: `'user' | 'admin' | 'auto'`.
    - Các phần custom header/footer/columns riêng.
  - Bên trong vẫn dùng `sessionResource` + `GenericResourcePage`.

Ưu điểm:

- Giữ được phân tách menu/URL như hiện tại (`/me/...` vs `/admin/...`).
- Code không trùng lặp: My/Admin chỉ là wrapper mỏng.

Nhược điểm:

- Vẫn có 2 file page, nhưng rất mỏng (chủ yếu là cấu hình/branding).

Khuyến nghị:

- **Ngắn hạn**: Lựa chọn B – để ít phá vỡ router hiện tại, dễ migrate.
- **Dài hạn**: Hợp nhất dần sang lựa chọn A cho các resource nào mà UX không cần tách URL.

---

## Mapping cụ thể theo resource

### 1. Sessions

**BE**: `session.controller.ts` với prefix `/sessions` (unified).

**FE (mục tiêu)**:

- `sessionResource`:
  - Endpoint: `/sessions`, `/sessions/revoke`.
  - `scope: 'both'`.
  - Dùng cùng cho user và admin.
- Base page: `SessionsPageBase`:
  - Dùng `GenericResourcePage<AdminSession, AdminSessionListParams>`.
  - Nhận props:
    - `mode: 'user' | 'admin' | 'auto'`.
    - `customHeader`, `customColumns`, `initialParams`.
- Wrapper:
  - `MySessionsPage`: `mode='user'`, custom header có alert + logout current/all, ẩn filter userIds.
  - `AdminSessionsPage`: `mode='admin'`, header hiển thị alert setting, có filter userIds, status, ip.

Về lâu dài:

- Có thể merge thành `SessionsPage` duy nhất, auto detect `canViewAll` và quyết định UX ngay trong 1 file.

### 2. API Keys

**BE**: `api-keys.controller.ts` với prefix `/api-keys` (unified).

Hiện tại:

- `UserApiKeysPage` dùng `apiKeyService` (user).
- `AdminApiKeysPage` dùng `adminApiKeyService`.
- Table, actions (revoke, regenerate, delete) gần giống nhau.

**FE (mục tiêu)**:

- Tạo `apiKeyResource` tương tự `sessionResource`:
  - `permissions.view`: `['API_KEY.VIEW', 'API_KEY.VIEW_ALL']`.
  - `permissions.viewAll`: `API_KEY.VIEW_ALL`.
  - `permissions.create/update/delete` tương ứng.
  - `endpoints.list = '/api-keys'`, `endpoints.delete = '/api-keys/del'`, `endpoints.actions.regenerate = '/api-keys/:id/regenerate'`, ...
  - `uiConfig.columns` kết hợp logic hiện có ở User/Admin page (có thêm cột user, filter user khi `canViewAll`).
- Base page: `ApiKeysPageBase` dùng `GenericResourcePage`.
- Wrapper:
  - `UserApiKeysPage`: `mode='user'`, ẩn cột user/filter user, chỉ hiển thị key của chính mình.
  - `AdminApiKeysPage`: `mode='admin'`, cho phép filter theo user, dùng cùng resource config.

### 3. Audit Logs

**BE**: `audit-logs.controller.ts` với prefix `/audit-logs` (unified).

**FE (mục tiêu)**:

- `auditLogResource`:
  - `permissions.view`: `['AUDIT_LOG.VIEW', 'AUDIT_LOG.VIEW_ALL']`.
  - `permissions.viewAll`: `AUDIT_LOG.VIEW_ALL`.
  - `endpoints.list = '/audit-logs'`, `endpoints.actions.resolve = '/audit-logs/:id/resolve'`.
- Base page: `AuditLogsPageBase`:
  - List + filters + detail modal + actions (resolve).
- Wrapper:
  - `MyAuditLogsPage`: chỉ view log của chính mình (BE filter theo `currentUserId` vì `hasViewPermission = false`).
  - `AdminAuditLogPage`: admin-like có thể view toàn hệ thống, resolve events.

### 4. Notifications, IP whitelist, API key usage

Pattern tương tự:

- Tạo `*Resource` cho mỗi resource.
- Dùng `GenericResourcePage` làm base.
- Dùng wrapper page (nếu cần tách route) thay vì viết lại logic.

---

## Chiến lược refactor FE

### Giai đoạn 1 – Chuẩn hóa ResourceContext + services theo unified BE

1. Cập nhật `sessionResource`:
   - Chuyển endpoint từ `/api/admin/sessions` → `/sessions`.
   - Dùng service unified (ví dụ `sessionsService`) thay vì `adminSessionsService`.
2. Tạo `apiKeyResource`, `auditLogResource`, `notificationResource`, `ipWhitelistResource`, `apiKeyUsageResource`:
   - Bám đúng endpoint unified trong BE.
   - Định nghĩa permissions theo tài liệu BE.
3. Cập nhật các service trong `client/src/services/api`:
   - Nếu đang có cả `admin/*` và non-admin cho cùng resource:
     - Dần dần gom lại 1 service unified (lớp mỏng gọi REST), FE logic phân biệt admin/user dựa trên permission.

### Giai đoạn 2 – Gom page My*/Admin* thành base page dùng chung

1. Sessions:
   - Tạo `SessionsPageBase` (hoặc dùng luôn `GenericResourcePage` với cấu hình hợp lý).
   - Refactor `MySessionsPage` và `AdminSessionsPage` thành wrapper mỏng.
2. API keys:
   - Tạo `ApiKeysPageBase` sử dụng `apiKeyResource`.
   - Cho `UserApiKeysPage` và `AdminApiKeysPage` dùng chung base.
3. Audit logs:
   - Tương tự: `AuditLogsPageBase`, dùng cho `MyAuditLogsPage` và `AdminAuditLogPage`.

### Giai đoạn 3 – Cân nhắc hợp nhất route (tuỳ UX)

1. Với các resource không cần phân biệt rõ `/me/...` vs `/admin/...` trên URL:
   - Hợp nhất thành một route:
     - Ví dụ: `/sessions`, `/audit-logs`, `/notifications`.
   - Dùng 1 page duy nhất (A).
2. Với các resource cần tách context rõ (ví dụ, user xem API keys ở `/settings/api-keys` là hợp lý):
   - Giữ 2 entry point nhưng:
     - Cùng dùng 1 base page.
     - Cùng `ResourceContext`.

---

## Gợi ý UI/UX chi tiết cho một số case

### 1. Sessions

- **User**:
  - Tiêu đề: “Phiên đăng nhập của bạn”.
  - Mô tả: cảnh báo về bảo mật, gợi ý logout all khi nghi ngờ.
  - Bảng:
    - Ẩn cột “User”.
    - Thêm cột “Thiết bị hiện tại”.
  - Action:
    - Revoke session (một hoặc nhiều).
    - Nút “Đăng xuất tất cả thiết bị”.
- **Admin**:
  - Tiêu đề: “Quản lý phiên đăng nhập”.
  - Bảng:
    - Hiện cột “User”.
    - Filter theo user, status, IP, date range.
  - Action:
    - Revoke theo batch.
    - Có thể thêm filter theo loại thiết bị, location nếu BE hỗ trợ.

### 2. API keys

- **User**:
  - Tập trung vào key của chính user:
    - Tạo/sửa/xoá key của mình.
    - Revoke, regenerate.
  - UX:
    - Luồng tạo/hiển thị key mới phải rõ ràng (modal hiển thị key duy nhất 1 lần).
    - Cảnh báo bảo mật khi copy key.
- **Admin**:
  - Quản lý key của nhiều user:
    - Filter theo user, status, ngày tạo, ngày dùng cuối.
    - Bulk delete/revoke cho một user (khi nghi ngờ bị lộ).
  - UX:
    - Rõ ràng giữa hành động “revoke” vs “delete” (nếu tồn tại cả 2).
    - Có thể bổ sung audit info (ai tạo, ai revoke).

### 3. Audit logs

- **User**:
  - Xem lại các hành động bảo mật liên quan đến tài khoản của mình.
  - Tập trung vào các event dễ hiểu (login, đổi mật khẩu, đổi email, ...).
- **Admin/Security**:
  - Cần nhiều filter mạnh:
    - Theo user, theo loại hành động, theo resource, severity, ...
  - Action “resolve” cho security event:
    - Hiển thị rõ state (open/resolved), ai resolve, khi nào.

---

## Kết luận

- BE đã chuyển sang mô hình **một controller hợp nhất** cho nhiều resource chung admin/user.
- FE **nên đi theo cùng triết lý**:
  - Mỗi resource **một ResourceContext**, **một base page**.
  - Admin vs user **khác nhau chủ yếu ở permissions và cấu hình UI**, không phải ở việc viết 2 page độc lập.
- Lộ trình đề xuất:
  - Bước 1: Chuẩn hoá endpoint và ResourceContext theo unified controllers.
  - Bước 2: Refactor các cặp page My*/Admin* thành dùng chung base page + GenericResourcePage.
  - Bước 3: Cân nhắc hợp nhất route (nếu UX cho phép) để giảm thêm số lượng page, nhưng vẫn đảm bảo **phân quyền chặt chẽ** nhờ permission ở cả FE và BE.
