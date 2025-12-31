# Development Workflow - Quy Trình Phát Triển

Tài liệu này mô tả quy trình phát triển, commands, và workflow chuẩn cho dự án Admin Base Portal.

## Commands Quan Trọng

### Root Level

```bash
# Install dependencies cho cả workspace
bun install

# Development
bun run dev:server      # Chạy backend dev server
bun run dev:client      # Chạy frontend dev server

# Build
bun run build:server    # Build backend
bun run build:client    # Build frontend

# Code Quality
bun run check           # Format + lint toàn bộ
bun run format          # Format code với Biome
bun run lint            # Lint code với Biome
bun run typecheck       # Type check toàn bộ (server + client)

# Database
bun run db:migrate      # Tạo migration mới
bun run db:deploy       # Deploy migrations
bun run db:generate     # Generate Prisma client
bun run db:dev:reset    # Reset dev database
bun run seed            # Seed database với dữ liệu mẫu
```

### Server (`server/`)

```bash
cd server

# Development
bun run start:dev       # Chạy backend với hot reload

# Production Build
bun run build:backend   # Build backend server
bun run build:worker    # Build worker server
bun run build           # Build tất cả

# Production Start
bun run start:backend:prod   # Start backend production
bun run start:worker:prod    # Start worker production
bun run start:all:prod       # Start tất cả production

# Database
bun run db:migrate      # Tạo migration mới
bun run db:deploy       # Deploy migrations
bun run db:generate     # Generate Prisma client
bun run db:dev:reset    # Reset dev database

# Testing
bun run test            # Chạy tất cả tests
bun run test:unit       # Chạy unit tests
bun run test:watch      # Watch mode
bun run test:coverage   # Coverage report

# Code Quality
bun run typecheck       # Type check
bun run check           # Format + lint
```

### Client (`client/`)

```bash
cd client

# Development
bun run dev             # Chạy Vite dev server

# Build
bun run build           # Build production (tsgo + vite build)
bun run preview         # Preview production build

# Code Quality
bun run typecheck       # Type check
```

## Workflow Phát Triển Feature Backend

### 1. Tạo DTO (Data Transfer Object)

Tạo DTO trong `server/src/modules/<domain>/dtos/` hoặc `server/src/dtos/`:

```typescript
// server/src/modules/admin/users/dtos/create-user.dto.ts
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const CreateUserDto = Type.Object({
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  password: Type.String({ minLength: 8 }),
});

export type CreateUserDto = Static<typeof CreateUserDto>;
```

**Quy tắc:**

- Sử dụng TypeBox cho validation
- Export cả schema và type
- Type lấy từ `.static`

### 2. Viết Service Logic

Tạo service trong `server/src/services/<domain>/`:

```typescript
// server/src/services/users/users.service.ts
import { prisma } from "src/config/db";
import type { CreateUserDto } from "src/modules/admin/users/dtos/create-user.dto";

export class UsersService {
  async create(data: CreateUserDto) {
    // Business logic here
    return await prisma.user.create({ data });
  }
}

export const usersService = new UsersService();
```

**Quy tắc:**

- Service chứa business logic
- File pattern: `<name>.service.ts` hoặc `<name>-<domain>.service.ts`
- Export instance, không export class trực tiếp

### 3. Tạo Controller

Tạo controller trong `server/src/modules/<domain>/controllers/`:

```typescript
// server/src/modules/admin/users/controllers/admin-users.controller.ts
import { Elysia } from "elysia";
import { checkAuth } from "src/config/auth";
import { CreateUserDto } from "../dtos/create-user.dto";
import { usersService } from "src/services/users/users.service";

export const adminUsersController = new Elysia().use(checkAuth).post(
  "/",
  async ({ body }) => {
    return await usersService.create(body);
  },
  {
    body: CreateUserDto,
    detail: {
      security: [{ bearerAuth: [] }],
      tags: ["Admin - Users"],
    },
  }
);
```

**Quy tắc:**

- Apply `checkAuth` middleware
- Define `detail.security` cho protected routes
- Sử dụng DTO cho validation
- Thêm Swagger tags

### 4. Đăng Ký Module

Đăng ký controller trong `server/src/modules/index.ts` hoặc entrypoint:

```typescript
// server/src/modules/index.ts
import { adminUsersController } from "./admin/users/controllers/admin-users.controller";

export const modules = new Elysia().use(adminUsersController);
// ... other modules
```

### 5. Cập nhật Swagger Tags (nếu cần)

Swagger tags được config trong `server/src/config/swagger.ts`.

### 6. Viết Tests (khi yêu cầu)

```typescript
// server/test/unit/services/users.service.test.ts
import { describe, it, expect } from "bun:test";
import { usersService } from "src/services/users/users.service";

describe("UsersService", () => {
  it("should create user", async () => {
    const user = await usersService.create({
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    });
    expect(user.email).toBe("test@example.com");
  });
});
```

## Workflow Phát Triển Feature Frontend

### 1. Khai Báo Types

Tạo types trong `client/src/types/` hoặc trong module nếu chỉ dùng cục bộ:

```typescript
// client/src/types/admin.ts
export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  // ...
}

export interface AdminUserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  // ...
}
```

### 2. Viết Service Gọi API

Tạo service trong `client/src/services/api/`:

```typescript
// client/src/services/api/admin/users.service.ts
import { apiClient } from "src/lib/api/client";
import type { AdminUserListQuery, AdminUserDetail } from "src/types/admin";
import { createAdminService } from "./createAdminService";

const { queryKeys, service } = createAdminService<
  AdminUserListQuery,
  AdminUserDetail,
  AdminUserListResponse,
  CreateUserPayload,
  UpdateUserPayload
>({
  basePath: "/api/admin/users",
  queryKey: "admin-users",
});

export { queryKeys as adminUserKeys };
export const adminUsersService = service;
```

**Quy tắc:**

- Sử dụng `apiClient` từ `src/lib/api/client`
- Tái sử dụng patterns như `createAdminService`
- Export query keys cho React Query

### 3. Wrap Service Bằng Hook

Tạo hook trong `client/src/hooks/api/`:

```typescript
// client/src/hooks/api/useAdminUsers.ts
import { useQuery } from "@tanstack/react-query";
import {
  adminUserKeys,
  adminUsersService,
} from "src/services/api/admin/users.service";
import type { AdminUserListQuery } from "src/types/admin";

export function useAdminUsers(params?: AdminUserListQuery) {
  return useQuery({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUsersService.list(params),
  });
}
```

**Quy tắc:**

- Sử dụng TanStack Query
- Query key từ service
- Type-safe với types đã định nghĩa

### 4. Tạo Page/Component

Tạo page trong `client/src/features/<domain>/pages/`:

```typescript
// client/src/features/admin/pages/AdminUsersPage.tsx
import { AppTable } from "src/components/common/AppTable";
import { useAdminUsers } from "src/hooks/api/useAdminUsers";
import { columns } from "./tableColumns";

export function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <AppTable
      columns={columns}
      loading={isLoading}
      dataSource={data?.items}
      request={async (params) => {
        const { data } = await adminUsersService.list(params);
        return { data: data.items, total: data.total };
      }}
    />
  );
}
```

**Quy tắc:**

- Sử dụng common components (`AppTable`, `AppForm`, etc.)
- Sử dụng hooks đã tạo
- UI dùng Ant Design Pro Components

### 5. Thêm Route

Cập nhật `client/src/app/routes.tsx`:

```typescript
// client/src/app/routes.tsx
import { AdminUsersPage } from "src/features/admin/pages/AdminUsersPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const routes = [
  {
    path: "/admin/users",
    element: (
      <ProtectedRoute permission="admin.users.view">
        <AdminUsersPage />
      </ProtectedRoute>
    ),
  },
];
```

**Quy tắc:**

- Sử dụng `HashRouter` (bắt buộc)
- Bảo vệ route bằng `ProtectedRoute` nếu cần auth
- Thêm permission check nếu cần

### 6. Thêm i18n (nếu cần)

Cập nhật `client/src/locales/en/translation.json` và `client/src/locales/vi/translation.json`:

```json
{
  "admin": {
    "users": {
      "title": "Users",
      "create": "Create User"
    }
  }
}
```

## Schema Lifecycle (Database)

### Khi Thay Đổi Database

1. **Cập nhật Prisma Schema**

```prisma
// server/src/prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  // Thêm field mới
  phone     String?
}
```

2. **Tạo Migration**

```bash
bun run db:migrate
```

3. **Generate Prisma Client**

```bash
bun run db:generate
```

**Quy tắc:**

- Mọi thay đổi DB phải qua Prisma schema
- Không chỉnh tay `generated/`
- Chạy cả migrate và generate

## Code Quality Workflow

### Trước Khi Commit

1. **Format & Lint**

```bash
bun run check
```

2. **Type Check**

```bash
bun run typecheck
```

3. **Tests (nếu có)**

```bash
bun run test
```

### Commit Message

Sử dụng Conventional Commits:

```
feat(admin): add user management page
fix(auth): resolve login redirect issue
refactor(services): extract common service pattern
docs(readme): update setup instructions
```

Format: `<type>(<scope>): <description>`

Types:

- `feat`: Tính năng mới
- `fix`: Bug fix
- `refactor`: Refactor code
- `docs`: Documentation
- `style`: Formatting
- `test`: Tests
- `chore`: Maintenance

## PR Review Checklist

Khi tạo PR, đảm bảo:

- [ ] Code đã chạy `bun run check` và pass
- [ ] Type check pass (`bun run typecheck`)
- [ ] Tests pass (nếu có)
- [ ] Đã tái sử dụng components/services/hooks có sẵn
- [ ] Không có duplicate code
- [ ] Error handling đầy đủ
- [ ] Type safety (không có `any` không cần thiết)
- [ ] Đã invalidate query sau mutation (nếu có)
- [ ] Documentation cập nhật (nếu thay đổi behavior)
- [ ] Backward compatibility (nếu thay đổi API/schema)
- [ ] Không có TODO/tạm code (hoặc đã tạo issue)

## Common Pitfalls & Solutions

### 1. Quên Invalidate Query

```typescript
// ❌ BAD: UI không cập nhật sau mutation
const { mutate } = useMutation({
  mutationFn: adminUsersService.create,
  onSuccess: () => {
    notify.success("Created");
  },
});

// ✅ GOOD: Invalidate query để refetch
const { mutate } = useMutation({
  mutationFn: adminUsersService.create,
  onSuccess: () => {
    notify.success("Created");
    queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
  },
});
```

### 2. Prisma Model Đổi Nhưng Không Regenerate

```bash
# ❌ BAD: Type mismatch
# Đổi schema.prisma nhưng không chạy db:generate

# ✅ GOOD: Luôn regenerate sau khi đổi schema
bun run db:migrate
bun run db:generate
```

### 3. Quên Thêm Route

```typescript
// ❌ BAD: Route không hoạt động
// Tạo page nhưng quên thêm vào routes.tsx

// ✅ GOOD: Luôn thêm route
// routes.tsx
{
  path: '/admin/users',
  element: <AdminUsersPage />,
}
```

### 4. Quên Permission Check

```typescript
// ❌ BAD: Security issue
<Route path="/admin/users" element={<AdminUsersPage />} />

// ✅ GOOD: Protected route với permission
<Route
  path="/admin/users"
  element={
    <ProtectedRoute permission="admin.users.view">
      <AdminUsersPage />
    </ProtectedRoute>
  }
/>
```

## Environment Setup

### Development

1. **Clone repository**

```bash
git clone <repository-url>
cd admin-base
```

2. **Install dependencies**

```bash
bun install
```

3. **Setup environment variables**

```bash
cp .env.example .env
# Edit .env với database config
```

4. **Setup database**

```bash
bun run db:migrate
bun run db:generate
bun run seed
```

5. **Start development servers**

```bash
# Terminal 1: Backend
bun run dev:server

# Terminal 2: Frontend
bun run dev:client
```

6. **Access**

- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs
- Frontend: http://localhost:5173

## Tài Liệu Tham Khảo

- [Project Introduction](./project-introduction.md) - Tổng quan dự án
- [Coding Standards](./coding-standards.md) - Quy tắc code
- [README.md](../../README.md) - Hướng dẫn setup
