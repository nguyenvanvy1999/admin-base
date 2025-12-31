# Admin Base Portal - Giới Thiệu Dự Án

## Tổng Quan

**Admin Base Portal** là một base project đầy đủ tính năng quản trị được thiết kế để tái sử dụng ở nhiều dự án khác. Dự án được xây dựng với kiến trúc monorepo, sử dụng Bun runtime cho cả backend và frontend.

### Mục Tiêu

- Cung cấp một nền tảng admin portal hoàn chỉnh, sẵn sàng sử dụng
- Tái sử dụng code và patterns giữa các dự án
- Đảm bảo type safety tuyệt đối từ frontend đến backend
- Cung cấp các tính năng bảo mật và quản lý người dùng cơ bản

## Kiến Trúc

Dự án sử dụng kiến trúc **monorepo** với hai package chính:

- **`server/`**: Backend API (Elysia.js + Bun)
- **`client/`**: Frontend application (React + Vite)

### Tech Stack

#### Runtime & Build Tools

- **Runtime**: Bun (bunfig + scripts trong `package.json` từng app)
- **Package Manager**: Bun workspaces
- **Formatter/Linter**: Biome
- **Type Checker**: TypeScript strict mode

#### Backend (`server/`)

- **Framework**: Elysia.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (jose library)
- **Authorization**: Policy-based authorization
- **Logging**: Logtape
- **Queue**: BullMQ/Redis
- **Validation**: TypeBox
- **Security**: elysia-xss, elysia-rate-limit, elysiajs-helmet
- **Documentation**: Swagger (via @elysiajs/openapi)

#### Frontend (`client/`)

- **Framework**: React 19
- **Build Tool**: Vite
- **UI Library**: Ant Design 5 + @ant-design/pro-components
- **State Management**:
  - Server data: TanStack Query (caching, invalidation)
  - Local UI state: React useState
  - Global preferences: React Context (AuthProvider, ThemeModeProvider)
- **Routing**: React Router (HashRouter - bắt buộc)
- **HTTP Client**: Axios với interceptors
- **i18n**: i18next + react-i18next
- **Styling**: Ant Design tokens + Tailwind CSS utilities

## Cấu Trúc Codebase

### Backend (`server/src/`)

```
server/src/
├── app/                    # Application entry points
│   ├── backend/           # Backend server entry
│   ├── worker/            # Background worker entry
│   └── dev-runner.ts      # Development runner
├── modules/               # API controllers theo domain
│   ├── admin/            # Admin endpoints
│   ├── auth/             # Authentication endpoints
│   └── ...
├── services/              # Business logic services
│   ├── auth/             # Auth services
│   ├── users/            # User services
│   └── ...
├── config/                # Configuration files
│   ├── db.ts             # Database config
│   ├── env.ts            # Environment variables
│   ├── logger.ts         # Logging config
│   └── ...
├── share/                 # Shared utilities
│   ├── constants/        # Constants
│   ├── errors/           # Error definitions
│   ├── utils/            # Utility functions
│   └── types/            # Shared types
└── prisma/                # Database schema & migrations
    ├── schema.prisma     # Prisma schema
    └── migrations/       # Migration files
```

**Patterns:**

- Controllers trong `modules/*/controllers/`
- DTOs trong `modules/*/dtos/` hoặc `dtos/`
- Services trong `services/*/` với pattern `[area].service.ts` hoặc `[area]-[domain].service.ts`
- Shared code trong `share/`

### Frontend (`client/src/`)

```
client/src/
├── app/                   # App setup & routing
│   ├── AppProvider.tsx   # Root provider
│   ├── routes.tsx        # Route definitions
│   └── layouts/          # Layout components
├── components/            # Reusable components
│   ├── common/          # Common wrappers (AppTable, AppForm, etc.)
│   ├── resource/        # Resource management components
│   └── ...
├── features/             # Feature modules
│   ├── admin/           # Admin features
│   ├── auth/            # Auth features
│   ├── dashboard/       # Dashboard
│   └── settings/        # Settings
├── hooks/                # Custom hooks
│   ├── api/             # API query/mutation hooks
│   ├── auth/            # Auth hooks
│   └── ...
├── services/             # API service modules
│   └── api/             # API services
├── lib/                  # Core libraries
│   ├── api/             # Axios instance & interceptors
│   ├── queryClient.ts   # React Query client
│   └── utils/           # Utility functions
├── types/                # TypeScript type definitions
├── locales/              # i18n resources (en, vi)
├── config/               # Configuration
│   ├── auth.ts          # Auth config
│   └── theme.ts         # Theme config
└── store/                # Global stores
    └── authStore.ts     # Auth store
```

**Patterns:**

- Pages trong `features/*/pages/`
- Components trong `features/*/components/` hoặc `components/`
- API services trong `services/api/`
- Hooks wrap services trong `hooks/api/`
- Common components là wrappers cho Ant Design

## Tính Năng Core

### Authentication & Authorization

- ✅ User registration & login
- ✅ JWT-based authentication
- ✅ Multi-factor authentication (MFA) với TOTP
- ✅ OTP verification
- ✅ OAuth integration (Google)
- ✅ Password reset & recovery
- ✅ Session management với device fingerprinting
- ✅ Policy-based authorization (roles & permissions)

### User Management

- ✅ User CRUD operations
- ✅ User status management (active, inactive, suspended, banned)
- ✅ User detail view
- ✅ IP whitelist management per user

### Role & Permission System

- ✅ Role management (CRUD)
- ✅ Permission management
- ✅ Role-permission assignment
- ✅ Permission-based route protection

### System Management

- ✅ Settings management (key-value với data types: string, number, boolean, date, json)
- ✅ Audit logs (tracking user actions)
- ✅ Session tracking & management
- ✅ Internationalization (i18n) management
- ✅ Rate limiting (IP, User, IP+UA, Custom strategies)

### Infrastructure

- ✅ File upload/download service
- ✅ Email service (React Email templates)
- ✅ Background job processing (BullMQ)
- ✅ Redis caching
- ✅ Database migrations (Prisma)
- ✅ API documentation (Swagger)

## State Management Strategy

### Backend

- Stateless API design
- Session data trong database
- Cache sử dụng Redis

### Frontend

- **Server Data**: TanStack Query
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Query invalidation sau mutations
- **Local UI State**: React useState
  - Form state
  - Modal/drawer visibility
  - UI interactions
- **Global Preferences**: React Context
  - Auth state (AuthProvider)
  - Theme mode (ThemeModeProvider)
  - Language preference

## Type Safety

Dự án ưu tiên type safety tuyệt đối:

- **Backend**: Prisma types, TypeBox schemas, DTOs với `.static`
- **Frontend**: TypeScript strict mode, types từ Prisma/Eden Treaty
- **End-to-end**: Eden Treaty cho type-safe API calls
- **Tránh `any`**: Chỉ sử dụng khi thực sự cần thiết và có lý do rõ ràng

## Security Features

- Password hashing với `Bun.password.hash` (bcrypt)
- JWT authentication qua header `Authorization: Bearer`
- XSS protection (elysia-xss)
- Rate limiting (elysia-rate-limit)
- CORS configuration
- Security headers (elysiajs-helmet)
- Audit logging cho security events
- IP whitelist management

## Documentation

- **API Docs**: Swagger UI tại `/docs` khi chạy dev server
- **Architecture**: `documents/architecture/`
- **Features**: `documents/features/`
- **Database**: `documents/database/`
- **UI Design**: `documents/ui-design/`

## Tài Liệu Tham Khảo

- [README.md](../../README.md) - Hướng dẫn setup và commands
- [Coding Standards](./coding-standards.md) - Quy tắc code và conventions
- [Development Workflow](./development-workflow.md) - Workflow phát triển
- [System Overview](../../documents/architecture/system-overview.md) - Chi tiết kiến trúc
