# Backend (server/) — Hiện trạng, điểm cần cải tiến & đề xuất bổ sung (Tài liệu hợp nhất)

> Tài liệu này **gộp và refactor** từ:
>
> - `documents/features/backend-current-features-review.md`
> - `documents/features/roadmap.md`
> - `documents/features/suggestions.md`
>
> Phạm vi chính: thư mục `server/` (Bun + Elysia + Prisma + Redis + BullMQ) và các tài liệu tính năng liên quan.
>
> Mục tiêu:
>
> 1.  Mô tả **cụ thể, chính xác** các chức năng backend đang có (theo module/API-level và theo năng lực NFR).
> 2.  Chỉ ra **gaps/điểm cần cải tiến** (đúng với hiện trạng code & vận hành).
> 3.  Đề xuất **các chức năng cần bổ sung** theo ưu tiên, có “phạm vi implement” rõ ràng.
> 4.  Đưa ra **roadmap** triển khai (ngắn hạn → dài hạn), kèm dependency và rủi ro.

---

## 0) Lưu ý về mức độ “chính xác”

- Nội dung “Hiện trạng” trong tài liệu này được tổng hợp từ:
  - cấu trúc repo và tên controller/module;
  - mô tả đã rà soát nhanh trước đó;
  - và các tài liệu spec liên quan trong `documents/features/*`.
- Một số mục trong các tài liệu cũ có thể **khẳng định “đã hoàn chỉnh”** (ví dụ: OAuth providers, security monitoring, referral…) nhưng **không có trong bản rà soát API-level hiện tại**.
  - Vì vậy, tài liệu hợp nhất này phân loại rõ:
    - **(Đã thấy trong code/controller)**: có endpoint/controller/module cụ thể.
    - **(Có trong spec/tài liệu)**: đã có mô tả, cần đối chiếu code để xác nhận.
    - **(Đề xuất bổ sung)**: chưa thấy/hoặc chưa chắc có.

Nếu bạn muốn “đóng dấu 100% accurate theo code”, bước tiếp theo nên là: trích xuất danh sách routes từ swagger hoặc đọc trực tiếp từng `*.controller.ts` và đối chiếu từng endpoint (đặc biệt khi Redis down làm không thể dump `app.routes`).

---

## 1) Tổng quan kiến trúc backend

### 1.1. Công nghệ & thành phần chính

- **Runtime/Build**: Bun (scripts trong `server/package.json`).
- **HTTP framework**: Elysia (`elysia@1.4.x`).
- **ORM/DB**: Prisma (`@prisma/client`, `prisma@7.x`), DB dự kiến PostgreSQL.
- **Redis**:
  - dùng cho cache/rate limit/OTP/session hoặc các use-case khác tuỳ module;
  - dùng cho **BullMQ** (queue) và **Bull Board** (UI quản trị).
- **Security middleware** (đang/hoặc dự kiến dùng):
  - `elysia-rate-limit` (global rate limit và/hoặc per-route)
  - `ipWhitelistMiddleware()`
  - `elysia-xss`
  - `elysiajs-helmet` (có dependency — cần kiểm tra thực tế có `.use()` trong pipeline không)
- **Observability**:
  - OpenTelemetry (OTLP exporter) + server timing (chỉ bật ở DEV theo mô tả hiện tại).
- **Docs**: Swagger UI (`swaggerConfig()`), mô tả route bằng `detail` + schema DTO.
- **Logging**: logtape + HTTP log middleware theo env.

### 1.2. Bootstrap pipeline & thứ tự mount controller

File chính: `server/src/services/infrastructure/backend.service.ts`.

Theo `.group(env.API_PREFIX, ...)`:

1. `cors()`
2. `elysiaXSS({ as: 'global' })`
3. (DEV) `opentelemetry(...)` + `serverTiming()`
4. `reqMeta` (gắn metadata request)
5. `ipWhitelistMiddleware()`
6. `apiKeyUsageLoggerMiddleware` (log usage API key)
7. Mount controllers theo thứ tự:
   - `authController`
   - `userAuthController`
   - `otpController`
   - `miscController`
   - `captchaController`
   - `fileController`
   - `oauthController`
   - `mfaController`
   - `mfaBackupController`
   - `sessionController`
   - `notificationController`
   - `ipWhitelistController`
   - `apiKeysController`
   - `apiKeyUsageController`
   - `usersAdminController`
   - `rolesAdminController`
   - `permissionsAdminController`
   - `auditLogsController`
   - `i18nAdminController`
   - `settingsAdminController`
   - `notificationTemplatesAdminController`
   - `rateLimitAdminController`

### 1.3. Vận hành quan trọng: Redis là “hard dependency” ở startup

Hiện trạng: server **luôn cố gắng connect Redis** trong `BackendServerService.createServer()`.

- Redis down → fail startup: `ECONNREFUSED 127.0.0.1:6379`.
- Ảnh hưởng mạnh tới dev/test và khả năng chạy “minimal mode” (phục vụ audit/docs).

**Cải tiến ưu tiên cao**: thêm chế độ degrade gracefully (xem mục 5.1).

### 1.4. Cluster mode

- Có `BackendClusterService` spawn nhiều worker (theo `navigator.hardwareConcurrency`) nếu `ENB_CLUSTER=true` và chạy trên Linux.
- Worker binary path mặc định `./backend_worker`.

---

## 2) Danh mục module backend hiện có (theo thư mục)

Nguồn: `server/src/modules/*` và `server/src/services/*`.

1. Auth (`modules/auth`)
2. OTP (`modules/otp`)
3. Captcha (`modules/captcha`)
4. OAuth (`modules/oauth`)
5. MFA + backup codes (`modules/mfa`)
6. Session management (`modules/session`)
7. Notification (`modules/notification`)
8. Notification templates admin (`modules/notification-templates`)
9. File management (`modules/file`)
10. IP whitelist (`modules/ip-whitelist`)
11. Rate limit admin (`modules/rate-limit`)
12. API keys (`modules/api-keys`)
13. API key usage (`modules/api-key-usage`)
14. Admin: Users (`modules/users`)
15. Admin: Roles (`modules/roles`)
16. Admin: Permissions (`modules/permissions`)
17. Audit logs (`modules/audit-logs`)
18. Settings admin (`modules/settings`)
19. I18n admin (`modules/i18n`)
20. Misc (`modules/misc`)

---

## 3) Chức năng theo nhóm (API-level, theo controller)

> Ghi chú: Do môi trường có thể không chạy Redis nên không dump được route runtime (`app.routes`). Danh sách dưới đây dựa theo controller/DTO.

### 3.1. Authentication & tài khoản

#### 3.1.1. Auth cơ bản — `/auth` (đã thấy trong code/controller)

File: `modules/auth/auth.controller.ts`.

- `POST /auth/login`
  - Đăng nhập email/password.
  - Có rate limit (auth-rate-limit).
- `POST /auth/login/mfa`
  - Đăng nhập có MFA (token + OTP).
- `POST /auth/login/mfa/confirm`
  - Xác nhận MFA kiểu “legacy API”.
- `POST /auth/refresh-token`
  - Cấp access token mới từ refresh token.
- `POST /auth/forgot-password`
  - Khởi tạo luồng quên mật khẩu.
- `POST /auth/change-password` (protected)
  - Đổi mật khẩu.
- `POST /auth/logout` (protected)
  - Logout thiết bị hiện tại.
- `POST /auth/logout/all` (protected)
  - Logout tất cả phiên.
- `GET /auth/me` (protected)
  - Lấy profile user hiện tại.

**Điểm mạnh**

- Phân nhóm route rõ: public + rate-limited + protected.
- Response wrapper chuẩn hoá: `ResWrapper`, `castToRes`, `authErrors`.

**Gaps/Cải tiến đề xuất**

- **Forgot password flow chưa “đủ 2 bước” trong docs**:
  - Thường cần: `forgot-password` (init) → `confirm/reset` (submit OTP/token + new password).
  - Cần xác nhận endpoint “confirm/reset” đang ở đâu (auth/otp/misc) và bổ sung tài liệu.
- **MFA login có 2 endpoint** (`/login/mfa` và `/login/mfa/confirm`):
  - Chuẩn hoá thành 1 flow rõ ràng, tránh legacy API gây nhầm.
- Chuẩn hoá error code + message để tránh leak nội bộ.

#### 3.1.2. Auth cho user đăng ký — `/auth/user` (đã thấy trong code/controller)

- `POST /auth/user/register`
  - Đăng ký tài khoản.
  - Trả `OtpResDto` (gợi ý: cần OTP verify).
- `POST /auth/user/verify-account`
  - Xác thực tài khoản bằng OTP + token.

**Gaps/Cải tiến đề xuất**

- `POST /auth/user/resend-verify-otp` (đề xuất)
  - Resend OTP verify account.
  - Rate limit mạnh + chống enumeration.
- Bổ sung (tuỳ định hướng): verify qua email link (magic link) song song OTP.

---

### 3.2. OTP (có module, cần đối chiếu endpoint cụ thể)

Module: `modules/otp/otp.controller.ts`.

**Kỳ vọng hiện trạng (cần xác nhận bằng code)**

- Tạo OTP token theo use-case.
- Verify OTP theo use-case.

**Chuẩn hoá cần bổ sung trong tài liệu**

- Danh sách OTP types/use-cases:
  - verify account
  - reset password
  - MFA challenge
  - (tuỳ hệ thống) change email, step-up auth, etc.
- TTL từng loại OTP.
- Số lần thử tối đa; lockout/backoff.
- Rate limit theo IP/user/email.
- Storage OTP: DB vs Redis; có hash OTP hay không.

---

### 3.3. Captcha (đã có controller)

Module: `modules/captcha/captcha.controller.ts`.

**Mục tiêu**: chống bot ở endpoint nhạy cảm (login/register/forgot-password).

**Cần làm rõ/chuẩn hoá**

- Cơ chế captcha (svg-captcha hay provider khác).
- Token captcha lưu ở đâu (Redis/DB/in-memory), TTL.
- Captcha được verify “inline” trong auth endpoints hay có endpoint verify riêng.

---

### 3.4. OAuth (đã có controller; provider cần xác nhận)

Module: `modules/oauth/oauth.controller.ts`.

**Hiện trạng suy đoán**

- Có OAuth login (ít nhất Google vì dependency `google-auth-library`).
- Một số tài liệu cũ nói “Google, Telegram, etc.” → cần đối chiếu code để xác nhận chính xác provider.

**Cải tiến đề xuất**

- Chuẩn hoá endpoints theo provider:
  - `/oauth/:provider/authorize`
  - `/oauth/:provider/callback`
- Làm rõ:
  - state/nonce
  - liên kết account (link/unlink)
  - xử lý “email trùng” khi OAuth login
  - refresh token provider (nếu cần)

---

### 3.5. MFA (2FA) + backup codes (đã có controller)

Module: `modules/mfa/*` (gồm `mfa.controller.ts`, `mfa-backup.controller.ts`).

**Hiện trạng (từ cấu trúc module)**

- Enable/disable MFA.
- Confirm TOTP.
- Quản lý backup codes.

**Cải tiến đề xuất**

- `POST /mfa/backup-codes/regenerate` (đề xuất) + invalidate codes cũ.
- “Step-up authentication”:
  - tắt MFA
  - đổi email
  - đổi password
  - rotate API key
  - đổi security settings
- “Revoke MFA sessions/trusted devices” (nếu có khái niệm trusted device).

---

### 3.6. Session management (đã thấy trong code/controller)

File: `modules/session/session.controller.ts`.

- `GET /sessions`
  - Nếu có permission `SESSION.VIEW` → xem theo kiểu “admin-like”.
  - Nếu không → chỉ xem session của chính mình.
- `POST /sessions/revoke`
  - Revoke nhiều session theo `IdsDto`.
  - Admin-like (`SESSION.UPDATE`) → `revokeMany` + push audit logs batch.
  - User thường → `sessionService.revoke(currentUser.id, ids)`.

**Cải tiến đề xuất**

- Khi user thường revoke session, cũng nên ghi audit log (ít nhất loại “security event”).
- `POST /sessions/revoke-all-except-current` (đề xuất).
- Bổ sung metadata thiết bị rõ ràng:
  - device name
  - lastSeenAt
  - ip/ua
  - location (nếu có)

---

### 3.7. Admin: Users — `/admin/users` (đã thấy trong code/controller)

File: `modules/users/users-admin.controller.ts`.

- Auth: `authCheck`.
- Permissions:
  - `USER.VIEW`
  - `USER.UPDATE`
  - `USER.RESET_MFA`

Endpoints:

- `GET /admin/users` (paginate/filter: `AdminUserListQueryDto`)
- `GET /admin/users/:id`
- `POST /admin/users` (create)
- `PATCH /admin/users/:id/roles`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/mfa/reset`
- `POST /admin/users/:id/mfa/disable`

**Cải tiến đề xuất (phổ biến & hữu ích)**

- Suspend/activate user:
  - `POST /admin/users/:id/suspend`
  - `POST /admin/users/:id/activate`
- Force reset password / gửi link set password.
- Verify/unverify email, change email (kèm step-up auth).
- Xem security events / login history theo user.

---

### 3.8. Admin: Roles — `/admin/roles` (đã thấy trong code/controller)

File: `modules/roles/roles-admin.controller.ts`.

- `GET /admin/roles` (ROLE.VIEW)
- `GET /admin/roles/:id` (ROLE.VIEW)
- `POST /admin/roles` (ROLE.UPDATE) — upsert
- `POST /admin/roles/del` (ROLE.UPDATE + ROLE.DELETE)

**Cải tiến đề xuất**

- Clone role.
- Validate “cannot delete system role”.
- Audit log rõ hơn cho role/permission changes.

---

### 3.9. Admin: Permissions — `/admin/permissions` (đã thấy trong code/controller)

File: `modules/permissions/permissions-admin.controller.ts`.

- `GET /admin/permissions?roleId=...` (yêu cầu `ROLE.VIEW`).

**Cải tiến đề xuất**

- Taxonomy/namespace permission:
  - `USER.*`, `ROLE.*`, `SESSION.*`, `API_KEY.*`, `AUDIT_LOG.*`, ...
- Endpoint sync/regenerate permissions từ code (nếu hệ thống tạo permission bằng code).

---

### 3.10. API Keys & API Key Usage

#### 3.10.1. API Keys — `/api-keys` (đã thấy trong code/controller)

File: `modules/api-keys/api-keys.controller.ts`.

- Protected (`authCheck`).
- Hành vi theo permission:
  - `API_KEY.VIEW`: xem “admin-like”
  - `API_KEY.UPDATE`: create/update cho user khác qua query `?userId=`
  - `API_KEY.DELETE`: xoá/revoke nhiều keys

Endpoints:

- `GET /api-keys` — list
- `GET /api-keys/:id` — detail
- `POST /api-keys` — upsert (tạo/cập nhật), admin-like có thể set `userId`
- `POST /api-keys/del` — revokeMany

**Cải tiến đề xuất (hardening)**

- Rotate key (zero-downtime):
  - `POST /api-keys/:id/rotate`
  - tạo key mới, set grace period, revoke key cũ sau.
- Scopes/abilities per key (nếu hiện tại mới dừng ở permission tổng quát).
- Expiration (`expireAt`) + `lastUsedAt`.
- IP restriction per key.
- Naming/label + tagging.

#### 3.10.2. API Key Usage — `/api-key-usage` (đã thấy trong code/controller)

File: `modules/api-key-usage/api-key-usage.controller.ts`.

- `GET /api-key-usage` — list usage logs
- `GET /api-key-usage/stats` — thống kê theo filter

**Hiện trạng quan trọng**

- Có middleware `apiKeyUsageLoggerMiddleware` chạy global để log usage.

**Cải tiến đề xuất**

- Chuẩn hoá fields log:
  - route, method, status
  - latency
  - userId/apiKeyId
  - ip, user-agent
  - requestId/correlationId
- Data lifecycle:
  - retention policy
  - partitioning (nếu volume lớn)
  - index theo `createdAt`, `apiKeyId`, `status`.

---

### 3.11. Audit logs (đã có module; cần mô tả schema thực tế)

Module: `modules/audit-logs/audit-logs.controller.ts`.

**Mục tiêu**

- Ghi nhận admin actions và/hoặc security events.

**Cải tiến đề xuất**

- Chuẩn hoá schema:
  - actor (userId/apiKey)
  - action
  - target (type/id)
  - requestId/correlationId
  - ip/ua
  - before/after (nếu phù hợp)
- Export audit logs.

---

### 3.12. IP whitelist (đã có controller + middleware)

Module: `modules/ip-whitelist/ip-whitelist.controller.ts` + `ipWhitelistMiddleware()`.

**Hiện trạng**

- Quản lý whitelist theo user/admin.
- Enforce ở middleware.

**Cải tiến đề xuất**

- CIDR support.
- IPv6.
- Temporary allow (TTL) + note/reason.
- Analytics: top blocked/allowed.

---

### 3.13. Rate limiting (đã có global + admin)

- Global: `elysia-rate-limit({ max: 300 })` (cần xác nhận cấu hình thực tế).
- Admin: `modules/rate-limit/rate-limit-admin.controller.ts`.
- Tài liệu spec liên quan:
  - `documents/features/rate-limiting/*`.

**Cải tiến đề xuất**

- Rate limit theo API key.
- Dashboard/endpoint thống kê top blocked ip/user.
- Degrade mode khi Redis down (DEV).

---

### 3.14. File management

Module: `modules/file/file.controller.ts`.

**Tín hiệu từ log**

- Startup warning: “Missing S3 configuration” → có thể hỗ trợ S3.

**Cải tiến đề xuất**

- Pre-signed URL (upload/download).
- Antivirus scanning / content-type sniffing.
- Lifecycle policy (auto delete).
- Quota per user/tenant.
- Access control public/private.

---

### 3.15. Notifications & templates

- `modules/notification/notification.controller.ts`
- `modules/notification-templates/notification-templates-admin.controller.ts`

**Hiện trạng**

- Có khả năng gửi email (nodemailer).
- Có template quản trị (admin).

**Cải tiến đề xuất**

- Đẩy gửi email sang background job (BullMQ) nếu chưa.
- Retry/backoff + DLQ.
- Multi-provider (SES/Sendgrid).
- Notification preferences + scheduling/batching.

---

### 3.16. I18n & Settings

- `modules/i18n/i18n-admin.controller.ts`
- `modules/settings/settings-admin.controller.ts`

**Cải tiến đề xuất**

- Versioning settings + audit.
- Cache settings (Redis) + invalidate.
- Export/import i18n keys.

---

### 3.17. Misc

Module: `modules/misc/controllers/misc.controller.ts`.

**Đề nghị chuẩn hoá**

- `/health` (liveness)
- `/ready` (readiness: db/redis)
- `/version`
- `/metrics` (Prometheus/OTel)

---

## 4) NFR (Non-functional requirements) & vận hành

### 4.1. Bảo mật

**Đang có**

- JWT/session + authorize theo permission.
- XSS protection.
- IP whitelist middleware.
- Rate limiting.

**Cải tiến ưu tiên**

- CSRF (nếu có flow dựa trên cookie).
- Security headers: xác nhận helmet đã được mount.
- Chuẩn hoá error response (không leak stack/db error).
- Step-up auth cho thao tác nhạy cảm.

### 4.2. Observability

**Đang có**

- OpenTelemetry + server timing (DEV).
- HTTP logging (tuỳ env).

**Cải tiến ưu tiên**

- Bật OTel ở staging/prod (sampling + cost control).
- Propagate `requestId/correlationId` xuyên suốt: logger → DB → queue.
- Chuẩn hoá log fields (service, env, requestId, userId/apiKeyId).

### 4.3. Background jobs

**Đang có**

- BullMQ + Bull Board.

**Cải tiến ưu tiên**

- Danh sách queue/job hiện có (tên queue, payload, retry).
- DLQ + alerting.
- Standard retry/backoff policy.

### 4.4. Reliability / Degrade gracefully

**Vấn đề hiện tại**: Redis down → backend không khởi động.

**Đề xuất**

- DEV/Test:
  - cho phép “no-redis mode”:
    - disable/tạm thay thế: rate limit, queue, cache
    - vẫn mount routes để dump swagger/routes
  - readiness endpoint báo rõ trạng thái redis.
- PROD:
  - Redis bắt buộc, nhưng thông báo lỗi rõ ràng + fail fast có chủ đích.

---

## 5) Gaps quan trọng & đề xuất bổ sung (theo nhóm)

### 5.1. API & DX (Developer Experience)

- **Dry-run / no-external-deps mode** (ưu tiên rất cao)

  - Mục tiêu: chạy app để generate swagger/routes mà không cần Redis/queue.
  - Đề xuất env flag: `DISABLE_REDIS=true` hoặc `APP_MODE=docs`.
  - Hành vi:
    - skip connect redis
    - skip rate-limit middleware hoặc chuyển sang in-memory
    - disable BullMQ/bull-board

- **OpenAPI completeness**
  - Tất cả endpoints phải có `detail`, request/response schema.
  - Chuẩn hoá error schema.

### 5.2. Auth/Security

- Resend verify OTP.
- Reset password confirm endpoint (nếu chưa có): `POST /auth/reset-password`.
- Device/session UX:
  - revoke all except current
  - đặt tên thiết bị
  - “trusted device” cho MFA
- Step-up auth cho thao tác nhạy cảm.

### 5.3. Admin/RBAC

- User suspend/ban.
- System roles (cannot delete) + role templates.
- Audit trail đầy đủ cho thao tác admin (đặc biệt: role/permission changes, api key rotates, user mfa reset).

### 5.4. Data lifecycle / Compliance

- Retention policy:
  - audit logs
  - api key usage logs
  - sessions (nếu lưu lâu)
- Export/import data (GDPR portability): xem roadmap mục 6.

### 5.5. Integrations

- Webhook system (event subscriptions + delivery tracking).
- API key scopes + per-key rate limiting.

---

## 6) Roadmap đề xuất (đã hợp nhất từ roadmap.md + suggestions.md, chỉnh theo hiện trạng)

> Các tài liệu cũ có timeline theo quý/sprint. Phần dưới đây giữ cấu trúc “phase/sprint”, nhưng điều chỉnh lại để:
>
> - Ưu tiên fix vận hành (Redis hard dependency) trước;
> - Tận dụng những thứ đã có (API key, audit log, worker);
> - Đảm bảo mỗi phase có deliverable rõ ràng.

### Phase 0 (Quick wins, 1–2 tuần): Ổn định dev/test & tài liệu

1. **No-Redis / Docs mode**

- Deliverable:
  - backend start được khi không có Redis (DEV)
  - swagger/routes export chạy được
  - readiness endpoint báo redis status

2. **Chuẩn hoá endpoints health/ready/version/metrics**

3. **Đối chiếu & “đóng dấu” danh sách endpoints thực tế**

- Generate swagger JSON và link vào docs.

### Phase 1 (4–6 tuần): Security hardening + API key nâng cấp

1. **Auth flows hoàn chỉnh**

- Forgot-password confirm/reset
- Resend OTP
- Chuẩn hoá MFA login flow (loại bỏ/đánh dấu legacy)

2. **Session improvements**

- revoke all except current
- audit log cho revoke của user thường

3. **API key hardening**

- rotate
- scopes
- expireAt/lastUsedAt
- per-key rate limiting (kết hợp rate limit module)

### Phase 2 (6–10 tuần): Activity/Audit/Export + nền tảng compliance

> Lưu ý: “Activity Log” trong tài liệu cũ khác “AuditLog”.

1. **Activity log** (nếu hiện chưa có) — auto-logging middleware

- Track: login/logout, CRUD quan trọng, security events
- Search/filter

2. **Data Export (trước), Data Import (sau)**

- Background job cho export/import file lớn
- History tracking

3. **Retention policies**

- audit log, api-key-usage

### Phase 3 (6–10 tuần): Integrations

1. **Webhook system**

- Webhook + delivery tracking
- Retry/backoff + DLQ
- Signature verification
- Webhook testing

2. **Notification nâng cao**

- queue hoá gửi email
- provider abstraction
- scheduling/batching

### Phase 4 (tuỳ nhu cầu): Analytics/Search/Backup/Maintenance/Multi-tenancy

- Advanced analytics dashboard
- Advanced search (Meilisearch/Elasticsearch)
- Backup & recovery
- Maintenance mode
- Multi-tenancy

---

## 7) Dependency & rủi ro

### Dependencies chính

- Data Export/Import phụ thuộc File management ổn định.
- Webhook phụ thuộc Worker (BullMQ) + retry/observability.
- Rate limiting theo API key phụ thuộc API key middleware chuẩn.

### Rủi ro & mitigation

- Performance impact (logging nhiều):
  - async logging
  - batch inserts
  - index tối ưu
- Storage cost (logs/exports):
  - retention policies
  - compression
- Complexity integrations (webhook):
  - phased rollout
  - comprehensive tests

---

## 8) Tài liệu liên quan trong repo

- Authentication:
  - `documents/features/authentication/*`
- Rate limiting:
  - `documents/features/rate-limiting/*`
- IP whitelist:
  - `documents/features/ip-whitelist/*`
- File management:
  - `documents/features/file-management/*`
- API key usage:
  - `documents/features/api-key-usage.md`
- Summary:
  - `documents/features/summary.md`

---

## 9) Gợi ý commit message (English)

- `docs(features): consolidate backend feature docs into a single detailed spec`
