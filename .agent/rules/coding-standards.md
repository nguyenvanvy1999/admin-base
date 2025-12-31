# Coding Standards - Quy Tắc Code Clean & Tái Sử Dụng

Tài liệu này mô tả các quy tắc chặt chẽ về code quality, tái sử dụng code, và best practices cho dự án Admin Base Portal.

## Nguyên Tắc Cơ Bản

### 1. Code Clean & Readable

- **Tự đọc hiểu**: Code phải tự giải thích, tránh comment không cần thiết
- **Đơn giản**: Ưu tiên giải pháp đơn giản, dễ hiểu hơn là tối ưu phức tạp
- **Consistent**: Tuân thủ patterns đã có trong codebase
- **Maintainable**: Code phải dễ maintain và extend

### 2. Tái Sử Dụng Code

**Bắt buộc kiểm tra trước khi tạo mới:**

1. Tìm kiếm components/services/hooks tương tự đã có
2. Xem xét extend hoặc compose từ code hiện có
3. Chỉ tạo mới khi không thể tái sử dụng hoặc không phù hợp

**Ưu tiên tái sử dụng:**

- Common components từ `components/common/`
- Service patterns từ `services/api/`
- Hook patterns từ `hooks/api/`
- Utility functions từ `lib/utils/` hoặc `share/utils/`
- Type definitions từ `types/` hoặc `share/types/`

### 3. DRY (Don't Repeat Yourself)

- Không duplicate logic
- Extract common logic thành functions/utilities
- Sử dụng shared constants, types, errors

### 4. Single Responsibility

- Mỗi function/component/service chỉ làm một việc
- Tách logic phức tạp thành nhiều functions nhỏ
- Nhưng không tách quá nhỏ gây phân mảnh

## Quy Tắc Cụ Thể

### Type Safety

#### Backend

```typescript
// ✅ GOOD: Sử dụng TypeBox schema với .static
import { Type } from '@sinclair/typebox';

const CreateUserDto = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1 }),
});

type CreateUserDto = Static<typeof CreateUserDto>;

// ❌ BAD: Sử dụng any hoặc type không rõ ràng
function createUser(data: any) { ... }
```

#### Frontend

```typescript
// ✅ GOOD: Types từ services hoặc types/
import type { AdminUserDetail } from 'src/types/admin';

function UserCard({ user }: { user: AdminUserDetail }) { ... }

// ❌ BAD: Inline types hoặc any
function UserCard({ user }: { user: any }) { ... }
```

**Quy tắc:**

- Tránh `any` - chỉ dùng khi thực sự cần và có lý do rõ
- Ưu tiên `satisfies` thay vì type assertion
- Sử dụng types từ Prisma/Eden Treaty khi có thể
- DTO lấy type từ schema `.static`

### Component Patterns

#### Frontend Components

```typescript
// ✅ GOOD: Tái sử dụng AppTable với default props
import { AppTable } from "src/components/common/AppTable";

function UsersPage() {
  return (
    <AppTable
      columns={columns}
      request={async (params) => {
        const { data } = await adminUsersService.list(params);
        return { data: data.items, total: data.total };
      }}
    />
  );
}

// ❌ BAD: Tạo ProTable mới thay vì dùng AppTable
import { ProTable } from "@ant-design/pro-components";

function UsersPage() {
  return (
    <ProTable
      bordered
      rowKey="id"
      search={{ collapsed: false }}
      pagination={{ pageSize: 20 }}
      // ... duplicate config
    />
  );
}
```

**Quy tắc:**

- Luôn sử dụng common components từ `components/common/` trước
- Không tạo wrapper trống hoặc chỉ forward props
- Compose components thay vì duplicate logic

#### Service Patterns

```typescript
// ✅ GOOD: Sử dụng createAdminService pattern
import { createAdminService } from './createAdminService';

const { queryKeys, service } = createAdminService<Query, Detail, List, Create, Update>({
  basePath: '/api/admin/users',
  queryKey: 'admin-users',
});

// ❌ BAD: Tạo service từ đầu không theo pattern
export const adminUsersService = {
  list: async () => { ... },
  detail: async () => { ... },
  // ... duplicate code
};
```

**Quy tắc:**

- Follow existing service patterns
- Sử dụng helper functions như `createAdminService`
- Không duplicate API call logic

### Function Design

```typescript
// ✅ GOOD: Function rõ ràng, single responsibility
function calculateTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ❌ BAD: Function làm nhiều việc, khó test
function processOrder(order: Order) {
  // validate
  // calculate
  // save
  // send email
  // update inventory
}
```

**Quy tắc:**

- Mỗi function chỉ làm một việc
- Function name phải mô tả rõ chức năng
- Tránh side effects không cần thiết
- Dễ test và reuse

### Tách Nhỏ vs Phân Mảnh

```typescript
// ✅ GOOD: Tách hợp lý khi có logic độc lập
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUser(user: CreateUserDto): ValidationResult {
  const errors: string[] = [];
  if (!validateEmail(user.email)) {
    errors.push("Invalid email");
  }
  // ...
  return { valid: errors.length === 0, errors };
}

// ❌ BAD: Tách quá nhỏ, không có giá trị
function getFirstChar(str: string): string {
  return str[0];
}

function getSecondChar(str: string): string {
  return str[1];
}
```

**Quy tắc:**

- Tách khi: logic độc lập, cần reuse, cần test riêng
- Không tách khi: chỉ dùng một lần, quá đơn giản, gây phân mảnh

### Comments

```typescript
// ✅ GOOD: Comment giải thích "why", không phải "what"
// Use bcrypt with cost 10 for backward compatibility with legacy system
const hash = await Bun.password.hash(password, { cost: 10 });

// ❌ BAD: Comment lặp lại code
// Hash the password
const hash = await Bun.password.hash(password);
```

**Quy tắc:**

- Chỉ comment khi cần thiết
- Giải thích "why" và "intent", không phải "what"
- Code phải tự đọc hiểu
- Comment bằng tiếng Anh

### Error Handling

#### Backend

```typescript
// ✅ GOOD: Throw Error để middleware xử lý
if (!user) {
  throw new NotFoundError("User not found");
}

// ❌ BAD: Return error object
if (!user) {
  return { error: "User not found" };
}
```

#### Frontend

```typescript
// ✅ GOOD: Kiểm tra error và dùng useNotify
const { mutate } = useMutation({
  mutationFn: adminUsersService.create,
  onSuccess: () => {
    notify.success(t("common.success.created"));
    queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
  },
  onError: (error) => {
    notify.error(error.message || t("common.error.unknown"));
  },
});

// ❌ BAD: Không xử lý error
const { mutate } = useMutation({
  mutationFn: adminUsersService.create,
});
```

### State Management

```typescript
// ✅ GOOD: Phân biệt rõ server state vs local state
// Server data: TanStack Query
const { data } = useAdminUsers(params);

// Local UI state: useState
const [isModalOpen, setIsModalOpen] = useState(false);

// ❌ BAD: Dùng useState cho server data
const [users, setUsers] = useState<User[]>([]);
useEffect(() => {
  fetchUsers().then(setUsers);
}, []);
```

**Quy tắc:**

- Server data: TanStack Query (với invalidation sau mutation)
- Local UI state: React useState
- Global preferences: React Context
- Không dùng Redux/Zustand cho server state

### Naming Conventions

#### Backend

- **Controllers**: `<name>.controller.ts`
- **Services**: `<Name>Service.ts` hoặc `<name>-<domain>.service.ts`
- **DTOs**: `<name>.dto.ts`, export PascalCase + hậu tố `Dto`
- **Types**: PascalCase với hậu tố `Params`/`Result`/`Response`
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

#### Frontend

- **Pages**: `<Name>Page.tsx`
- **Components**: PascalCase, file name match component name
- **Hooks**: `use<Name>Query.ts` hoặc `use<Name>Mutation.ts`
- **Services**: camelCase, file name `<name>.service.ts`
- **Types**: PascalCase, file name lowercase
- **Constants**: UPPER_SNAKE_CASE hoặc camelCase tùy context

#### Files & Folders

- **Files**: kebab-case cho utilities, PascalCase cho components
- **Folders**: kebab-case hoặc camelCase (consistent với codebase)
- **Routes**: kebab-case trong URL

### Code Organization

#### Import Order

```typescript
// ✅ GOOD: Import theo thứ tự
// 1. External libraries
import { useQuery } from "@tanstack/react-query";
import { ProTable } from "@ant-design/pro-components";

// 2. Internal absolute imports
import { AppTable } from "src/components/common/AppTable";
import { adminUsersService } from "src/services/api/admin/users.service";

// 3. Relative imports
import { columns } from "./tableColumns";
import type { User } from "./types";

// 4. Types (có thể ở cuối)
import type { AdminUserListQuery } from "src/types/admin";
```

**Quy tắc:**

- External libraries trước
- Internal absolute imports (`src/...`)
- Relative imports
- Types có thể ở cuối hoặc cùng với imports

### Không Được Làm

1. **Không tạo type/function/biến dư thừa** nếu không dùng hoặc không mang lại giá trị
2. **Không tạo wrapper trống** hoặc chỉ forward mà không có logic/mục đích
3. **Không duplicate code** - extract thành shared utilities
4. **Không tối ưu vi mô** gây khó maintain
5. **Không disable linter rules** trừ khi có lý do rõ ràng
6. **Không dùng `any`** trừ khi thực sự cần và có lý do
7. **Không tạo components/services mới** nếu có thể tái sử dụng
8. **Không quên invalidate query** sau mutation (TanStack Query)

### Code Review Checklist

Khi review code, kiểm tra:

- [ ] Code tuân thủ naming conventions
- [ ] Không có duplicate logic
- [ ] Đã tái sử dụng components/services/hooks có sẵn
- [ ] Type safety (không có `any` không cần thiết)
- [ ] Error handling đầy đủ
- [ ] State management đúng pattern
- [ ] Comments chỉ khi cần thiết
- [ ] Functions/components có single responsibility
- [ ] Code tự đọc hiểu
- [ ] Đã chạy `bun run check` và pass

## Examples

### Tái Sử Dụng Component

```typescript
// ✅ GOOD: Extend AppTable với custom logic
function CustomUsersTable() {
  const columns = useMemo(
    () => [
      // ... columns
    ],
    []
  );

  return (
    <AppTable
      columns={columns}
      request={async (params) => {
        const { data } = await adminUsersService.list(params);
        return { data: data.items, total: data.total };
      }}
      toolBarRender={() => [<Button key="export">Export</Button>]}
    />
  );
}

// ❌ BAD: Tạo ProTable mới với duplicate config
function CustomUsersTable() {
  return (
    <ProTable
      bordered
      rowKey="id"
      search={{ collapsed: false, labelWidth: "auto" }}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      // ... duplicate tất cả config từ AppTable
    />
  );
}
```

### Tái Sử Dụng Service Pattern

```typescript
// ✅ GOOD: Sử dụng createAdminService
const { queryKeys: roleKeys, service: baseRoleService } = createAdminService<
  RoleListQuery,
  RoleDetail,
  RoleListResponse,
  CreateRolePayload,
  UpdateRolePayload
>({
  basePath: "/api/admin/roles",
  queryKey: "admin-roles",
});

// ❌ BAD: Tạo service từ đầu
export const roleService = {
  list: async (params?: RoleListQuery) => {
    return apiClient.get("/api/admin/roles", { params });
  },
  detail: async (id: string) => {
    return apiClient.get(`/api/admin/roles/${id}`);
  },
  // ... duplicate logic từ createAdminService
};
```

### Extract Common Logic

```typescript
// ✅ GOOD: Extract validation logic
// share/utils/validation.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// services/auth/auth.service.ts
import { validateEmail } from "share/utils/validation";

if (!validateEmail(email)) {
  throw new ValidationError("Invalid email");
}

// ❌ BAD: Duplicate validation
// services/auth/auth.service.ts
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new ValidationError("Invalid email");
}

// services/users/users.service.ts
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new ValidationError("Invalid email");
}
```

## Tài Liệu Tham Khảo

- [Project Introduction](./project-introduction.md) - Tổng quan dự án
- [Development Workflow](./development-workflow.md) - Workflow phát triển
- [Biome Configuration](../../biome.json) - Linter/Formatter config
