## Mục tiêu

- **Giảm trùng lặp code** giữa các controller `*-admin.controller.ts` và `*-user.controller.ts` cho các resource dùng chung (API keys, sessions, audit-logs, api-key-usage, ip-whitelist, notification, ...).
- **Giữ phân quyền chặt chẽ** (theo permission/role, không nới lỏng bảo mật).
- **Giữ API rõ ràng, dễ đọc** (đặc biệt là `/admin/*` cho admin, non-`/admin` cho end-user).
- **Dễ mở rộng** khi có thêm resource mới dùng chung cho cả admin và user.

---

## Thực trạng hiện tại

Ví dụ tiêu biểu:

- `session/session-admin.controller.ts`
- `session/session-user.controller.ts`
- `audit-logs/audit-logs-admin.controller.ts`
- `audit-logs/audit-logs-user.controller.ts`
- `api-keys/api-keys-admin.controller.ts`
- `api-keys/api-keys-user.controller.ts`

### 1. Session

`sessionAdminController`:

- Prefix: `/admin/sessions`
- Middleware:
  - `authCheck`
  - `authorize(has('SESSION.VIEW'))` cho GET
  - `authorize(has('SESSION.UPDATE'))` cho POST `/revoke`
- Handler:
  - GET `/`:
    - Gọi `sessionService.list({ ..., currentUserId, hasViewPermission: true })`
  - POST `/revoke`:
    - Gọi `sessionService.revokeMany(ids)` + ghi audit-log.

`sessionUserController`:

- Prefix: `/sessions`
- Middleware:
  - `authCheck`
- Handler:
  - GET `/`:
    - Gọi `sessionService.list({ ..., currentUserId, hasViewPermission: false })`
  - POST `/revoke`:
    - Gọi `sessionService.revoke(currentUser.id, ids)`

Nhận xét:

- Logic route gần như giống nhau (list, revoke) nhưng:
  - Khác prefix.
  - Khác middleware phân quyền.
  - Khác flag truyền xuống service (`hasViewPermission`, cách revoke).
- Nếu thêm route mới cho session, phải sửa ở **2 file**.

### 2. Audit logs

`auditLogsAdminController`:

- Prefix: `/admin/audit-logs`
- Middleware:
  - `authCheck`
  - `authorize(has('AUDIT_LOG.VIEW'))`
- Handler:
  - GET `/`: `auditLogsService.list({ ..., currentUserId, hasViewPermission: true })`
  - POST `/:id/resolve`: `auditLogsService.resolveSecurityEvent(id, { currentUserId })`

`auditLogsUserController`:

- Prefix: `/audit-logs`
- Middleware:
  - `authCheck`
- Handler:
  - GET `/`: `auditLogsService.list({ ..., currentUserId, hasViewPermission: false })`

### 3. API keys

`apiKeysAdminController`:

- Prefix: `/admin/api-keys`
- Middleware:
  - `authCheck`
  - `authorize(has('API_KEY.VIEW'))` cho GET
  - `authorize(has('API_KEY.UPDATE'))` cho POST `/`
  - `authorize(has('API_KEY.DELETE'))` cho POST `/del`
- Handler:
  - GET `/`: list với `hasViewPermission: true`
  - GET `/:id`: detail với `hasViewPermission: true`
  - POST `/`: upsert với `{ hasCreatePermission: true, hasUpdatePermission: true }` + cho phép chỉ định `userId` qua query.
  - POST `/del`: revokeMany với `{ hasDeletePermission: true }`.

`apiKeysUserController`:

- Prefix: `/api-keys`
- Middleware:
  - `authCheck`
- Handler:
  - GET `/`: list với `hasViewPermission: false`
  - GET `/:id`: detail với `hasViewPermission: false`
  - POST `/`: upsert với `{ hasCreatePermission: false, hasUpdatePermission: false }` (user chỉ thao tác trên key của chính mình, được kiểm soát trong service).
  - POST `/del`: revokeMany với `{ hasDeletePermission: false }` (chỉ xóa key của mình).

### 4. Cách phân quyền hiện tại

- Xác thực:
  - `authCheck` (middleware) chịu trách nhiệm:
    - Verify access token.
    - Load `currentUser` (id, permissions, roleIds, ...).
- Phân quyền:
  - Sử dụng `authorize` + các predicate:
    - `has('DOMAIN.ACTION')`
    - `isRole('ADMIN')`, `isSelf(...)`, `resourceAttr(...)` (có sẵn trong `authorization.service.ts`).
  - Phần admin gắn nhiều `authorize(has(...))` rõ ràng.
  - Phần user chủ yếu dựa trên logic trong service + `hasViewPermission/hasDeletePermission/...` để limit hành vi.

Vấn đề:

- Các controller admin/user **nhắc lại cùng một luồng** (list, detail, upsert, delete, revoke, ...) với khác biệt nhỏ:
  - Khác prefix (`/admin/*` vs non-`/admin`).
  - Khác policy (permission, role).
  - Khác vài flag/option truyền vào service.
- Mỗi khi thêm/sửa route cho 1 resource chung, phải:
  - Sửa code ở 2 nơi, dễ quên, dễ lệch behavior.
  - Làm tài liệu và test nhiều lần hơn.

---

## Yêu cầu thiết kế mới

- **Tái sử dụng tối đa logic route** (handler, DTO, call service).
- Vẫn **giữ 2 nhóm endpoint tách biệt**:
  - `/admin/...` cho admin.
  - `/...` cho end-user.
- **Quy tắc phân quyền tập trung, dễ đọc**:
  - Không rải logic phân quyền ở nhiều nơi khó theo dõi.
  - Dựa trên `authorize` / permission / role đã có.
- Dễ **mở rộng cho resource mới** (ví dụ: nếu mai thêm resource `X` dùng chung admin/user).

---

## Định hướng giải pháp

### Ý tưởng tổng quát (phương án mới – ưu tiên)

1. **Gộp controller admin + user thành một controller duy nhất cho mỗi resource** (sessions, api-keys, audit-logs, ...).
2. **Giữ typesafe tuyệt đối cho từng API**:
   - Mỗi route (`get`, `post`, url, DTO, response) vẫn được khai báo tường minh như hiện tại, không dùng "mode" động hay generic khó đọc.
3. **Check phân quyền ngay trong controller/handler**:
   - Truy cập trực tiếp `currentUser.permissions`, `currentUser.roleIds` để quyết định:
     - Hành vi “admin-like” (toàn hệ thống).
     - Hay hành vi “user self-scope” (chỉ xem/sửa data của chính mình).
   - Nếu không đủ quyền, ném `UnAuthErr(ErrCode.PermissionDenied)` ngay trong handler.
4. **Giảm số lượng router/public endpoint**:
   - Ưu tiên **dùng chung một URL** cho cả admin và user nếu có thể (ví dụ: `/sessions`, `/api-keys`, `/audit-logs`).
   - Phân biệt hành vi dựa trên quyền, không phải dựa trên URL `/admin/...` vs `/...`.

---

## Thiết kế chi tiết theo resource

### 1. Sessions

#### 1.1. Định nghĩa controller hợp nhất

Thay vì:

- `session-admin.controller.ts` (prefix `/admin/sessions`)
- `session-user.controller.ts` (prefix `/sessions`)

Chuyển sang **một controller** (gợi ý: `session.controller.ts`) với **một prefix duy nhất**:

- Prefix: `/sessions`
- Middleware:
  - `authCheck` (như cũ, để có `currentUser`).
- Routes:
  - GET `/` – list
  - POST `/revoke` – revoke

#### 1.2. Logic quyền trong handler (pseudocode)

```ts
const canSessionView = (user: ICurrentUser) =>
  user.permissions.includes("SESSION.VIEW");

const canSessionUpdate = (user: ICurrentUser) =>
  user.permissions.includes("SESSION.UPDATE");

export const sessionController = new Elysia({
  prefix: "/sessions",
  tags: [DOC_TAG.MISC], // có thể thêm tag ADMIN_SESSION trong swagger bằng cách khác nếu cần
})
  .use(authCheck)
  .get(
    "/",
    async ({ currentUser, query }) => {
      const isAdminLike = canSessionView(currentUser);

      const result = await sessionService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: isAdminLike,
      });

      return castToRes(result);
    },
    {
      query: SessionPaginateDto,
      response: {
        200: ResWrapper(SessionPagingResDto),
        ...authErrors,
      },
    }
  )
  .post(
    "/revoke",
    async ({ body, currentUser }) => {
      const ids = (body as typeof IdsDto.static).ids;

      const isAdminLike = canSessionUpdate(currentUser);

      if (isAdminLike) {
        await sessionService.revokeMany(ids);
        // ghi audit-log như hiện tại
      } else {
        await sessionService.revoke(currentUser.id, ids);
      }

      return castToRes(null);
    },
    {
      body: IdsDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    }
  );
```

Điểm quan trọng:

- **Typesafe**:
  - DTO, response, URL giống hệt pattern Elysia hiện tại.
  - Không có generic kiểu `mode` hay `buildRoutes` nên editor/IDE vẫn hiểu rõ từng route.
- **Phân quyền nằm ngay trong handler**:
  - Dễ đọc: chỉ cần mở 1 file controller là biết:
    - Người không có `SESSION.VIEW` chỉ xem được session của bản thân (do `hasViewPermission: false`).
    - Người có `SESSION.VIEW` có thể xem rộng hơn (tuỳ `sessionService.list` xử lý).
  - Dễ thay đổi chính sách sau này (ví dụ: thêm giới hạn theo role).

#### 1.3. Backward compatibility (tuỳ chọn)

- Nếu cần giữ lại `/admin/sessions` cho client cũ:
  - Tạo một controller rất mỏng `session-admin-legacy.controller.ts`:
    - Prefix `/admin/sessions`.
    - Handler chỉ **proxy** sang logic của `sessionController` hoặc share function handler.
  - Nhưng về lâu dài, khuyến khích client dùng `/sessions` chung.

### 2. API keys

#### 2.1. Định nghĩa controller hợp nhất

Hiện tại:

- `api-keys-admin.controller.ts` – `/admin/api-keys`
- `api-keys-user.controller.ts` – `/api-keys`

Phương án mới:

- Một controller (gợi ý: `api-keys.controller.ts`).
- Prefix: `/api-keys`.
- Middleware:
  - `authCheck`.
- Routes (giữ nguyên số lượng, nhưng gom code lại một nơi):
  - GET `/` – list
  - GET `/:id` – detail
  - POST `/` – upsert
  - POST `/del` – revokeMany

#### 2.2. Logic quyền trong handler

```ts
const canApiKeyView = (u: ICurrentUser) =>
  u.permissions.includes("API_KEY.VIEW");
const canApiKeyUpdate = (u: ICurrentUser) =>
  u.permissions.includes("API_KEY.UPDATE");
const canApiKeyDelete = (u: ICurrentUser) =>
  u.permissions.includes("API_KEY.DELETE");

export const apiKeysController = new Elysia({
  prefix: "/api-keys",
  tags: [DOC_TAG.USER_API_KEY, DOC_TAG.ADMIN_API_KEY], // có thể tách tag tuỳ swagger config
})
  .use(authCheck)
  .get(
    "/",
    async ({ query, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      query: ApiKeyListQueryDto,
      response: {
        200: ResWrapper(ApiKeyPaginatedResponseDto),
        ...authErrors,
      },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, currentUser }) => {
      const hasViewPermission = canApiKeyView(currentUser);

      const result = await apiKeyService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(ApiKeyDetailResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    }
  )
  .post(
    "/",
    async ({ body, query, currentUser }) => {
      const isAdminLike = canApiKeyUpdate(currentUser);

      const userId = isAdminLike
        ? // admin có thể chỉ định userId, user thường thì buộc là chính mình
          (query as { userId?: string } | undefined)?.userId ?? currentUser.id
        : currentUser.id;

      const result = await apiKeyService.upsert(
        {
          ...body,
          userId,
        },
        {
          currentUserId: currentUser.id,
          hasCreatePermission: isAdminLike,
          hasUpdatePermission: isAdminLike,
        }
      );

      return castToRes(result);
    },
    {
      query: t.Optional(
        t.Object({
          userId: t.Optional(t.String({ minLength: 1 })),
        })
      ),
      body: UpsertApiKeyDto,
      response: {
        200: ResWrapper(t.Union([ApiKeyCreatedResponseDto, ApiKeyResponseDto])),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    }
  )
  .post(
    "/del",
    async ({ body, currentUser }) => {
      const hasDeletePermission = canApiKeyDelete(currentUser);

      await apiKeyService.revokeMany(body.ids, {
        currentUserId: currentUser.id,
        hasDeletePermission,
      });

      return castToRes(null);
    },
    {
      body: IdsDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    }
  );
```

Ở đây:

- Typesafe vẫn được giữ nguyên vì:
  - Mỗi route là `.get("/"...)`, `.get("/:id"...)`, `.post("/"...`, `.post("/del"...` với DTO tường minh.
  - Không có factory/generic che mất type của route.
- Behavior hiện tại của admin/user:
  - Được quyết định bởi `hasViewPermission`, `hasCreatePermission`, `hasUpdatePermission`, `hasDeletePermission` giống như trước, chỉ khác là flag được tính trong controller thay vì tách ra 2 controller.

### 3. Audit logs

#### 3.1. Định nghĩa controller hợp nhất

Hiện tại:

- `audit-logs-admin.controller.ts` – `/admin/audit-logs`
- `audit-logs-user.controller.ts` – `/audit-logs`

Phương án mới:

- Một controller (gợi ý: `audit-logs.controller.ts`).
- Prefix: `/audit-logs`.
- Middleware:
  - `authCheck`.
- Routes:
  - GET `/` – list (cả admin và user dùng chung).
  - POST `/:id/resolve` – chỉ cho admin-like user (có quyền tương đương `AUDIT_LOG.VIEW` + có thể thêm quyền riêng nếu muốn).

#### 3.2. Logic quyền

```ts
const canAuditLogView = (u: ICurrentUser) =>
  u.permissions.includes("AUDIT_LOG.VIEW");

export const auditLogsController = new Elysia({
  prefix: "/audit-logs",
  tags: [DOC_TAG.MISC, DOC_TAG.ADMIN_AUDIT_LOG],
})
  .use(authCheck)
  .get(
    "/",
    async ({ currentUser, query }) => {
      const hasViewPermission = canAuditLogView(currentUser);

      const result = await auditLogsService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
      });

      return castToRes(result);
    },
    {
      query: AuditLogListQueryDto,
      response: {
        200: ResWrapper(AuditLogListResDto),
        ...authErrors,
      },
    }
  )
  .post(
    "/:id/resolve",
    async ({ params: { id }, currentUser }) => {
      if (!canAuditLogView(currentUser)) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }

      const result = await auditLogsService.resolveSecurityEvent(id, {
        currentUserId: currentUser.id,
      });

      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(
          t.Object({
            success: t.Boolean(),
          })
        ),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    }
  );
```

User bình thường:

- Có thể gọi GET `/audit-logs` nhưng do `hasViewPermission = false`, service sẽ chỉ trả về log liên quan tới chính user (như hiện tại).
  Admin:

- Có `AUDIT_LOG.VIEW` → `hasViewPermission = true` → thấy được nhiều hơn và có thể `resolve`.

---

## Tác động tới phân quyền, bảo mật và typesafe

### Phân quyền & bảo mật

- Quyền truy cập vẫn dựa trên:
  - `currentUser.permissions` (các key `SESSION.*`, `API_KEY.*`, `AUDIT_LOG.*`, ...).
  - Logic trong `sessionService`, `apiKeyService`, `auditLogsService` đã tồn tại.
- Việc gộp controller **không nới lỏng quyền**:
  - Nếu user không có permission tương ứng, controller sẽ:
    - Hoặc set flag `has*Permission` = `false` để service tự giới hạn.
    - Hoặc ném `PermissionDenied` nếu action đó chỉ dành cho admin (ví dụ `resolve` audit-log).

### Typesafe của API

- Mỗi API vẫn là một route Elysia độc lập:
  - URL, method, DTO, response type được khai báo tường minh.
  - Không dùng kiểu “builder” generic hay dynamic gây mất inference của TypeScript.
- Việc “gộp” chỉ là:
  - Gộp 2 file controller thành 1 file.
  - Dùng `if (hasPermission(...))` trong handler để quyết định flow.

---

## Ảnh hưởng tới router, tài liệu API và client

- **Số lượng route có thể giảm**:
  - Nếu chấp nhận xoá các endpoint `/admin/...` riêng, chỉ giữ:
    - `/sessions`, `/api-keys`, `/audit-logs`, ...
  - Nếu cần giữ backward compatibility:
    - Giữ `/admin/...` như thin-wrapper/proxy trong thời gian chuyển tiếp.
- Tài liệu API (Swagger/OpenAPI):
  - Có thể gắn nhiều `tags` cho cùng một route để hiển thị cả nhóm “Admin” và “User”.
  - Hoặc tuỳ chỉnh swagger để phân nhóm theo permission thay vì theo URL `/admin`.
- Client:
  - Frontend admin và user cùng gọi một đường dẫn, nhưng:
    - Admin sẽ thấy nhiều dữ liệu/hành động hơn nhờ permission.
    - User chỉ thấy phần được phép.

---

## Danh sách API đã dùng chung controller cho cả admin & user

Hiện tại các resource sau đã được gộp controller, dùng chung một nhóm endpoint cho cả admin và end-user, phân biệt hành vi bằng permission/role:

- **Sessions**

  - **Controller**: `session.controller.ts`
  - **Prefix**: `/sessions`
  - **Routes chính**:
    - `GET /sessions` – list session:
      - Admin-like (`SESSION.VIEW`): xem được rộng hơn toàn hệ thống.
      - User thường: chỉ xem session của chính mình.
    - `POST /sessions/revoke` – revoke session:
      - Admin-like (`SESSION.UPDATE`): `revokeMany(ids)` + ghi audit-log.
      - User thường: `revoke(currentUser.id, ids)`.

- **API keys**

  - **Controller**: `api-keys.controller.ts`
  - **Prefix**: `/api-keys`
  - **Routes chính**:
    - `GET /api-keys` – list:
      - Admin-like (`API_KEY.VIEW`): `hasViewPermission = true`.
      - User thường: `hasViewPermission = false`, chỉ thấy key của mình.
    - `GET /api-keys/:id` – detail:
      - Admin-like: xem được key của bất kỳ user theo policy hiện tại.
      - User thường: chỉ xem được key của mình.
    - `POST /api-keys` – upsert:
      - Admin-like (`API_KEY.UPDATE`): có thể chỉ định `userId` qua query.
      - User thường: luôn thao tác với `userId = currentUser.id`.
    - `POST /api-keys/del` – revokeMany:
      - Admin-like (`API_KEY.DELETE`): xóa nhiều key có phạm vi rộng.
      - User thường: chỉ xóa key của chính mình.

- **API key usage**

  - **Controller**: `api-key-usage.controller.ts`
  - **Prefix**: `/api-key-usage`
  - **Routes chính**:
    - `GET /api-key-usage` – list usage theo filter:
      - Admin-like (`API_KEY.VIEW`): `hasViewPermission = true`.
      - User thường: `hasViewPermission = false`, chỉ usage liên quan đến key của mình.
    - `GET /api-key-usage/stats` – thống kê usage:
      - Logic phân biệt admin/user tương tự route list.

- **Audit logs**

  - **Controller**: `audit-logs.controller.ts`
  - **Prefix**: `/audit-logs`
  - **Routes chính**:
    - `GET /audit-logs` – list:
      - Admin-like (`AUDIT_LOG.VIEW`): `hasViewPermission = true`, thấy log rộng hơn.
      - User thường: `hasViewPermission = false`, chỉ log liên quan đến chính mình.
    - `POST /audit-logs/:id/resolve` – resolve security event:
      - Chỉ cho phép nếu có `AUDIT_LOG.VIEW`, nếu không ném `PermissionDenied`.

- **Notifications**

  - **Controller**: `notification.controller.ts`
  - **Prefix**: `/notifications`
  - **Routes chính**:
    - `GET /notifications` – list:
      - Admin-like (`NOTIFICATION.VIEW`): `hasViewPermission = true`, có thể xem rộng hơn tuỳ logic service.
      - User thường: `hasViewPermission = false`, chỉ thông báo của chính mình.
    - `GET /notifications/:id` – detail:
      - Hành vi phân biệt tương tự route list qua `hasViewPermission`.
    - `POST /notifications` – tạo notification:
      - Chỉ cho phép nếu có `NOTIFICATION.UPDATE` (admin-like).
    - `POST /notifications/del` – xóa nhiều notification:
      - Quyền thực tế quyết định qua `NOTIFICATION.DELETE` + `hasViewPermission`.
    - `POST /notifications/mark-read` – đánh dấu đã đọc:
      - Admin-like có thể tác động rộng hơn, user thường chỉ với notification của mình.

- **IP whitelist**
  - **Controller**: `ip-whitelist.controller.ts`
  - **Prefix**: `/user-ip-whitelists`
  - **Routes chính**:
    - `GET /user-ip-whitelists` – list:
      - Admin-like (`IPWHITELIST.VIEW`): `hasViewPermission = true`.
      - User thường: `hasViewPermission = false`, chỉ whitelist của bản thân (theo logic service).
    - `GET /user-ip-whitelists/:id` – detail:
      - Phân biệt admin/user thông qua `hasViewPermission` như trên.
    - `POST /user-ip-whitelists` – upsert:
      - Admin-like (`IPWHITELIST.CREATE`/`IPWHITELIST.UPDATE`): có thể thao tác trên nhiều user theo logic service.
      - User thường: chỉ tạo/cập nhật whitelist của chính mình.
    - `POST /user-ip-whitelists/del` – xóa nhiều:
      - Admin-like (`IPWHITELIST.DELETE`): xóa whitelist rộng hơn.
      - User thường: chỉ xóa whitelist của chính mình.

---

## Lộ trình triển khai refactor (theo phương án gộp controller)

1. **Bước 1 – Sessions**:
   - Tạo `session.controller.ts` hợp nhất như mô tả.
   - Cập nhật `modules/index.ts` để export `sessionController` mới.
   - (Tuỳ chọn) giữ `session-admin.controller.ts` / `session-user.controller.ts` dưới dạng legacy trong thời gian chuyển tiếp, hoặc remove hẳn nếu không cần.
2. **Bước 2 – API keys**:
   - Gộp `api-keys-admin.controller.ts` + `api-keys-user.controller.ts` thành `api-keys.controller.ts`.
   - Đảm bảo logic flag permission và behavior tương đương.
3. **Bước 3 – Audit logs**:
   - Gộp `audit-logs-admin.controller.ts` + `audit-logs-user.controller.ts` thành `audit-logs.controller.ts`.
4. **Bước 4 – Mở rộng cho các resource khác có pattern tương tự**:
   - `api-key-usage`, `ip-whitelist`, `notification`, ...
   - Áp dụng cùng nguyên tắc: một controller, check quyền ngay trong handler.

---

## Kết luận

- Thay vì chia controller admin/user và dùng plugin chung, phương án mới là:
  - **Mỗi resource chỉ có một controller duy nhất**, chứa đầy đủ route dùng được cho cả admin và user.
  - **Phân quyền được kiểm tra trực tiếp trong handler**, dựa trên `currentUser` và permission/role, đảm bảo rõ ràng và chặt chẽ.
  - **Typesafe của API vẫn giữ nguyên**, vì mỗi route vẫn được khai báo tường minh với DTO/response cụ thể.
- Phương án này:
  - Giảm số lượng file controller, có thể giảm số lượng endpoint public (không cần tách `/admin/...` riêng cho các resource: sessions, api-keys, api-key-usage, audit-logs, notifications, ip-whitelist, ...).
  - Dễ bảo trì hơn (1 nơi duy nhất cho logic HTTP của resource).
  - Không phá vỡ kiến trúc dịch vụ và kiểm soát quyền hiện tại ở tầng service.
