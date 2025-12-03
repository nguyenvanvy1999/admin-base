# Tech Stack

Tài liệu này mô tả chi tiết các công nghệ và công cụ được sử dụng trong dự án Admin Base.

## Tổng Quan

Admin Base được xây dựng với stack công nghệ hiện đại, tập trung vào performance, type safety và developer experience.

## Backend

### Runtime

- **Bun** - JavaScript runtime nhanh, thay thế Node.js
    - Hot reload tự động
    - Built-in bundler và package manager
    - Native TypeScript support
    - Tích hợp sẵn các APIs (SQLite, WebSocket, etc.)

### Framework

- **Elysia.js** - High-performance TypeScript web framework
    - Type-safe routing và validation
    - Macro system cho custom functionality
    - Auto-generated Swagger documentation
    - Eden Treaty cho end-to-end type safety

### Database

- **PostgreSQL** - Relational database
    - ACID compliance
    - JSON support cho flexible data
    - Full-text search capabilities

- **Prisma ORM** - Type-safe ORM
    - Auto-generated TypeScript types
    - Migration management
    - Query builder với type safety
    - Database introspection

### Authentication

- **JWT (jsonwebtoken)** - Token-based authentication
    - Stateless authentication
    - Macro-based route protection
    - Role-based access control

### Logging

- **Logtape** - Structured logging với file rotation
    - Multiple log levels
    - File rotation để quản lý disk space
    - Structured output cho easy parsing

## Frontend

### Framework & Library

- **React 19** - UI library
    - Component-based architecture
    - Hooks API
    - Server Components support (tương lai)

### UI Components

- **Mantine UI v8** - Modern React component library
    - Comprehensive component set
    - Built-in theming và dark mode
    - Accessibility support
    - Form components với validation

- **Tailwind CSS v4** - Utility-first CSS framework
    - Rapid UI development
    - Responsive design utilities
    - Custom design system integration

### State Management

- **Zustand** - Lightweight global state management
    - Simple API
    - Minimal boilerplate
    - Used for: user state, theme preferences

- **TanStack Query** - Powerful server state management
    - Automatic caching và synchronization
    - Background refetching
    - Optimistic updates
    - Used for: all API data

### Forms & Tables

- **TanStack Form** - Type-safe form management
    - Validation với Zod
    - Field-level error handling
    - Form state management

- **TanStack Table** - Headless table component
    - Sorting, filtering, pagination
    - Column resizing
    - Virtual scrolling support

### Routing

- **React Router v7** - Client-side routing
    - Hash Router (bắt buộc để tránh conflict với server routes)
    - Protected routes
    - Nested routing

### Internationalization

- **i18next** với **react-i18next** - Internationalization
    - Multi-language support (hiện tại: vi, en)
    - Language detection
    - Translation management

### Type Safety

- **Eden Treaty** - End-to-end type safety
    - Auto-generated types từ backend
    - Type-safe API calls
    - No manual type definitions needed

### Icons

- **Material UI Icons** - Icon library
    - Comprehensive icon set
    - Consistent design

## Development Tools

### Code Quality

- **Biome** - Fast formatter và linter
    - Thay thế Prettier và ESLint
    - Fast performance
    - Built-in TypeScript support
    - Configuration trong `biome.json`

### Type Checking

- **TypeScript** - Static type checking
    - Strict mode enabled
    - Type inference
    - Type safety across frontend và backend

## Optional/Tương Lai

### Background Jobs

- **BullMQ/Redis** - Cho đồng bộ giá
    - Scheduled jobs
    - Queue management
    - Price sync từ external APIs

### Price APIs

- **CoinGecko** - Cho cryptocurrency prices
- **NAV Feed** - Cho chứng chỉ quỹ (CCQ)

### OAuth

- OAuth integration cho đăng nhập ngân hàng (tương lai)

## Bảng Tổng Hợp

| Layer          | Technology              | Purpose                                   |
|----------------|-------------------------|-------------------------------------------|
| Runtime        | Bun                     | JavaScript runtime (replaces Node.js)     |
| Backend        | Elysia.js               | High-performance TypeScript web framework |
| Database       | Prisma ORM + PostgreSQL | Type-safe ORM with PostgreSQL             |
| Frontend       | React 19                | UI library                                |
| UI Library     | Mantine UI v8           | Modern React component library            |
| Styling        | Tailwind CSS v4         | Utility-first CSS framework               |
| Routing        | React Router (Hash)     | Client-side routing                       |
| State (Global) | Zustand                 | Lightweight global state management       |
| State (Server) | TanStack Query          | Powerful server state management          |
| Forms          | TanStack Form           | Type-safe form management                 |
| Tables         | TanStack Table          | Headless table component                  |
| i18n           | i18next                 | Internationalization                      |
| Type Safety    | Eden Treaty             | End-to-end TypeScript types               |
| Auth           | JWT + jsonwebtoken      | Token-based authentication                |
| Logging        | Logtape                 | Structured logging with file rotation     |
| Formatter      | Biome                   | Fast formatter and linter                 |

## Lý Do Chọn Công Nghệ

### Bun

- Performance tốt hơn Node.js
- Built-in TypeScript support
- Hot reload tự động
- Không cần bundler riêng cho development

### Elysia.js

- Type-safe từ đầu
- Performance cao
- Eden Treaty cho end-to-end types
- Macro system linh hoạt

### Prisma

- Type safety với database
- Migration management tốt
- Developer experience tốt
- Auto-completion trong IDE

### TanStack Query

- Giảm boilerplate code
- Automatic caching và synchronization
- Optimistic updates
- Background refetching

### Mantine UI

- Component library đầy đủ
- Built-in theming
- Accessibility tốt
- Active development

## Tài Liệu Tham Khảo

- [Bun Documentation](https://bun.sh/docs)
- [Elysia.js Documentation](https://elysiajs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Mantine UI](https://mantine.dev)
- [TanStack Query](https://tanstack.com/query)
- [Eden Treaty Guide](https://elysiajs.com/eden/overview.html)

