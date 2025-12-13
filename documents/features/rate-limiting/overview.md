# Rate Limiting - Tổng Quan

## 📋 Hiện Trạng

Hệ thống rate limiting đã được implement đầy đủ với các tính năng:

### ✅ Đã Implement

- **Dynamic Rate Limit Configuration**: Quản lý rate limit configs từ database
- **Multiple Strategies**: Hỗ trợ nhiều chiến lược rate limiting
  - IP-based: Rate limit theo IP address
  - User-based: Rate limit theo user ID
  - IP + User Agent: Rate limit theo IP và User Agent
  - Custom: Rate limit theo custom identifier
- **Redis-based Storage**: Sử dụng Redis để lưu trữ rate limit counters
- **Blocking Support**: Hỗ trợ block identifier vĩnh viễn hoặc tạm thời
- **Security Event Integration**: Tự động log security events khi vượt quá limit
- **Cache Layer**: Cache configs để tối ưu performance
- **Admin Management**: API để quản lý rate limit configs

### 📁 Code Structure

```
server/src/
├── service/rate-limit/
│   ├── rate-limit.service.ts         # Core rate limiting logic
│   ├── rate-limit-config.service.ts  # Config management
│   └── auth-rate-limit.config.ts     # Rate limit middleware
└── modules/rate-limit/
    └── rate-limit-admin.controller.ts # Admin API endpoints
```

### 🔧 Rate Limit Strategies

1. **IP-based** (`RateLimitStrategy.ip`)
   - Rate limit theo IP address
   - Phù hợp cho public endpoints

2. **User-based** (`RateLimitStrategy.user`)
   - Rate limit theo user ID
   - Phù hợp cho authenticated endpoints

3. **IP + User Agent** (`RateLimitStrategy.ip_ua`)
   - Rate limit theo IP và User Agent hash
   - Phù hợp cho trường hợp cần phân biệt devices

4. **Custom** (`RateLimitStrategy.custom`)
   - Rate limit theo custom identifier
   - Linh hoạt cho các use cases đặc biệt

### 📊 Storage

- **Redis**: Lưu trữ rate limit counters và blocks
- **Cache**: Cache configs để giảm database queries
- **Window-based**: Sliding window với time-based keys

## 🎯 Use Cases

### Authentication Endpoints

Rate limiting được áp dụng cho:
- `/auth/login` - Prevent brute force attacks
- `/auth/register` - Prevent spam registrations
- `/auth/forgot-password` - Prevent abuse
- `/auth/change-password` - Prevent password attacks

### Admin Endpoints

Rate limiting có thể được cấu hình cho bất kỳ endpoint nào thông qua admin API.

## 📚 Tài Liệu Chi Tiết

- [Technical Specification](./technical-spec.md) - Spec kỹ thuật chi tiết

## ⚠️ Lưu Ý

Hệ thống rate limiting đã được implement đầy đủ và đang hoạt động. Tài liệu này mô tả hiện trạng và kiến trúc hiện tại.

## 🔗 Tài Liệu Liên Quan

- [Authentication](../authentication/overview.md) - Authentication system
- [IP Whitelist](../ip-whitelist/overview.md) - IP whitelist system
- [Feature Summary](../summary.md) - Tổng quan tính năng

