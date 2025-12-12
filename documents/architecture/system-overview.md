# Tổng Quan Kiến Trúc Hệ Thống

## 📋 Tổng Quan

Dự án Investment là một hệ thống quản lý đầu tư với kiến trúc full-stack:

- **Backend**: Elysia (Bun runtime)
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL với Prisma ORM
- **Storage**: File system / S3-compatible storage

## 🏗️ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  - Pages, Components, Hooks             │
│  - API Services                         │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTP/REST API
                  │
┌─────────────────▼───────────────────────┐
│      Backend (Elysia/Bun)               │
│  ┌───────────────────────────────────┐ │
│  │  Controllers (Modules)            │ │
│  │  - Auth, User, File, Session...   │ │
│  └──────────────┬────────────────────┘ │
│                 │                       │
│  ┌──────────────▼────────────────────┐ │
│  │  Services                         │ │
│  │  - Business Logic                 │ │
│  └──────────────┬────────────────────┘ │
│                 │                       │
│  ┌──────────────▼────────────────────┐ │
│  │  Database (Prisma)                │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 📦 Cấu Trúc Dự Án

### Backend (`server/`)

```
server/
├── src/
│   ├── app/              # Application entry points
│   ├── config/           # Configuration
│   ├── modules/          # Controllers (API endpoints)
│   ├── service/          # Business logic services
│   ├── share/            # Shared utilities
│   └── prisma/           # Database schema & migrations
└── test/                 # Tests
```

### Frontend (`client/`)

```
client/
├── src/
│   ├── app/              # App setup, routes
│   ├── components/       # React components
│   ├── features/         # Feature modules
│   ├── hooks/            # Custom hooks
│   ├── services/         # API services
│   └── types/            # TypeScript types
```

## 🔑 Các Module Chính

### 1. Authentication & Authorization

- User authentication (email/password, OAuth)
- Role-based access control (RBAC)
- Permission system
- Session management
- MFA (TOTP)

### 2. File Management

- File upload/download
- Storage backend abstraction (local/S3)
- Basic file operations

**Lưu ý**: Hiện tại chỉ có tính năng cơ bản. Xem `features/file-management/` để biết kế hoạch mở rộng.

### 3. User Management

- User CRUD operations
- User status management
- IP whitelist
- Security events tracking

### 4. System Management

- Settings management
- I18n (internationalization)
- Audit logs
- Rate limiting

## 🔐 Security

- Authentication middleware
- Permission-based authorization
- Rate limiting
- Security events tracking
- Audit logging

## 📊 Database

- PostgreSQL với Prisma ORM
- Schema được quản lý qua Prisma migrations
- Xem `database/` để biết chi tiết về schema và cải thiện

## 🚀 Deployment

- Backend: Bun runtime
- Frontend: Static files (Vite build)
- Database: PostgreSQL
- Storage: File system hoặc S3-compatible

## 📝 Tài Liệu Liên Quan

- [File Management Overview](../features/file-management/overview.md)
- [Database Analysis](../database/analysis.md)
- [Feature Roadmap](../features/roadmap.md)
