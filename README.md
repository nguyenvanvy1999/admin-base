# Admin Base - Admin Management Base

Dự án admin base để tái sử dụng ở nhiều dự án khác, được xây dựng với Elysia.js (backend) và React (frontend), sử dụng
Bun runtime.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system
- PostgreSQL database

### Installation

1. **Clone repository**

```bash
git clone <repository-url>
cd admin-base
```

2. **Install dependencies**

```bash
bun install
```

> ℹ️ Repo sử dụng Bun workspaces để quản lý `server/` và `client/` như hai package độc lập, theo hướng dẫn chính thức
> của Bun về workspaces. Xem thêm
> tại [bun.com/docs/guides/install/workspaces](https://bun.com/docs/guides/install/workspaces).

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your database configuration
```

4. **Setup database**

```bash
bun run db:migrate
bun run db:generate
```

5. **Start development servers**

```bash
# API (Elysia + Bun)
bun run dev:server

# Frontend (Vite + React)
bun run dev:client
```

> Vite chạy hoàn toàn bằng Bun CLI giống như tài
> liệu [bun.com/docs/guides/ecosystem/vite](https://bun.com/docs/guides/ecosystem/vite) nên bạn có thể dùng
> `bun run dev:client`, `bun run build:client` hoặc `bun run preview:client` cho vòng đời FE.

6. **Open your browser**

- `http://localhost:3000` → Bun API (Swagger docs, health checks…)
- `http://localhost:5173` → React admin console

## Documentation

📚 **Xem tài liệu đầy đủ tại**: [documents/README.md](./documents/README.md)

### Tài Liệu Chính

- [**Kiến Trúc Hệ Thống**](./documents/architecture/system-overview.md) - Tổng quan kiến trúc
- [**Tính Năng**](./documents/features/) - Tài liệu chi tiết các tính năng
  - [Authentication](./documents/features/authentication/) - Hệ thống xác thực
  - [Rate Limiting](./documents/features/rate-limiting/) - Giới hạn tần suất
  - [IP Whitelist](./documents/features/ip-whitelist/) - Quản lý IP whitelist
  - [API Key Management](./documents/features/api-key-management/) - Quản lý API keys
  - [File Management](./documents/features/file-management/) - Quản lý file
  - [Summary](./documents/features/summary.md) - Tổng quan tính năng
  - [Roadmap](./documents/features/roadmap.md) - Lộ trình phát triển
- [**Database**](./documents/database/) - Phân tích và schema
- [**UI Design**](./documents/ui-design/) - Thiết kế UI/UX patterns

## Tech Stack

- **Runtime**: Bun
- **Backend**: Elysia.js + PostgreSQL + Prisma
- **Frontend**: React 19 + Ant Design 5 + Tailwind CSS + Ant Design Pro Layout
- **State**: React useState + TanStack Query (server state)
- **Routing**: React Router (HashRouter) + Bun dev server
- **HTTP**: Axios + interceptors
- **Type Safety**: Eden Treaty (end-to-end types)

## Development Commands

```bash
# Install dependencies
bun install

# Database operations
bun run db:migrate      # Create migration
bun run db:deploy       # Deploy migrations
bun run db:generate     # Generate Prisma client
bun run db:dev:reset    # Reset dev database
bun run seed            # Seed database

# Code formatting & linting
bun run format          # Format code with Biome
bun run lint            # Lint code with Biome
bun run check           # Format and lint
bun run typecheck       # Type check (server + client)

# Development with hot reload
bun run dev:server      # Start backend server
bun run dev:client      # Start frontend dev server

# Build for production
bun run build:server    # Build backend
bun run build:client    # Build frontend

# Preview
bun run preview:client  # Preview frontend build

# Testing
bun run test            # Run all tests (server)
bun run test:unit       # Run unit tests
bun run test:watch      # Watch mode
bun run test:coverage   # Coverage report

# Production
bun run --cwd server start:server:prod  # Start production server
```

## API Documentation

- **Swagger UI**: http://localhost:3000/docs (khi chạy dev server)
- **API Endpoints**: Xem chi tiết trong các module tại `server/src/modules/`

## Project Structure

```
admin-base/
├── package.json         # Bun workspace root (client + server)
├── client/              # Frontend (Vite + React + Pro AntD)
├── server/              # Backend (Elysia.js + Prisma + Bun)
└── documents/           # Project documentation
```

### Server (server/) layout

```
server/
├── src/
│   ├── app/             # Application entry points
│   ├── config/          # Configuration files
│   ├── modules/          # API controllers (auth, users, roles, etc.)
│   ├── services/        # Business logic services
│   ├── dtos/            # Data Transfer Objects
│   ├── share/           # Shared utilities
│   └── prisma/          # Prisma schema + migrations
├── test/                # Unit tests
├── bunfig.toml          # Bun runtime config
└── package.json         # Server-specific scripts & deps
```

### Frontend (client/) layout

```
client/src/
├── app/                 # Router, layouts, page shells, providers
├── components/          # Reusable components (common, resource, etc.)
├── features/            # Feature modules (admin, auth, dashboard, settings)
├── hooks/               # Custom hooks (api, auth, pagination, etc.)
├── lib/                 # Axios instance, React Query client, utils
├── services/            # API service modules
├── config/              # Theme tokens, auth config
├── types/               # TypeScript type definitions
├── locales/             # i18n resources (en, vi)
└── global.css           # Tailwind layer + token bridge
```

#### Nguyên tắc mở rộng client

- **Provider gốc**: `client/src/app/AppProvider.tsx` gom `ConfigProvider`, `AntdApp`, `QueryClientProvider` và
  `RouterProvider` (HashRouter).
- **Layout**: `client/src/app/layouts/MainLayout.tsx` sử dụng Ant Design Pro Layout (mix layout) với sidebar cố định.
- **Dữ liệu**: Toàn bộ request đi qua `client/src/lib/http.ts` (Axios + interceptor). React Query dùng
  `client/src/lib/queryClient.ts`.
- **Components tái sử dụng**: `client/src/components/common` chứa wrapper cho Form, ProTable, Modal, Drawer, PageHeader,
  Loader… giữ style đồng nhất.
- **Services**: tạo file mới ở `client/src/services/*`, expose hàm fetch + hook `useXxxQuery`.
- **State**: dùng `useState` cho local UI, dữ liệu server đi qua React Query (không sử dụng Redux/Zustand).
- **Styling**: Ưu tiên AntD token + Tailwind utility trong `global.css`. Token chung nằm ở `client/styles/tokens.css`.
- **Alias import**: sử dụng `src/app`, `src/components`, `src/lib`, `src/services`… đã cấu hình trong `tsconfig.json`.

## Features

### ✅ Đã Triển Khai Hoàn Chỉnh

- **Authentication & Authorization**

  - User registration, login, logout
  - Multi-factor authentication (MFA/TOTP)
  - OAuth integration (Google)
  - Session management với device fingerprinting
  - Password reset & management
  - Security events tracking

- **User Management**

  - User CRUD operations
  - User status management
  - IP whitelist per user
  - User detail & activity tracking

- **Role & Permission System**

  - Role-based access control (RBAC)
  - Permission management
  - Role assignment & management

- **Security Features**

  - Rate limiting (IP, User, IP+UA, Custom strategies)
  - IP whitelist management
  - Audit logs
  - Security events monitoring

- **System Management**

  - Settings management
  - Internationalization (i18n)
  - Notification system
  - Notification templates

- **File Management**
  - File upload/download
  - Basic file operations

### 📋 Đang Lên Kế Hoạch

- API Key Management
- Activity Log
- Data Export/Import
- Webhook System

📚 Xem chi tiết tại [documents/features/summary.md](./documents/features/summary.md)

## License

MIT License

## Contributing

Khi đóng góp code, vui lòng:

- Tuân thủ coding conventions của dự án
- Chạy `bun run check` trước khi commit
- Viết tests cho các tính năng mới
- Cập nhật tài liệu khi cần thiết

## Modules Overview

### Backend Modules (`server/src/modules/`)

- `auth/` - Authentication endpoints
- `users/` - User management
- `roles/` - Role management
- `permissions/` - Permission management
- `session/` - Session management
- `mfa/` - Multi-factor authentication
- `rate-limit/` - Rate limiting configuration
- `ip-whitelist/` - IP whitelist management
- `audit-logs/` - Audit logging
- `security-events/` - Security events tracking
- `settings/` - System settings
- `i18n/` - Internationalization
- `notification/` - Notification system
- `file/` - File management
- `oauth/` - OAuth integration
- `otp/` - OTP management
- `captcha/` - CAPTCHA generation

### Frontend Features (`client/src/features/`)

- `admin/` - Admin management pages
  - Users, Roles, Permissions
  - Sessions, Audit Logs
  - Settings, I18n
  - Rate Limits, IP Whitelist
- `auth/` - Authentication pages
  - Login, Register
  - MFA setup
  - Password reset
- `dashboard/` - Dashboard
- `settings/` - User settings

---

**⭐ Star this repository if you found it helpful!**
