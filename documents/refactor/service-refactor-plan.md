# Kế hoạch Refactor Service Layer

## Mục tiêu

1. **Chia module khoa học hơn, dễ mở rộng**: Tổ chức lại các service theo domain logic rõ ràng
2. **Không chia file quá nhỏ**: Gộp các file nhỏ liên quan vào cùng một module để tránh phình dự án
3. **Di chuyển code về đúng module**: Đảm bảo mỗi service nằm đúng vị trí theo chức năng

## Phân tích cấu trúc hiện tại

### Vấn đề hiện tại

1. **Service `auth/` có quá nhiều file nhỏ (20 files)**:
   - `auth.service.ts` - service chính
   - `auth-util.service.ts` - utilities
   - `session.service.ts` - quản lý session
   - `password.service.ts` - xử lý password
   - `password-validation.service.ts` - validate password
   - `otp.service.ts` - OTP
   - `otp-controller.service.ts` - OTP controller
   - `mfa-setup.service.ts` - MFA setup
   - `mfa-verification.service.ts` - MFA verification
   - `mfa-backup.service.ts` - MFA backup codes
   - `mfa-util.service.ts` - MFA utilities
   - `backup-code.util.ts` - backup code utils
   - `oauth.service.ts` - OAuth
   - `encrypt.service.ts` - encryption
   - `security-monitor.service.ts` - security monitoring
   - `auth.middleware.ts` - middleware
   - `authorization/` - authorization logic (3 files)

2. **Service `misc/` có nhiều file không liên quan (11 files)**:
   - `audit-log.service.ts` - nên thuộc về audit-logs module
   - `security-event.service.ts` - nên thuộc về security-events module
   - `setting.service.ts` - nên thuộc về settings module
   - `captcha.service.ts` - có thể gộp vào auth
   - `geoip.service.ts` - utility
   - `misc.service.ts` - system info, health check
   - `graceful-shutdown.service.ts` - infrastructure
   - `http-logger.middleware.ts` - middleware
   - `idempotency.service.ts` - utility
   - `locking.service.ts` - utility
   - `seed.service.ts` - development tool

3. **Các service đơn lẻ có thể gộp lại**:
   - `audit-logs.service.ts` - chỉ có list, có thể gộp với audit-log.service.ts trong misc
   - `permissions.service.ts` - rất nhỏ, có thể gộp vào roles
   - `notification-templates.service.ts` - có thể gộp với notifications

4. **Các service backend/worker**:
   - `backend/` - 4 files về backend management
   - `worker/` - 4 files về worker management
   - Có thể gộp thành một module infrastructure

## Cấu trúc mới đề xuất

### 1. Module Authentication & Authorization (`auth/`)

**Mục đích**: Tất cả logic liên quan đến authentication, authorization, MFA, OTP, password

**Cấu trúc**:
```
auth/
├── auth.service.ts              # Service chính: login, register, logout, refresh token
├── password.service.ts           # Password: hash, compare, create, validation
├── session.service.ts            # Session management: create, revoke, list
├── mfa.service.ts                # Gộp: mfa-setup, mfa-verification, mfa-backup, mfa-util
├── otp.service.ts                # Gộp: otp.service + otp-controller.service
├── oauth.service.ts              # OAuth flows
├── encrypt.service.ts            # Encryption utilities
├── security-monitor.service.ts   # Security monitoring
├── auth-util.service.ts          # Auth utilities (token, user utils)
├── middleware.ts                 # Gộp: auth.middleware + authorization middleware
└── types.ts                      # Shared types cho auth module
```

**Lý do**:
- Gộp các file MFA nhỏ thành một file `mfa.service.ts` (setup, verification, backup, util)
- Gộp OTP service và controller thành một file
- Gộp middleware vào một file
- Giữ lại các service riêng cho password, session vì chúng đủ lớn và có logic riêng

### 2. Module Users (`users/`)

**Mục đích**: Quản lý users (admin operations)

**Cấu trúc**:
```
users/
├── users.service.ts              # Giữ nguyên (đã đủ lớn và rõ ràng)
└── index.ts
```

**Lý do**: Service này đã được tổ chức tốt, không cần thay đổi

### 3. Module Roles & Permissions (`roles/`)

**Mục đích**: Quản lý roles và permissions

**Cấu trúc**:
```
roles/
├── roles.service.ts              # Gộp: roles.service.ts + permissions.service.ts
└── index.ts
```

**Lý do**: 
- `permissions.service.ts` chỉ có 1 method `list()`, quá nhỏ
- Gộp vào `roles.service.ts` vì permissions luôn đi kèm với roles

### 4. Module Audit Logs (`audit-logs/`)

**Mục đích**: Quản lý audit logs

**Cấu trúc**:
```
audit-logs/
├── audit-logs.service.ts         # Gộp: audit-logs.service.ts + misc/audit-log.service.ts
└── index.ts
```

**Lý do**:
- `audit-logs.service.ts` (trong root) chỉ có `list()`
- `audit-log.service.ts` (trong misc) có `push()`, `pushBatch()`, `mapData()`
- Hai service này bổ sung cho nhau, nên gộp lại

### 5. Module Security Events (`security-events/`)

**Mục đích**: Quản lý security events

**Cấu trúc**:
```
security-events/
├── security-events.service.ts    # Di chuyển từ misc/security-event.service.ts
└── index.ts
```

**Lý do**: Service này không thuộc về misc, nên di chuyển về đúng module

### 6. Module Settings (`settings/`)

**Mục đích**: Quản lý system settings

**Cấu trúc**:
```
settings/
├── settings.service.ts           # Gộp: settings.service.ts + misc/setting.service.ts
└── index.ts
```

**Lý do**:
- `settings.service.ts` (root) có `list()`, `update()`, `export()`, `import()`
- `setting.service.ts` (misc) có validation, getValue logic
- Hai service này bổ sung cho nhau

### 7. Module Notifications (`notifications/`)

**Mục đích**: Quản lý notifications và templates

**Cấu trúc**:
```
notifications/
├── notifications.service.ts      # Giữ nguyên
├── notification-templates.service.ts  # Di chuyển từ root
└── index.ts
```

**Lý do**: Templates và notifications liên quan chặt chẽ, nên đặt cùng module

### 8. Module I18n (`i18n/`)

**Mục đích**: Quản lý internationalization

**Cấu trúc**:
```
i18n/
├── i18n.service.ts               # Giữ nguyên
└── index.ts
```

**Lý do**: Service này đã được tổ chức tốt

### 9. Module File Management (`file/`)

**Mục đích**: Quản lý file upload/download

**Cấu trúc**:
```
file/
├── file.service.ts               # Giữ nguyên
├── storage.ts                    # Giữ nguyên
└── index.ts
```

**Lý do**: Đã được tổ chức tốt

### 10. Module Rate Limiting (`rate-limit/`)

**Mục đích**: Rate limiting

**Cấu trúc**:
```
rate-limit/
├── rate-limit.service.ts         # Giữ nguyên
├── rate-limit-config.service.ts  # Giữ nguyên
├── auth-rate-limit.config.ts    # Giữ nguyên
└── index.ts
```

**Lý do**: Đã được tổ chức tốt

### 11. Module IP Whitelist (`user-ip-whitelist/`)

**Mục đích**: IP whitelist management

**Cấu trúc**:
```
user-ip-whitelist/
├── user-ip-whitelist.service.ts  # Giữ nguyên
├── user-ip-whitelist.middleware.ts # Giữ nguyên
└── index.ts
```

**Lý do**: Đã được tổ chức tốt

### 12. Module Infrastructure (`infrastructure/`)

**Mục đích**: System infrastructure, health checks, workers, backend management

**Cấu trúc**:
```
infrastructure/
├── system.service.ts             # Gộp: misc/misc.service.ts (health check, system info)
├── backend.service.ts            # Gộp: backend/*.service.ts (4 files)
├── worker.service.ts             # Gộp: worker/*.service.ts (4 files)
├── graceful-shutdown.service.ts  # Di chuyển từ misc
└── index.ts
```

**Lý do**:
- Gộp các file backend nhỏ thành một service
- Gộp các file worker nhỏ thành một service
- System service cho health checks và system info
- Graceful shutdown là infrastructure concern

### 13. Module Utilities (`utils/`)

**Mục đích**: Shared utilities

**Cấu trúc**:
```
utils/
├── crud-helpers.util.ts          # Giữ nguyên
├── list-query.util.ts            # Giữ nguyên
├── permission.util.ts             # Giữ nguyên
├── search.util.ts                # Giữ nguyên
├── geoip.util.ts                 # Di chuyển từ misc/geoip.service.ts
├── idempotency.util.ts           # Di chuyển từ misc/idempotency.service.ts
├── locking.util.ts               # Di chuyển từ misc/locking.service.ts
└── index.ts
```

**Lý do**:
- Các utility này không phải service, nên đổi tên từ `.service.ts` thành `.util.ts`
- Đặt trong utils module để dễ tái sử dụng

### 14. Module Mail (`mail/`)

**Mục đích**: Email services

**Cấu trúc**:
```
mail/
├── email.service.tsx              # Giữ nguyên
├── emails/                        # Giữ nguyên
│   └── otp.tsx
└── index.ts
```

**Lý do**: Đã được tổ chức tốt

### 15. Module Development Tools (`dev/`)

**Mục đích**: Development và testing tools

**Cấu trúc**:
```
dev/
├── seed.service.ts                # Di chuyển từ misc/seed.service.ts
└── index.ts
```

**Lý do**: Seed service chỉ dùng trong development, nên tách riêng

### 16. Middleware riêng

**Mục đích**: Shared middleware

**Cấu trúc**:
```
middleware/
├── http-logger.middleware.ts     # Di chuyển từ misc/http-logger.middleware.ts
└── index.ts
```

**Lý do**: Middleware không phải service, nên tách riêng

## Tóm tắt thay đổi

### Files cần gộp

1. **auth/**:
   - `mfa-setup.service.ts` + `mfa-verification.service.ts` + `mfa-backup.service.ts` + `mfa-util.service.ts` + `backup-code.util.ts` → `mfa.service.ts`
   - `otp.service.ts` + `otp-controller.service.ts` → `otp.service.ts`
   - `auth.middleware.ts` + `authorization/*.ts` → `middleware.ts`

2. **roles/**:
   - `permissions.service.ts` → gộp vào `roles.service.ts`

3. **audit-logs/**:
   - `audit-logs.service.ts` + `misc/audit-log.service.ts` → `audit-logs.service.ts`

4. **settings/**:
   - `settings.service.ts` + `misc/setting.service.ts` → `settings.service.ts`

5. **infrastructure/**:
   - `backend/*.service.ts` (4 files) → `backend.service.ts`
   - `worker/*.service.ts` (4 files) → `worker.service.ts`
   - `misc/misc.service.ts` → `system.service.ts`

### Files cần di chuyển

1. `misc/security-event.service.ts` → `security-events/security-events.service.ts`
2. `misc/setting.service.ts` → gộp vào `settings/settings.service.ts`
3. `misc/audit-log.service.ts` → gộp vào `audit-logs/audit-logs.service.ts`
4. `notification-templates.service.ts` → `notifications/notification-templates.service.ts`
5. `misc/geoip.service.ts` → `utils/geoip.util.ts`
6. `misc/idempotency.service.ts` → `utils/idempotency.util.ts`
7. `misc/locking.service.ts` → `utils/locking.util.ts`
8. `misc/graceful-shutdown.service.ts` → `infrastructure/graceful-shutdown.service.ts`
9. `misc/seed.service.ts` → `dev/seed.service.ts`
10. `misc/http-logger.middleware.ts` → `middleware/http-logger.middleware.ts`

### Files cần xóa

1. `permissions.service.ts` (gộp vào roles)
2. Các file MFA riêng lẻ (gộp thành mfa.service.ts)
3. `otp-controller.service.ts` (gộp vào otp.service.ts)
4. Các file backend riêng lẻ (gộp thành backend.service.ts)
5. Các file worker riêng lẻ (gộp thành worker.service.ts)

## Lợi ích

1. **Giảm số lượng file**: Từ ~50+ files xuống ~30 files
2. **Tổ chức rõ ràng hơn**: Mỗi module có trách nhiệm rõ ràng
3. **Dễ mở rộng**: Thêm tính năng mới vào đúng module
4. **Dễ maintain**: Code liên quan được gộp lại, dễ tìm và sửa
5. **Giảm circular dependencies**: Code được tổ chức theo domain logic

## Kế hoạch thực hiện

### Phase 1: Chuẩn bị
1. Tạo cấu trúc thư mục mới
2. Backup code hiện tại
3. Tạo TODO list chi tiết

### Phase 2: Refactor từng module
1. **Auth module**: Gộp MFA, OTP, middleware
2. **Roles module**: Gộp permissions
3. **Audit logs module**: Gộp audit log services
4. **Settings module**: Gộp setting services
5. **Security events module**: Di chuyển từ misc
6. **Notifications module**: Di chuyển templates
7. **Infrastructure module**: Gộp backend, worker, system
8. **Utils module**: Di chuyển utilities
9. **Dev module**: Di chuyển seed
10. **Middleware**: Tách middleware riêng

### Phase 3: Update imports
1. Update tất cả imports trong modules
2. Update imports trong controllers
3. Update imports trong tests

### Phase 4: Testing
1. Chạy unit tests
2. Chạy integration tests
3. Manual testing

### Phase 5: Cleanup
1. Xóa files cũ
2. Update documentation
3. Code review

## Lưu ý

1. **Không thay đổi logic**: Chỉ refactor cấu trúc, không thay đổi business logic
2. **Giữ nguyên dependencies**: Không thay đổi cách inject dependencies
3. **Backward compatibility**: Đảm bảo exports vẫn tương thích nếu có thể
4. **Test thoroughly**: Test kỹ sau mỗi phase




