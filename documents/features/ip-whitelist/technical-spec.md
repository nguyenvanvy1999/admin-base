# IP Whitelist - Technical Specification

## 📋 Mục Tiêu

Hệ thống IP whitelist hoàn chỉnh với:

- User IP whitelist management
- Middleware integration
- Cache layer for performance
- Permission-based access control
- Admin và user APIs
- Local IP bypass
- Empty list behavior

## 🏗️ Kiến Trúc

```
Controller Layer
    ├── ip-whitelist-admin.controller.ts (Admin API)
    └── ip-whitelist-user.controller.ts (User API)
    ↓
Service Layer
    └── UserIpWhitelistService (core IP whitelist logic)
    ↓
Middleware Layer
    └── userIpWhitelistMiddleware (IP validation)
    ↓
Data Layer
    ├── Database (Prisma - UserIpWhitelist model)
    └── Cache (IP whitelist caching)
```

## 📊 Database Schema

### UserIpWhitelist Model

```prisma
model UserIpWhitelist {
  id        String   @id
  userId    String
  ip        String
  note      String?
  created   DateTime @default(now())
  modified  DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_ip_whitelists")
}
```

**Fields:**

- `userId`: User ID
- `ip`: IP address (normalized, case-insensitive)
- `note`: Optional note/description

## 🔧 Service Layer

### UserIpWhitelistService

Core IP whitelist logic:

- `isIpAllowed()` - Kiểm tra IP có được phép không

  - Normalize IP
  - Check local IPs (always allowed)
  - Get user IP whitelist (from cache or database)
  - Check if IP is in whitelist
  - Return true nếu whitelist rỗng (allow all)

- `list()` - List IP whitelist với filtering

  - Permission-based filtering
  - Search support
  - Pagination

- `detail()` - Get IP whitelist detail

  - Permission check

- `upsert()` - Create hoặc update IP whitelist

  - Permission check
  - Invalidate cache

- `removeMany()` - Xóa nhiều IP whitelist
  - Permission check
  - Invalidate cache

**IP Normalization:**

```typescript
private normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}
```

**Local IP Check:**

```typescript
private isLocalIp(ip: string): boolean {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
}
```

**Cache Strategy:**

```typescript
// Get user IPs
const cached = await cache.get(userId);
if (cached) {
  return cached;
}

// Fetch from database
const ips = await db.userIpWhitelist.findMany({
  where: { userId },
  select: { ip: true },
});

// Normalize and cache
const normalized = ips.map((item) => normalizeIp(item.ip));
await cache.set(userId, normalized);
return normalized;
```

## 🔐 Permission System

### Permissions

```
IPWHITELIST.VIEW      // View IP whitelist
IPWHITELIST.CREATE    // Create IP whitelist
IPWHITELIST.UPDATE    // Update IP whitelist
IPWHITELIST.DELETE    // Delete IP whitelist
```

### Access Control

1. **User Access**

   - Users chỉ có thể quản lý IPs của mình
   - Không thể xem IPs của users khác

2. **Admin Access**

   - Admins có thể quản lý IPs của tất cả users
   - Có thể view/create/update/delete IPs

3. **Permission Filtering**
   - Apply permission filter trong queries
   - Check permissions trước khi thực hiện operations

## 📡 API Endpoints

### Admin Endpoints

- `GET /admin/user-ip-whitelists` - List IP whitelist
- `GET /admin/user-ip-whitelists/:id` - Get IP whitelist detail
- `POST /admin/user-ip-whitelists` - Create/update IP whitelist
- `POST /admin/user-ip-whitelists/del` - Delete IP whitelist

**Permissions:**

- `IPWHITELIST.VIEW` - View IP whitelist
- `IPWHITELIST.CREATE` / `IPWHITELIST.UPDATE` - Create/update
- `IPWHITELIST.DELETE` - Delete

### User Endpoints

- `GET /user-ip-whitelists` - List own IP whitelist
- `GET /user-ip-whitelists/:id` - Get own IP whitelist detail
- `POST /user-ip-whitelists` - Create/update own IP whitelist
- `POST /user-ip-whitelists/del` - Delete own IP whitelist

**Permissions:**

- Users chỉ có thể quản lý IPs của mình

## 🔒 Security Considerations

### IP Whitelist Validation

**Process:**

1. Check if IP whitelist is enabled (setting)
2. Normalize IP address
3. Check local IPs (always allowed)
4. Get user IP whitelist
5. If whitelist is empty → Allow all
6. If IP is in whitelist → Allow
7. Otherwise → Deny

**Local IP Bypass:**

```typescript
if (isLocalIp(normalizedIp)) {
  return true; // Always allow local IPs
}
```

**Empty List Behavior:**

```typescript
if (allowedIps.length === 0) {
  return true; // Allow all if no whitelist
}
```

### Middleware Integration

**Middleware Flow:**

```typescript
1. Check if user is authenticated
2. Check if IP whitelist is enabled (setting)
3. Get client IP from request
4. Check if IP is allowed
5. If not allowed → Throw UnAuthErr
6. Otherwise → Continue
```

**IP Extraction:**

```typescript
const clientIp =
  ctx.clientIp ??
  getIP(ctx.request.headers) ??
  ctx.server?.requestIP(ctx.request)?.address ??
  null;
```

### Cache Strategy

**Cache Key:**

- Key: `userId`
- Value: Array of normalized IP addresses

**Cache Invalidation:**

- Invalidate khi create/update/delete IP whitelist
- Invalidate per user (only affected user)

**Cache Benefits:**

- Fast lookup (O(1) instead of database query)
- Reduced database load
- Better performance

## 🚀 Cải Tiến Có Thể Thêm

### Phase 1: Enhanced Features

1. **IP Range Support**

   - Support CIDR notation (e.g., 192.168.1.0/24)
   - IP range validation
   - Range matching

2. **IPv6 Support**

   - Full IPv6 support
   - IPv6 normalization
   - IPv6 range support

3. **IP Geolocation**
   - IP geolocation integration
   - Country-based whitelist
   - Region-based whitelist

### Phase 2: Advanced Security

1. **IP Blacklist**

   - Separate blacklist
   - Block specific IPs
   - Override whitelist

2. **Dynamic IP Management**

   - Auto-update IP whitelist
   - IP rotation
   - Temporary IPs

3. **IP Monitoring**
   - Track IP access attempts
   - Alert on unauthorized access
   - IP access history

### Phase 3: Enterprise Features

1. **IP Whitelist Policies**

   - Policy-based configuration
   - Rule engine
   - Complex conditions

2. **IP Whitelist Groups**

   - Group IPs together
   - Apply groups to users
   - Bulk management

3. **IP Whitelist Analytics**
   - Usage statistics
   - Access patterns
   - Security insights

## 📝 Implementation Details

### IP Normalization

```typescript
private normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}
```

### Local IP Check

```typescript
private isLocalIp(ip: string): boolean {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
}
```

### IP Validation Flow

```typescript
async isIpAllowed(userId: string, clientIp: string | null): Promise<boolean> {
  if (!clientIp) {
    return false;
  }

  const normalizedIp = this.normalizeIp(clientIp);

  // Always allow local IPs
  if (this.isLocalIp(normalizedIp)) {
    return true;
  }

  // Get user IP whitelist
  const allowedIps = await this.getUserIps(userId);

  // Allow all if no whitelist
  if (allowedIps.length === 0) {
    return true;
  }

  // Check if IP is in whitelist
  return allowedIps.includes(normalizedIp);
}
```

### Cache Management

```typescript
// Get from cache
const cached = await cache.get(userId);
if (cached) {
  return cached;
}

// Fetch from database
const ips = await db.userIpWhitelist.findMany({
  where: { userId },
  select: { ip: true },
});

// Normalize and cache
const normalized = ips.map((item) => normalizeIp(item.ip));
await cache.set(userId, normalized);
return normalized;
```

### Cache Invalidation

```typescript
// Invalidate on create/update/delete
await this.invalidateCache(userId);

private invalidateCache(userId: string) {
  return this.deps.cache.del(userId);
}
```

## 📝 Notes

- Hệ thống IP whitelist đã được implement đầy đủ
- Cache layer được tích hợp để tối ưu performance
- Permission-based access control đã được implement
- Local IPs luôn được cho phép
- Empty whitelist cho phép tất cả IPs
- Middleware tự động kiểm tra IP whitelist cho authenticated users
