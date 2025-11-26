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

5. **Start development server**

```bash
bun run dev
```

6. **Open your browser**

Navigate to `http://localhost:3000` to see your application!

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
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

## API Documentation

- **Swagger UI**: http://localhost:3000/docs
- **API Reference**: [docs/user-guide/api-reference.md](./docs/user-guide/api-reference.md)

## Project Structure

```
fin-track/
├── docs/                # Documentation (tiếng Việt)
├── src/                 # Backend (Elysia.js)
├── client/              # Frontend (React + Ant Design)
├── prisma/              # Prisma schema and migrations
└── package.json
```

### Frontend (client/) layout

```
client/
├── app/                 # Router, layouts, page shells
├── components/          # Reusable AntD wrappers (Form, Table, Modal, Drawer…)
├── config/              # Theme tokens, provider config
├── hooks/               # Custom hooks (notifications, modal helper, etc.)
├── lib/                 # Axios instance, React Query client
├── services/            # API service modules + query hooks
├── app/pages/           # Feature-less placeholder pages (Home, Workspace, Settings)
└── global.css           # Tailwind layer + AntD resets/tokens
```

#### Nguyên tắc mở rộng client

- **Provider gốc**: `client/app/AppProvider.tsx` gom `ConfigProvider`, `AntdApp`, `QueryClientProvider` và `RouterProvider` (HashRouter).
- **Layout**: `client/app/layouts/MainLayout.tsx` sử dụng Ant Design Pro Layout (mix layout) với sidebar cố định.
- **Dữ liệu**: Toàn bộ request đi qua `client/lib/http.ts` (Axios + interceptor). React Query dùng `client/lib/queryClient.ts`.
- **Components tái sử dụng**: `client/components/common` chứa wrapper cho Form, ProTable, Modal, Drawer, PageHeader, Loader… giữ style đồng nhất.
- **Services**: tạo file mới ở `client/services/*`, expose hàm fetch + hook `useXxxQuery`.
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
