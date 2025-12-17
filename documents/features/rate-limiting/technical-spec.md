# Rate Limiting - Technical Specification

## 📋 Mục Tiêu

Hệ thống rate limiting hoàn chỉnh với:

- Dynamic rate limit configuration
- Multiple rate limiting strategies
- Redis-based storage
- Blocking support
- Security event integration
- Cache layer for performance
- Admin management API

## 🏗️ Kiến Trúc

```
Controller Layer (rate-limit-admin.controller.ts)
    ↓
Service Layer
    ├── RateLimitService (core rate limiting logic)
    └── RateLimitConfigService (config management)
    ↓
Middleware Layer (auth-rate-limit.config.ts)
    ↓
Data Layer
    ├── Database (Prisma - RateLimitConfig model)
    ├── Redis (rate limit counters & blocks)
    └── Cache (config caching)
```

## 📊 Database Schema

### RateLimitConfig Model

```prisma
enum RateLimitStrategy {
  ip
  user
  ip_ua
  custom
}

model RateLimitConfig {
  id            String            @id
  routePath     String            @unique
  limit         Int
  windowSeconds Int
  strategy      RateLimitStrategy
  enabled       Boolean           @default(true)
  description   String?
  created       DateTime          @default(now())
  modified      DateTime          @updatedAt
}
```

**Fields:**

- `routePath`: Route path để áp dụng rate limit (e.g., `/auth/login`)
- `limit`: Số lượng requests cho phép trong window
- `windowSeconds`: Thời gian window (seconds)
- `strategy`: Chiến lược rate limiting
- `enabled`: Bật/tắt rate limit

## 🔧 Service Layer

### RateLimitService

Core rate limiting logic:

- `checkAndIncrement()` - Kiểm tra và tăng counter

  - Check block status
  - Increment counter trong Redis
  - Check limit
  - Log security event nếu vượt quá limit
  - Return result (allowed, count, remaining)

- `block()` - Block identifier
  - Block vĩnh viễn hoặc tạm thời
  - Store block trong Redis

**Key Generation:**

```typescript
// Window key
`${identifier}:${routePath}:${windowTimestamp}` // Block key
`block:${identifier}:${routePath}`;
```

**Algorithm:**

1. Check block status
2. Calculate window start time
3. Build cache key với window timestamp
4. Increment counter trong Redis
5. Set expiration cho key (nếu là lần đầu)
6. Check limit
7. Log security event nếu vượt quá limit
8. Return result

### RateLimitConfigService

Config management:

- `getConfig()` - Lấy config cho route path

  - Check cache trước
  - Query database nếu không có trong cache
  - Cache result (TTL: 300 seconds)

- `list()` - List configs với filtering
- `create()` - Tạo config mới
- `update()` - Update config
- `delete()` - Xóa config
- `invalidateCache()` - Invalidate cache

**Cache Strategy:**

- Cache key: `route:${routePath}`
- TTL: 300 seconds
- Invalidate khi create/update/delete

## 🔐 Rate Limiting Strategies

### IP-based Strategy

```typescript
identifier = `ip:${clientIp}`;
```

- Rate limit theo IP address
- Phù hợp cho public endpoints
- Dễ bị bypass với multiple IPs

### User-based Strategy

```typescript
identifier = `user:${userId}`;
```

- Rate limit theo user ID
- Phù hợp cho authenticated endpoints
- Yêu cầu user đã login

### IP + User Agent Strategy

```typescript
uaHash = base64(userAgent).slice(0, 16);
identifier = `ip+ua:${clientIp}:${uaHash}`;
```

- Rate limit theo IP và User Agent
- Phân biệt devices trên cùng IP
- Phù hợp cho trường hợp cần phân biệt devices

### Custom Strategy

```typescript
identifier = getIdentifier(context);
```

- Rate limit theo custom identifier
- Linh hoạt cho các use cases đặc biệt
- Yêu cầu custom function

## 📡 API Endpoints

### Admin Endpoints

- `GET /admin/rate-limits` - List rate limit configs
- `POST /admin/rate-limits` - Create rate limit config
- `POST /admin/rate-limits/:id` - Update rate limit config
- `DELETE /admin/rate-limits/:id` - Delete rate limit config

**Permissions:**

- `RATE_LIMIT.VIEW` - View rate limit configs
- `RATE_LIMIT.MANAGE` - Create/update/delete configs

## 🔒 Security Considerations

### Rate Limit Bypass Prevention

1. **Multiple Strategies**

   - Sử dụng strategy phù hợp với use case
   - Combine strategies nếu cần

2. **Blocking Support**

   - Block identifiers vĩnh viễn hoặc tạm thời
   - Prevent abuse sau khi vượt quá limit

3. **Security Event Integration**
   - Log security events khi vượt quá limit
   - Track suspicious activity

### Performance Optimization

1. **Redis Storage**

   - Fast in-memory storage
   - Atomic operations
   - Expiration support

2. **Cache Layer**

   - Cache configs để giảm database queries
   - TTL: 300 seconds
   - Invalidate khi có thay đổi

3. **Window-based Algorithm**
   - Sliding window với time-based keys
   - Efficient memory usage
   - Automatic cleanup với expiration

### Rate Limit Configuration

**Best Practices:**

1. **Authentication Endpoints**

   - Strategy: `ip` hoặc `ip_ua`
   - Limit: 5-10 requests per minute
   - Window: 60 seconds

2. **API Endpoints**

   - Strategy: `user` (nếu authenticated)
   - Limit: 100-1000 requests per minute
   - Window: 60 seconds

3. **Public Endpoints**
   - Strategy: `ip`
   - Limit: 20-50 requests per minute
   - Window: 60 seconds

## 🚀 Cải Tiến Có Thể Thêm

### Phase 1: Advanced Features

1. **Distributed Rate Limiting**

   - Support multiple Redis instances
   - Consistent hashing
   - Load balancing

2. **Rate Limit Analytics**

   - Track rate limit hits
   - Analytics dashboard
   - Usage statistics

3. **Dynamic Limits**
   - Adjust limits based on load
   - Adaptive rate limiting
   - Burst allowance

### Phase 2: Enhanced Strategies

1. **Token-based Rate Limiting**

   - Rate limit per API key
   - Token-based quotas
   - Usage tracking

2. **Geographic Rate Limiting**

   - Rate limit by country/region
   - IP geolocation
   - Regional limits

3. **Time-based Rate Limiting**
   - Different limits for different times
   - Peak hours handling
   - Off-peak allowances

### Phase 3: Enterprise Features

1. **Rate Limit Policies**

   - Policy-based configuration
   - Rule engine
   - Complex conditions

2. **Rate Limit Quotas**

   - Monthly/daily quotas
   - Usage tracking
   - Quota management

3. **Rate Limit Notifications**
   - Alert when approaching limit
   - Email notifications
   - Webhook support

## 📝 Implementation Details

### Redis Keys

```typescript
// Counter key
`${identifier}:${routePath}:${windowTimestamp}` // Block key
`block:${identifier}:${routePath}`;
```

### Window Calculation

```typescript
const now = new Date();
const windowStart = new Date(
  Math.floor(now.getTime() / (windowSeconds * 1000)) * (windowSeconds * 1000)
);
```

### Counter Increment

```typescript
const currentCount = await redis.incr(cacheKey);
if (currentCount === 1) {
  await redis.expire(cacheKey, windowSeconds);
}
```

### Block Check

```typescript
const blockKey = `block:${identifier}:${routePath}`;
const blockedValue = await redis.get(blockKey);
if (blockedValue) {
  return { allowed: false, count: 0, remaining: 0 };
}
```

## 📝 Notes

- Hệ thống rate limiting đã được implement đầy đủ
- Redis được sử dụng cho storage
- Cache layer được tích hợp để tối ưu performance
- Security events được log khi vượt quá limit
- Admin API đã được implement để quản lý configs
