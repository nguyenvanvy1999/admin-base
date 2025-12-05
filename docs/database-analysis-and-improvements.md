# Phân Tích Cấu Trúc Database và Đề Xuất Cải Thiện

## 📊 Tổng Quan Cấu Trúc Hiện Tại

### Các Model Chính

1. **Authentication & Authorization**
    - `User` - Quản lý người dùng với MFA, password reset, email verification
    - `AuthProvider` - OAuth providers (Google, Telegram, etc.)
    - `UserAuthProvider` - Liên kết user với external auth
    - `Role` - Vai trò với hierarchical support
    - `Permission` - Quyền hệ thống
    - `RolePermission` - Nhiều-nhiều giữa Role và Permission
    - `RolePlayer` - Gán role cho user với expiration

2. **Security**
    - `Session` - Quản lý phiên đăng nhập
    - `SecurityEvent` - Theo dõi sự kiện bảo mật
    - `UserIpWhitelist` - IP whitelist theo user
    - `AuditLog` - Audit trail đầy đủ

3. **System**
    - `Setting` - Cấu hình ứng dụng
    - `I18n` - Đa ngôn ngữ
    - `Proxy` - Cấu hình proxy

4. **Business Logic**
    - `Referral` - Chương trình giới thiệu

---

## ✅ Điểm Mạnh Hiện Tại

1. **Bảo mật tốt**: MFA, IP whitelist, security events, account lockout
2. **Audit trail đầy đủ**: AuditLog với traceId, correlationId
3. **RBAC linh hoạt**: Hierarchical roles, role expiration
4. **Multi-auth support**: OAuth providers
5. **Internationalization**: I18n support

---

## 🔍 Vấn Đề và Thiếu Sót Phát Hiện

### 1. **User Model - Thiếu Index và Constraints**

**Vấn đề:**

- Thiếu index cho `status`, `created`, `lastLoginAt` (queries thường xuyên)
- `refCode` có thể null nhưng unique - cần xử lý tốt hơn
- Không có soft delete (deletedAt)
- Thiếu email domain validation

**Đề xuất:**

```prisma
model User {
  // ... existing fields ...
  
  deletedAt DateTime? @map("deleted_at") // Soft delete
  
  @@index([status], name: "user_status_idx")
  @@index([created], name: "user_created_idx")
  @@index([lastLoginAt], name: "user_lastLoginAt_idx")
  @@index([refCode], name: "user_refCode_idx")
  @@index([emailVerified], name: "user_emailVerified_idx")
}
```

### 2. **Session Model - Thiếu Thông Tin Quan Trọng**

**Vấn đề:**

- Thiếu `userAgent` parsing (chỉ có device string)
- Không track location/geoIP
- Thiếu refresh token mechanism
- Không có session type (web, mobile, api)

**Đề xuất:**

```prisma
enum SessionType {
  web
  mobile
  api
  cli
}

model Session {
  // ... existing fields ...
  
  sessionType SessionType @default(web) @map("session_type")
  userAgent   String?     @map("user_agent")
  location    Json?       // { country, city, lat, lng }
  refreshToken String?    @unique @map("refresh_token")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  
  @@index([sessionType], name: "session_type_idx")
  @@index([refreshToken], name: "session_refreshToken_idx")
}
```

### 3. **Referral Model - Logic Chưa Hoàn Chỉnh**

**Vấn đề:**

- Chỉ có 1 referral per referrer (unique constraint sai)
- Thiếu tracking rewards/commissions
- Không có referral levels (multi-level)
- Thiếu analytics (conversion rate, etc.)

**Đề xuất:**

```prisma
enum ReferralRewardStatus {
  pending
  approved
  paid
  cancelled
}

model Referral {
  id         String         @id
  referrerId String         @map("referrer_id")
  referredId String         @map("referred_id")
  created    DateTime       @default(now())
  status     ReferralStatus @default(inactive)
  
  // Rewards tracking
  rewardAmount    Decimal?              @map("reward_amount")
  rewardStatus    ReferralRewardStatus? @map("reward_status")
  rewardPaidAt    DateTime?             @map("reward_paid_at")
  level           Int                   @default(1) // Multi-level support
  
  referrer User @relation("UserReferrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referred User @relation("UserReferred", fields: [referredId], references: [id], onDelete: Cascade)

  @@unique([referrerId, referredId], name: "referral_unique")
  @@index([referrerId], name: "referral_referrerId_idx")
  @@index([referredId], name: "referral_referredId_idx")
  @@index([status], name: "referral_status_idx")
  @@index([rewardStatus], name: "referral_rewardStatus_idx")
  @@map("referrals")
}
```

### 4. **Thiếu Notification System**

**Vấn đề:**

- Không có hệ thống thông báo
- User không thể quản lý preferences
- Không có email/SMS/Push notification tracking

**Đề xuất:**

```prisma
enum NotificationType {
  email
  sms
  push
  in_app
}

enum NotificationStatus {
  pending
  sent
  failed
  read
}

model NotificationTemplate {
  id          String           @id
  code        String           @unique
  name        String
  subject     String?
  body        String
  type        NotificationType
  variables   Json?            // Template variables
  enabled     Boolean          @default(true)
  created     DateTime         @default(now())
  modified    DateTime         @updatedAt

  notifications Notification[]

  @@map("notification_templates")
}

model Notification {
  id        String            @id
  userId    String            @map("user_id")
  templateId String?          @map("template_id")
  type      NotificationType
  status    NotificationStatus @default(pending)
  subject   String?
  content   String
  metadata  Json?
  
  readAt    DateTime?        @map("read_at")
  sentAt    DateTime?        @map("sent_at")
  failedAt  DateTime?        @map("failed_at")
  error     String?
  
  created   DateTime         @default(now())
  modified  DateTime         @updatedAt

  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  template NotificationTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  @@index([userId, status], name: "notification_user_status_idx")
  @@index([type], name: "notification_type_idx")
  @@index([created], name: "notification_created_idx")
  @@map("notifications")
}

// Add to User model
model User {
  // ... existing fields ...
  notifications Notification[]
  notificationPreferences Json? @map("notification_preferences")
}
```

### 5. **Thiếu Activity/Activity Log**

**Vấn đề:**

- AuditLog quá generic, không có user activity tracking
- Không track user actions (view, edit, delete)
- Thiếu activity feed

**Đề xuất:**

```prisma
enum ActivityType {
  login
  logout
  profile_update
  password_change
  role_assigned
  permission_granted
  data_created
  data_updated
  data_deleted
  file_uploaded
  file_downloaded
}

model Activity {
  id          String       @id
  userId      String?      @map("user_id")
  sessionId   String?      @map("session_id")
  activityType ActivityType @map("activity_type")
  entityType  String?      @map("entity_type") // "user", "role", etc.
  entityId    String?     @map("entity_id")
  description String
  metadata    Json?
  ip          String?
  userAgent   String?      @map("user_agent")
  created     DateTime     @default(now())

  user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  session Session? @relation(fields: [sessionId], references: [id], onDelete: SetNull)

  @@index([userId, created(sort: Desc)], name: "activity_user_created_idx")
  @@index([activityType], name: "activity_type_idx")
  @@index([entityType, entityId], name: "activity_entity_idx")
  @@index([created], name: "activity_created_idx")
  @@map("activities")
}

// Add relations
model User {
  // ... existing fields ...
  activities Activity[]
}

model Session {
  // ... existing fields ...
  activities Activity[]
}
```

### 6. **Thiếu File Management**

**Vấn đề:**

- Không có model quản lý files
- Không track file uploads/downloads
- Thiếu file versioning

**Đề xuất:**

```prisma
enum FileStatus {
  uploading
  active
  archived
  deleted
}

model File {
  id          String     @id
  userId      String?    @map("user_id")
  filename    String
  originalName String    @map("original_name")
  mimeType    String     @map("mime_type")
  size        BigInt
  path        String
  url         String?
  status      FileStatus @default(active)
  metadata    Json?      // { width, height, duration, etc. }
  
  // Security
  isPublic    Boolean    @default(false) @map("is_public")
  accessToken String?    @unique @map("access_token")
  
  // Versioning
  version     Int        @default(1)
  parentId    String?    @map("parent_id")
  parent      File?      @relation("FileVersions", fields: [parentId], references: [id], onDelete: SetNull)
  versions    File[]     @relation("FileVersions")
  
  created     DateTime   @default(now())
  modified    DateTime   @updatedAt
  deletedAt   DateTime?  @map("deleted_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId], name: "file_userId_idx")
  @@index([status], name: "file_status_idx")
  @@index([mimeType], name: "file_mimeType_idx")
  @@index([created], name: "file_created_idx")
  @@map("files")
}

// Add to User
model User {
  // ... existing fields ...
  files File[]
}
```

### 7. **Thiếu Rate Limiting & Throttling**

**Vấn đề:**

- Không track API rate limits
- Không có throttling per user/IP
- Thiếu DDoS protection tracking

**Đề xuất:**

```prisma
enum RateLimitType {
  api
  login
  password_reset
  email_verification
  file_upload
}

model RateLimit {
  id          String         @id
  identifier  String         // userId, IP, email, etc.
  type        RateLimitType
  count       Int            @default(0)
  limit       Int
  windowStart DateTime       @map("window_start")
  windowEnd   DateTime       @map("window_end")
  blocked     Boolean        @default(false)
  blockedUntil DateTime?     @map("blocked_until")
  created     DateTime       @default(now())
  modified    DateTime       @updatedAt

  @@unique([identifier, type, windowStart], name: "rate_limit_unique")
  @@index([identifier, type], name: "rate_limit_identifier_type_idx")
  @@index([blocked], name: "rate_limit_blocked_idx")
  @@index([windowEnd], name: "rate_limit_windowEnd_idx")
  @@map("rate_limits")
}
```

### 8. **Thiếu API Key Management**

**Đề xuất:**

```prisma
enum ApiKeyStatus {
  active
  revoked
  expired
}

model ApiKey {
  id          String        @id
  userId      String        @map("user_id")
  name        String
  key         String        @unique // Hashed
  keyPrefix   String        @map("key_prefix") // First 8 chars for display
  status      ApiKeyStatus  @default(active)
  lastUsedAt  DateTime?     @map("last_used_at")
  expiresAt   DateTime?     @map("expires_at")
  permissions Json?         // Scoped permissions
  ipWhitelist String[]?     @map("ip_whitelist")
  metadata    Json?
  created     DateTime      @default(now())
  modified    DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "api_key_userId_idx")
  @@index([status], name: "api_key_status_idx")
  @@index([keyPrefix], name: "api_key_prefix_idx")
  @@map("api_keys")
}

// Add to User
model User {
  // ... existing fields ...
  apiKeys ApiKey[]
}
```

### 9. **Cải Thiện SecurityEvent**

**Vấn đề:**

- Thiếu nhiều event types quan trọng
- Không có severity level
- Thiếu auto-response actions

**Đề xuất:**

```prisma
enum SecurityEventSeverity {
  low
  medium
  high
  critical
}

enum SecurityEventType {
  login_failed
  login_success
  password_changed
  password_reset_requested
  password_reset_completed
  mfa_enabled
  mfa_disabled
  mfa_verified
  mfa_failed
  account_locked
  account_unlocked
  suspicious_activity
  ip_changed
  device_changed
  permission_escalation
  api_key_created
  api_key_revoked
  data_exported
  bulk_operation
}

model SecurityEvent {
  id        String                @id
  userId    String?               @map("user_id")
  eventType SecurityEventType     @map("event_type")
  severity  SecurityEventSeverity @default(medium)
  ip        String?
  userAgent String?               @map("user_agent")
  location  Json?                 // GeoIP data
  metadata  Json?
  resolved  Boolean               @default(false)
  resolvedAt DateTime?            @map("resolved_at")
  resolvedBy String?              @map("resolved_by")
  created   DateTime              @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId], name: "security_event_userId_idx")
  @@index([eventType], name: "security_event_eventType_idx")
  @@index([severity], name: "security_event_severity_idx")
  @@index([resolved], name: "security_event_resolved_idx")
  @@index([created], name: "security_event_created_idx")
  @@map("security_events")
}
```

### 10. **Thiếu Backup & Recovery**

**Đề xuất:**

```prisma
enum BackupType {
  full
  incremental
  differential
}

enum BackupStatus {
  pending
  in_progress
  completed
  failed
}

model Backup {
  id          String       @id
  type        BackupType
  status      BackupStatus
  size        BigInt?
  path        String?
  metadata    Json?        // Tables, record counts, etc.
  startedAt   DateTime     @map("started_at")
  completedAt DateTime?    @map("completed_at")
  error       String?
  created     DateTime     @default(now())

  @@index([status], name: "backup_status_idx")
  @@index([type], name: "backup_type_idx")
  @@index([created], name: "backup_created_idx")
  @@map("backups")
}
```

### 11. **Cải Thiện Setting Model**

**Vấn đề:**

- Không có versioning
- Thiếu validation rules
- Không có category/grouping

**Đề xuất:**

```prisma
model Setting {
  id          String         @id
  key         String         @unique
  value       String
  description String?
  category    String?        // "security", "email", "payment", etc.
  isSecret    Boolean        @default(false) @map("is_secret")
  type        SettingDataType @default(string)
  validation  Json?          // Validation rules
  defaultValue String?       @map("default_value")
  version     Int            @default(1)
  modifiedBy  String?        @map("modified_by")
  created     DateTime       @default(now())
  modified    DateTime       @updatedAt

  @@index([key])
  @@index([category], name: "setting_category_idx")
  @@map("settings")
}
```

### 12. **Thiếu Webhook System**

**Đề xuất:**

```prisma
enum WebhookStatus {
  active
  paused
  disabled
}

enum WebhookEvent {
  user_created
  user_updated
  user_deleted
  role_assigned
  permission_granted
  security_event
  // ... more events
}

model Webhook {
  id          String        @id
  userId      String?       @map("user_id")
  url         String
  events      WebhookEvent[]
  status      WebhookStatus @default(active)
  secret      String?       // For signature verification
  headers     Json?         // Custom headers
  metadata    Json?
  lastTriggeredAt DateTime? @map("last_triggered_at")
  failureCount Int          @default(0) @map("failure_count")
  created     DateTime      @default(now())
  modified    DateTime      @updatedAt

  deliveries WebhookDelivery[]

  @@index([userId], name: "webhook_userId_idx")
  @@index([status], name: "webhook_status_idx")
  @@map("webhooks")
}

model WebhookDelivery {
  id        String   @id
  webhookId String   @map("webhook_id")
  event     String
  payload   Json
  status    Int      // HTTP status code
  response  String?
  duration  Int?     // milliseconds
  error     String?
  createdAt DateTime @default(now()) @map("created_at")

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId], name: "webhook_delivery_webhookId_idx")
  @@index([status], name: "webhook_delivery_status_idx")
  @@index([createdAt], name: "webhook_delivery_createdAt_idx")
  @@map("webhook_deliveries")
}
```

### 13. **Thiếu Data Export/Import**

**Đề xuất:**

```prisma
enum ExportStatus {
  pending
  processing
  completed
  failed
}

enum ExportFormat {
  json
  csv
  xlsx
  pdf
}

model DataExport {
  id          String       @id
  userId      String       @map("user_id")
  format      ExportFormat
  status      ExportStatus
  filters     Json?        // What data to export
  fileId      String?      @map("file_id")
  error       String?
  requestedAt DateTime     @default(now()) @map("requested_at")
  completedAt DateTime?    @map("completed_at")
  expiresAt   DateTime?    @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], name: "data_export_userId_idx")
  @@index([status], name: "data_export_status_idx")
  @@map("data_exports")
}

// Add to User
model User {
  // ... existing fields ...
  dataExports DataExport[]
}
```

### 14. **Cải Thiện I18n Model**

**Vấn đề:**

- Chỉ hỗ trợ 2 ngôn ngữ (en, vi)
- Không linh hoạt cho nhiều ngôn ngữ
- Thiếu namespace/grouping

**Đề xuất:**

```prisma
model I18n {
  id        String  @id
  key       String
  namespace String? @default("common")
  locale    String  // "en", "vi", "ja", etc.
  value     String
  metadata  Json?   // { context, plural, etc. }

  @@unique([key, locale, namespace], name: "i18n_unique")
  @@index([key])
  @@index([locale], name: "i18n_locale_idx")
  @@index([namespace], name: "i18n_namespace_idx")
  @@map("i18n")
}
```

### 15. **Thiếu Maintenance Mode**

**Đề xuất:**

```prisma
model MaintenanceWindow {
  id          String   @id
  title       String
  description String?
  startAt     DateTime @map("start_at")
  endAt       DateTime @map("end_at")
  enabled     Boolean  @default(true)
  allowAdmins Boolean  @default(true) @map("allow_admins")
  message     Json?    // Multi-language message
  created     DateTime @default(now())
  modified    DateTime @updatedAt

  @@index([startAt, endAt], name: "maintenance_window_time_idx")
  @@index([enabled], name: "maintenance_window_enabled_idx")
  @@map("maintenance_windows")
}
```

---

## 🚀 Tính Năng Mới Đề Xuất

### 1. **Two-Factor Authentication (2FA) Improvements**

- ✅ Đã có TOTP
- ➕ Thêm SMS 2FA
- ➕ Thêm Backup codes management UI
- ➕ Thêm Recovery codes rotation

### 2. **Advanced Analytics**

- User behavior tracking
- Feature usage statistics
- Performance metrics
- Conversion funnels

### 3. **Compliance & GDPR**

- Data retention policies
- Right to be forgotten (GDPR)
- Data portability
- Consent management

### 4. **Multi-tenancy Support**

- Organization/Workspace model
- Tenant isolation
- Shared resources

### 5. **Advanced Search**

- Full-text search indexes
- Search history
- Saved searches

### 6. **Workflow Engine**

- Approval workflows
- Task assignment
- Status transitions

### 7. **Integration Hub**

- Third-party integrations
- API marketplace
- Integration templates

---

## 📋 Priority Implementation Order

### Phase 1 (Critical - Security & Stability)

1. ✅ Fix Referral unique constraint
2. ✅ Add missing indexes
3. ✅ Improve Session model
4. ✅ Enhance SecurityEvent
5. ✅ Add Rate Limiting

### Phase 2 (Important - User Experience)

6. ✅ Notification System
7. ✅ Activity Log
8. ✅ File Management
9. ✅ API Key Management

### Phase 3 (Enhancement - Advanced Features)

10. ✅ Webhook System
11. ✅ Data Export/Import
12. ✅ Improved I18n
13. ✅ Backup System

### Phase 4 (Future - Nice to Have)

14. ✅ Maintenance Windows
15. ✅ Advanced Analytics
16. ✅ Multi-tenancy

---

## 🔧 Migration Notes

Khi implement các thay đổi:

1. **Backup database trước khi migrate**
2. **Tạo migration từng bước** (không làm tất cả cùng lúc)
3. **Test indexes** với EXPLAIN ANALYZE
4. **Monitor performance** sau khi thêm indexes
5. **Update Prisma client** sau mỗi migration
6. **Update TypeScript types** trong shared-types

---

## 📝 Notes

- Tất cả các model mới nên có `created` và `modified` timestamps
- Sử dụng `@updatedAt` cho `modified` field
- Thêm indexes cho các field thường query
- Sử dụng `onDelete: Cascade` cho các relation phụ thuộc
- Sử dụng `onDelete: SetNull` cho optional relations
- Thêm soft delete (`deletedAt`) cho các model quan trọng

