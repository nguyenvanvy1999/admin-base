# Kiến Trúc Hệ Thống

Tài liệu mô tả kiến trúc thực tế của monorepo `investment` sau khi tinh gọn các tài liệu cũ. Nội dung tập trung vào những gì đang chạy trong codebase (auth, admin tooling, misc utilities, frontend demo).

## 1. Tổng Quan Monorepo

```
investment/
├── server/                  # Bun + Elysia backend
│   ├── src/
│   │   ├── app/backend      # Entry points (HTTP + worker)
│   │   ├── config           # env, db, logger, cache, swagger...
│   │   ├── modules          # API modules (auth, admin, misc)
│   │   ├── service          # Business logic (auth, admin, misc, mail,...)
│   │   ├── share            # constants, errors, utils, types
│   │   ├── generated        # Prisma client (auto-gen, đừng sửa tay)
│   │   └── prisma           # schema & migrations
│   └── package.json         # Scripts riêng cho backend
├── client/                  # React + Vite frontend demo
│   ├── src/
│   │   ├── app              # Providers, layouts, pages, routes
│   │   ├── components       # Ant Design/Mantine wrappers
│   │   ├── hooks            # API hooks, utils hooks
│   │   ├── services         # API client wrappers
│   │   ├── styles           # Tokens, global CSS
│   │   └── types            # Frontend-only types
│   └── package.json
├── docs/                    # Tài liệu (file này nằm đây)
└── README.md
```

## 2. Backend Architecture (Bun + Elysia)

### 2.1 Module-first instead of controller-flat

Các endpoint được nhóm theo domain trong `server/src/modules/**`:

- `auth`: đăng nhập, MFA (TOTP + backup code), OAuth, OTP email
- `admin`: i18n keys, role/permission, session revocation, setting admin
- `misc`: health check, system info, time/version, captcha, file upload/down

Mỗi module xuất ra 1 hoặc nhiều Elysia plugin và được ghép trong `server/src/modules/index.ts`.

```typescript
// server/src/modules/auth/controllers/auth.controller.ts (trích)
export const authBaseController = new Elysia({ prefix: '/auth', tags: ['auth'] })
  .use(reqMeta)
  .post('/login', async ({ body, clientIp, userAgent }) => {
    const result = await authService.login({ ...body, clientIp, userAgent });
    return castToRes(result);
  }, { body: LoginRequestDto, response: { 200: ResWrapper(LoginResponseDto) } })
  .use(authCheck)
  .post('/logout', async ({ currentUser, clientIp, userAgent }) => {
    await authService.logout({
      userId: currentUser.id,
      sessionId: currentUser.sessionId,
      clientIp,
      userAgent,
    });
    return castToRes(null);
});
```

### 2.2 Service layer & dependency injection

Logic nằm trong `server/src/service/**`. Services là singleton, export trực tiếp thay vì thông qua macro tự động.

- Ví dụ: `authService` (đăng nhập, refresh token, session), `mfaSetupService`, `mfaBackupService`
- Admin: `roleService`, `permissionService`, `settingAdminService`
- Misc: `miscService` check health, `fileService` (S3/local), `captchaService`

Services DI bằng `.use(serviceInstance)` hoặc import trực tiếp khi service không cần request context.

```typescript
// server/src/service/auth/auth.service.ts (trích)
export const authService = {
  async login({ email, password, clientIp, userAgent }) {
    // Validate credential, tạo session, phát access/refresh token
  },
  async logout({ userId, sessionId, clientIp, userAgent }) {
    await sessionService.revoke(userId, [sessionId]);
    await auditLogService.append({ ... });
        },
};
```

### 2.3 Config & cross-cutting

- `config/db.ts`: Prisma client (PostgreSQL)
- `config/cache.ts`: Redis-based caches (login/register rate limit)
- `config/request.ts`: request metadata decorator (clientIp, userAgent)
- `service/auth/authorization`: policy-based guard (`authorize`, `has`, `allOf`, `isSelf`)
- `share/error`: custom error classes + DTO `ErrorResDto`
- `share/type`: reusable DTO builders `ResWrapper`, `IdDto`, etc.

### 2.4 Swagger & Eden Treaty

`config/swagger.ts` đăng ký schemas/tags; `DOC_TAG` trong `share/constant` dùng để gom endpoints (AUTH, MFA, ADMIN_ROLE, MISC,...). Eden Treaty trên frontend tiêu thụ trực tiếp schema của app (qua `@server` alias).

### 2.5 Background / infra services

- `service/backend/*`: cluster run, graceful shutdown, worker service.
- `service/misc/graceful-shutdown.service.ts`: hooks `SIGTERM`.
- Queue/pubsub config đã sẵn `config/queue.ts`, `config/pubsub.ts` nhưng chưa sử dụng rộng rãi.

## 3. Frontend Architecture (React + Ant Design + Mantine helpers)

### 3.1 Cấu trúc chính

- `src/app/pages`: `HomePage`, `WorkspacePage`, `SettingsPage`, `ErrorPage`
- `src/app/providers`: `AuthProvider`, `ThemeModeProvider`, `AppProvider`
- `src/app/routes.tsx`: định nghĩa `createHashRouter` (bắt buộc Hash Router)
- `src/components/common`: wrappers chung (`AppTable`, `AppForm`, `PageHeader`, `AppDrawer`, `AppModal`)
- `src/hooks/api`: hooks gọi API thực tế (ví dụ `useHealthcheck` -> `/misc/health`)
- `src/hooks/useNotify`: wrapper Ant Design notification

### 3.2 API client

Hiện frontend chưa dùng Eden Treaty; thay vào đó các service thủ công tại `client/src/services/api/*.ts`.

```typescript
// client/src/services/api/healthcheck.service.ts
export async function getHealthcheck() {
  const res = await fetch(`${API_BASE_URL}/misc/health`);
  if (!res.ok) throw new Error('Healthcheck failed');
  return res.json();
}
```

Hooks tiêu thụ service:

```typescript
// client/src/hooks/api/useHealthcheck.ts
export function useHealthcheck() {
  return useQuery({
    queryKey: ['healthcheck'],
    queryFn: getHealthcheck,
  });
}
```

### 3.3 UI patterns

- `AppTable`: bọc `antd` bảng + search, align với `PageHeader`
- `AppForm`: bọc `Form` + `Form.Item` với generic type
- `AppDrawer` + `AppModal`: unify prop naming, handing footer actions
- `HomePage`: demo Dashboard (mock data + healthcheck status)
- `WorkspacePage`: minh hoạ Drawer workflow
- `SettingsPage`: form pattern (InputNumber, Select, Switch)

### 3.4 State & i18n

- Global store chưa cần nên chỉ dùng hook + React state
- i18n config trong `client/src/i18n.ts` (vi/en) dùng `react-i18next`
- Notify pattern `useNotify()` -> `notification.success`/`error`

### 3.5 Routing & auth guard

`createHashRouter` trong `src/app/routes.tsx`, layout `MainLayout` đảm nhiệm header, skeleton. Auth logic đang ở mức demo: `AuthProvider` cung cấp context, khi kết nối backend thực tế có thể cắm token logic tại đây.

## 4. Luồng API hiện tại

1. Frontend `useHealthcheck` -> GET `/misc/health`
2. Auth flows:
   - `POST /auth/login` (rate limit theo IP + email)
   - `POST /auth/login/mfa/confirm`
   - `POST /auth/refresh-token`
   - `POST /auth/logout`, `/auth/logout/all`
   - `POST /auth/user/register` + `/auth/user/verify-account`
   - OTP service `/auth/otp`
3. MFA:
   - `/auth/mfa/setup/request`, `/setup/confirm`, `/disable`, `/status`
   - `/auth/mfa/backup-codes/generate|verify|remaining`
4. Admin:
   - `/admin/i18n`, `/admin/roles`, `/admin/settings`, `/admin/sessions`
   - Authorization dựa trên policy `authorize(has('ROLE.VIEW'))`...
5. Misc:
   - `/misc/system-info`, `/misc/time`, `/misc/version`
   - `/misc/captcha/generate|verify`
   - `/misc/file/upload`, `/misc/file/download/:filename`, `/misc/file/storage`

## 5. Nguyên tắc thiết kế

1. **Domain module hóa**: mọi endpoint phải nằm trong module tương ứng, tránh tạo controller rời rạc.
2. **Service đơn nhiệm**: service chỉ giải quyết một domain (auth, mfa, session, file, misc...). Không trộn logic admin + auth chung 1 file.
3. **Policy-based authorization**: thay vì hardcode role, dùng `authorize(has('PERMISSION'))` để dễ mở rộng.
4. **DTO & type reuse**: schema định nghĩa trong `modules/*/dtos`, tận dụng `ResWrapper` để đảm bảo swagger + Eden Treaty đồng bộ.
5. **Frontend Hash Router**: do backend serve static tại `/`, Browser Router sẽ đè path -> cấm.
6. **Mock-first UI**: các trang demo (Dashboard, Workspace) dùng mock data để minh hoạ layout; khi có API mới chỉ cần thay data source.

## 6. Checklist khi thêm module mới

1. Backend
   - Tạo DTO trong `modules/<domain>/dtos`
   - Viết service mới trong `service/<domain>`
   - Tạo controller group và thêm vào `modules/index.ts`
   - Cập nhật `DOC_TAG` + swagger detail nếu cần
   - Viết unit test (đặt tại `server/test/unit/<domain>`)
2. Frontend
   - Khai báo service/hook gọi API mới
   - Tạo component/page nằm trong `app/pages` hoặc `features/<domain>`
   - Sử dụng `AppForm`, `AppTable`, `PageHeader` để giữ UI đồng nhất
3. Document
   - Update `docs/technology/architecture.md` nếu cấu trúc thay đổi
   - Bổ sung endpoint vào `docs/user-guide/api-reference.md`

Tài liệu này sẽ được cập nhật khi có module/tính năng mới được merge vào codebase. Nếu kiến trúc thay đổi đáng kể (ví dụ thêm module tài chính), hãy mô tả chi tiết thay đổi và liên kết tới PR tương ứng.

