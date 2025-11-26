# FinTrack - Personal Finance & Investment Management

Ứng dụng web quản lý tài chính cá nhân và đầu tư được xây dựng với Elysia.js (backend) và React (frontend), sử dụng Bun runtime.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system
- PostgreSQL database

### Installation

1. **Clone repository**

```bash
git clone <repository-url>
cd fin-track
```

2. **Install dependencies**

```bash
bun install
```

> ℹ️ Repo sử dụng Bun workspaces để quản lý `server/` và `client/` như hai package độc lập, theo hướng dẫn chính thức của Bun về workspaces. Xem thêm tại [bun.com/docs/guides/install/workspaces](https://bun.com/docs/guides/install/workspaces).

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
bun run dev

# Frontend (Vite + React)
bun run dev:client
```

> Vite chạy hoàn toàn bằng Bun CLI giống như tài liệu [bun.com/docs/guides/ecosystem/vite](https://bun.com/docs/guides/ecosystem/vite) nên bạn có thể dùng `bun run dev:client`, `bun run build:client` hoặc `bun run preview:client` cho vòng đời FE.

6. **Open your browser**

- `http://localhost:3000` → Bun API (Swagger docs, health checks…)
- `http://localhost:5173` → React admin console

## Documentation

📚 **Xem tài liệu đầy đủ tại**: [docs/README.md](./docs/README.md)

### Tài Liệu Chính

- [**Tài Liệu Công Nghệ**](./docs/technology/) - Tech stack, architecture, coding rules
- [**Tài Liệu Dự Án**](./docs/project/) - Overview, database schema, roadmap
- [**Hướng Dẫn Sử Dụng**](./docs/user-guide/) - Getting started, features, API reference

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

# Database migrations
bun run db:migrate      # Create migration
bun run db:generate     # Generate Prisma client

# Code formatting & linting
bun run format          # Format code with Biome
bun run lint            # Lint code with Biome
bun run check           # Format and lint

# Development with hot reload
bun run dev          # server
bun run dev:client   # client

# Build for production
bun run build        # server + client

# Start production server
bun run --cwd server start:server:prod
```

## API Documentation

- **Swagger UI**: http://localhost:3000/docs
- **API Reference**: [docs/user-guide/api-reference.md](./docs/user-guide/api-reference.md)

## Project Structure

```
fin-track/
├── package.json         # Bun workspace root (client + server)
├── client/              # Frontend (Vite + React + Pro AntD)
└── server/              # Backend (Elysia.js + Prisma + Bun)
```

### Server (server/) layout

```
server/
├── src/                 # Elysia app, controllers, services
├── prisma/              # Prisma schema + migrations
├── test/                # Unit tests
├── bunfig.toml          # Bun runtime config
└── package.json         # Server-specific scripts & deps
```

### Frontend (client/) layout

```
client/src/
├── app/                 # Router, layouts, page shells
├── components/          # Reusable AntD wrappers (Form, Table, Modal, Drawer…)
├── config/              # Theme tokens, provider config
├── hooks/               # Custom hooks (notifications, modal helper, etc.)
├── lib/                 # Axios instance, React Query client
├── services/            # API service modules + query hooks
├── locales/             # i18n resources
└── global.css           # Tailwind layer + token bridge
```

#### Nguyên tắc mở rộng client

- **Provider gốc**: `client/src/app/AppProvider.tsx` gom `ConfigProvider`, `AntdApp`, `QueryClientProvider` và `RouterProvider` (HashRouter).
- **Layout**: `client/src/app/layouts/MainLayout.tsx` sử dụng Ant Design Pro Layout (mix layout) với sidebar cố định.
- **Dữ liệu**: Toàn bộ request đi qua `client/src/lib/http.ts` (Axios + interceptor). React Query dùng `client/src/lib/queryClient.ts`.
- **Components tái sử dụng**: `client/src/components/common` chứa wrapper cho Form, ProTable, Modal, Drawer, PageHeader, Loader… giữ style đồng nhất.
- **Services**: tạo file mới ở `client/src/services/*`, expose hàm fetch + hook `useXxxQuery`.
- **State**: dùng `useState` cho local UI, dữ liệu server đi qua React Query (không sử dụng Redux/Zustand).
- **Styling**: Ưu tiên AntD token + Tailwind utility trong `global.css`. Token chung nằm ở `client/styles/tokens.css`.
- **Alias import**: sử dụng `@client/app`, `@client/components`, `@client/lib`, `@client/services`… đã cấu hình trong `tsconfig.json`.

## Features

- ✅ Account management
- ✅ Transaction tracking
- ✅ Investment management (priced & manual modes)
- ✅ Category management
- ✅ Multi-currency support
- ✅ P&L calculations
- 🚧 Dashboard & Reports (in progress)
- 📋 Budget management (planned)
- 📋 Recurring transactions (planned)

## License

MIT License

## Contributing

Xem [docs/technology/coding-rules.md](./docs/technology/coding-rules.md) để biết quy tắc code và conventions.

---

**⭐ Star this repository if you found it helpful!**
