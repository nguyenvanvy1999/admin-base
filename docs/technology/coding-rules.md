# Quy Tắc Code

Tài liệu này mô tả các quy tắc và conventions bắt buộc khi phát triển dự án FinTrack.

## Quy Tắc Bắt Buộc

### 1. Hash Router (CRITICAL)

**BẮT BUỘC**: Frontend phải sử dụng Hash Router.

- ✅ **LUÔN** sử dụng `createHashRouter` từ `react-router`
- ❌ **KHÔNG BAO GIỜ** sử dụng `createBrowserRouter`
- **Lý do**: Static file serving mounts tại `/`, browser router sẽ conflict với server routes

```typescript
// ✅ ĐÚNG
import { createHashRouter } from "react-router";
const router = createHashRouter([...]);

// ❌ SAI
import { createBrowserRouter } from "react-router";
const router = createBrowserRouter([...]);
```

### 2. Prisma Schema Management

- Tất cả models mới **PHẢI** được thêm vào `prisma/schema.prisma`
- Chạy `bun run db:migrate` để tạo migration
- Chạy `bun run db:generate` để generate Prisma client
- Mọi thay đổi schema đều cần tạo migration

### 3. Protected Routes

#### Backend

```typescript
.get("/endpoint", handler, {
    checkAuth: ["user"], // hoặc ["admin"]
    detail: {
        security: [{ JwtAuth: [] }], // Cho Swagger
    },
});
```

#### Frontend

```typescript
// Token tự động được thêm vào requests qua api.ts onRequest
const token = localStorage.getItem(ACCESS_TOKEN_KEY);
```

### 4. Code Style (Biome)

- Sử dụng Biome cho formatting và linting
- Chạy `bun run check` để format và lint
- Cấu hình trong `biome.json`

### 5. State Management Rules

- **Zustand**: Chỉ dùng cho global state (user, theme, preferences)
- **TanStack Query**: Luôn dùng cho server state (API data)
- **useState**: Dùng cho component-specific state
- **Luôn** invalidate queries sau mutations

### 6. Type Safety Rules

- Luôn sử dụng Eden Treaty types từ backend
- Sử dụng Prisma generated types cho database models
- Tránh `any`, ưu tiên `unknown` với type guards
- Sử dụng `satisfies` thay vì `as` khi có thể

## Naming Conventions

### Backend

| Type        | Pattern                | Example               |
|-------------|------------------------|-----------------------|
| Controllers | `[name].controller.ts` | `user.controller.ts`  |
| Services    | `[Name]Service.ts`     | `UserService.ts`      |
| DTOs        | `[name].dto.ts`        | `user.dto.ts`         |
| Constants   | `[name].ts`            | `currency.ts`         |
| Macros      | `[name].ts`            | `auth.ts`             |
| Middlewares | `[name]-middleware.ts` | `error-middleware.ts` |

### Frontend

| Type           | Pattern                 | Example                  |
|----------------|-------------------------|--------------------------|
| Pages          | `[Name]Page.tsx`        | `LoginPage.tsx`          |
| Components     | `[Name].tsx`            | `Header.tsx`             |
| Query Hooks    | `use[Name]Queries.ts`   | `useAccountQueries.ts`   |
| Mutation Hooks | `use[Name]Mutations.ts` | `useAccountMutations.ts` |
| Types          | `[name].ts`             | `account.ts`             |
| Stores         | `[name].ts`             | `user.ts`                |
| Services       | `[Name]Service.ts`      | `AccountService.ts`      |

## Code Comments

- **Tất cả code comments phải bằng tiếng Anh**
- Chỉ comment những phần quan trọng hoặc phức tạp
- Giữ code sạch để không cần nhiều comment

## Validation

### Backend

- Sử dụng TypeBox (Elysia `t`) cho validation payload
- DTOs phải có validation schema
- Extract TypeScript types từ schemas

```typescript
export const UpsertAccountDto = t.Object({
    id: t.Optional(t.String()),
    type: t.Enum(AccountType),
    name: t.String(),
});

export type IUpsertAccountDto = typeof UpsertAccountDto.static;
```

### Frontend

- Sử dụng TanStack Form với validation schemas
- Validation ở cả client và server side
- Hiển thị error messages rõ ràng

## Error Handling

### Backend

```typescript
// Trong handlers - throw errors
if (!user) {
    throw new Error("User not found"); // Tự động được xử lý bởi middleware
}

// error-middleware.ts catch và format
return {
    message: error.message,
    status: 400,
};
```

### Frontend

```typescript
// API calls trả về { data, error }
const response = await api.api.accounts.post(body);

if (response.error) {
    const errorMsg = response.error.value?.message ?? "Unknown error";
    // Hiển thị error toast
} else {
    const data = response.data;
    // Logic thành công
}

// Hoặc sử dụng mutation hooks (khuyến nghị)
const mutation = useCreateAccountMutation();
// Error handling đã được xử lý trong hook
```

## Security Considerations

### Password Hashing

```typescript
// Sử dụng Bun's built-in bcrypt
const hashed = await Bun.password.hash(password, "bcrypt");
const isValid = await Bun.password.verify(password, hashed, "bcrypt");
```

### JWT Tokens

- Lưu trong localStorage (client-side)
- Gửi qua Authorization header
- Validate trên mọi protected route

### Route Protection

- Backend: `checkAuth` macro
- Frontend: Protected layout kiểm tra token

## Database Rules

1. **Schema Management**: Tất cả models phải được định nghĩa trong `prisma/schema.prisma`
2. **Migrations**:
  - Tạo migration: `bun run db:migrate`
  - Generate client: `bun run db:generate`
3. **Indexes**: Thêm indexes cho các trường thường query (userId, date, type, etc.)

## Testing

- Unit tests cho services
- Integration tests cho các flow quan trọng (transactions & P&L)
- Test coverage tối thiểu cho business logic

## Git Commit Messages

- Sử dụng conventional commits
- Format: `type(scope): description`
- Ví dụ: `feat(accounts): add account creation endpoint`

## Best Practices

1. **DRY (Don't Repeat Yourself)**: Tái sử dụng code khi có thể
2. **KISS (Keep It Simple, Stupid)**: Giữ code đơn giản và dễ hiểu
3. **Separation of Concerns**: Tách biệt logic rõ ràng
4. **Type Safety**: Luôn sử dụng types, tránh `any`
5. **Error Handling**: Xử lý errors một cách rõ ràng và user-friendly
6. **Performance**: Tối ưu queries và renders khi cần
7. **Accessibility**: Đảm bảo UI accessible

## Checklist Khi Tạo Feature Mới

- [ ] Tuân theo naming conventions
- [ ] Thêm validation schemas (backend)
- [ ] Thêm error handling
- [ ] Thêm types (TypeScript)
- [ ] Update documentation nếu cần
- [ ] Test functionality
- [ ] Format code với Biome
- [ ] Check linting errors

