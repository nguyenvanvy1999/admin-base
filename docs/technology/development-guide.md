# Hướng Dẫn Phát Triển

Tài liệu này hướng dẫn các tác vụ phát triển phổ biến trong dự án FinTrack.

## Advanced Login Security

- `ENB_SECURITY_DEVICE_RECOGNITION`: bật so khớp fingerprint dựa trên `userAgent` + `clientIp`. Khi tắt, luồng login hoạt động như trước.
- `ENB_SECURITY_AUDIT_WARNING`: ghi `security_events` + audit log ở mức WARNING khi phát hiện thiết bị lạ.
- `ENB_SECURITY_BLOCK_UNKNOWN_DEVICE`: từ chối đăng nhập nếu thiết bị chưa từng thấy (sau khi đã ghi cảnh báo).

### Luồng xử lý

1. `AuthService` gọi `SecurityMonitorService.evaluateLogin` ngay sau khi xác thực mật khẩu (và trong bước xác nhận MFA/OAuth).
2. Hệ thống tìm `session` cùng `deviceFingerprint` trước đó. Nếu có, đăng nhập tiếp tục bình thường.
3. Nếu thiết bị lạ:
   - Khi `ENB_SECURITY_AUDIT_WARNING=true`, tạo bản ghi `security_events` + audit log với `error=unknown_device`.
   - Khi `ENB_SECURITY_BLOCK_UNKNOWN_DEVICE=true`, trả lỗi `ErrCode.SuspiciousLoginBlocked`.
   - Nếu không chặn, fingerprint mới được lưu vào session vừa tạo để các lần sau được nhận diện.
4. Bối cảnh bảo mật (fingerprint, trạng thái thiết bị) được truyền qua bước MFA thông qua `mfaCache`, bảo đảm phiên cuối cùng luôn có fingerprint chính xác.

## Thêm API Endpoint Mới

### Bước 1: Tạo DTO (`src/dto/`)

```typescript
// src/dto/myentity.dto.ts
import { t } from "elysia";

export const CreateMyEntityDto = t.Object({
    name: t.String(),
    // ... other fields
});

export type ICreateMyEntityDto = typeof CreateMyEntityDto.static;
```

### Bước 2: Tạo/Update Service (`src/services/`)

```typescript
// src/services/MyEntityService.ts
import { Elysia } from "elysia";
import { prisma } from "../libs/db";
import type { ICreateMyEntityDto } from "../dto/myentity.dto";

export class MyEntityService {
    async createMyEntity(userId: string, data: ICreateMyEntityDto) {
        // Business logic here
        return prisma.myEntity.create({
            data: { userId, ...data },
        });
    }
}

// Export as Elysia plugin for dependency injection
export default new Elysia().decorate("myEntityService", new MyEntityService());
```

### Bước 3: Tạo/Update Controller (`src/controllers/`)

```typescript
// src/controllers/myentity.controller.ts
import { Elysia } from "elysia";
import { CreateMyEntityDto } from "../dto/myentity.dto";
import authMacro from "../macros/auth";
import myEntityService from "../services/MyEntityService";

const myEntityController = new Elysia()
    .group("/myentities", (group) =>
        group
            .use(myEntityService)
            .use(authMacro)
            .post("/", async ({ user, body, myEntityService }) => {
                return myEntityService.createMyEntity(user.id, body);
            }, {
                checkAuth: ["user"],
                body: CreateMyEntityDto,
                detail: { 
                    tags: ["MyEntity"], 
                    security: [{ JwtAuth: [] }] 
                },
            })
    );

export default myEntityController;
```

### Bước 4: Thêm vào Main App (`src/index.ts`)

```typescript
.group("/api", (group) =>
    group
        .use(myEntityController) // Thêm ở đây
)
```

### Bước 5: Tạo Frontend Types (`client/types/`)

```typescript
// client/types/myentity.ts
export type MyEntityFull = {
    id: string;
    name: string;
    // ... other fields
};

export type MyEntityFormData = {
    id?: string;
    name: string;
    // ... other fields
};
```

### Bước 6: Tạo Query Hook (`client/hooks/queries/`)

```typescript
// client/hooks/queries/useMyEntityQueries.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "src/libs/api";

export const useMyEntitiesQuery = (query = {}) => {
    return useQuery({
        queryKey: ["myentities", query],
        queryFn: async () => {
            const response = await api.api.myentities.get({ query });
            if (response.error) {
                throw new Error(response.error.value?.message);
            }
            return response.data;
        },
    });
};
```

### Bước 7: Tạo Mutation Hook (`client/hooks/mutations/`)

```typescript
// client/hooks/mutations/useMyEntityMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useToast from "src/hooks/useToast";
import { api } from "src/libs/api";
import type { MyEntityFormData } from "src/types/myentity";

export const useCreateMyEntityMutation = () => {
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: MyEntityFormData) => {
            const response = await api.api.myentities.post(data);
            if (response.error) {
                throw new Error(response.error.value?.message);
            }
            return response.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["myentities"] });
            showSuccess("Created successfully");
        },
        onError: (error: Error) => {
            showError(error.message);
        },
    });
};
```

### Bước 8: Tạo Page Component (`client/pages/`)

```typescript
// client/pages/MyEntityPage.tsx
import { useMyEntitiesQuery } from "src/hooks/queries/useMyEntityQueries";
import { useCreateMyEntityMutation } from "src/hooks/mutations/useMyEntityMutations";

const MyEntityPage = () => {
    const { data, isLoading } = useMyEntitiesQuery();
    const createMutation = useCreateMyEntityMutation();

    // ... component logic
};
```

## Thêm Database Model Mới

### Bước 1: Thêm Model vào Prisma Schema (`prisma/schema.prisma`)

```prisma
model MyEntity {
  id        String   @id @default(uuidv7())
  userId    String   @map("user_id")
  name      String
  created DateTime @default(now()) @map("created_at")
  modified DateTime @modified @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("my_entities")
}
```

### Bước 2: Generate Migration

```bash
bun run db:migrate
bun run db:generate
```

### Bước 3: Sử dụng trong Services

```typescript
import { prisma } from "../libs/db";

const item = await prisma.myEntity.findUnique({
    where: { id },
});
```

## Thêm Protected Frontend Route

### Bước 1: Thêm Route Definition (`client/router.ts`)

```typescript
import { createHashRouter } from "react-router";

const router = createHashRouter([
    {
        Component: ProtectedPageLayout,
        children: [
            { path: "/newpage", Component: NewPage }, // Protected
        ],
    },
]);
```

### Bước 2: Tạo Page Component (`client/pages/NewPage.tsx`)

```typescript
import useUserStore from "src/store/user";

const NewPage = () => {
    const { user } = useUserStore(); // Access user
    return <div>{/* Content */}</div>;
};
```

## Thêm Authentication vào Endpoint

```typescript
// Trong controller
.get("/protected", handler, {
    checkAuth: ["user"], // Yêu cầu "user" hoặc "admin" role
    detail: {
        tags: ["Protected"],
        security: [{ JwtAuth: [] }], // Swagger UI auth
    },
});

// Handler nhận user
async ({ user }) => {
    console.log(user.id, user.role);
    // ... logic
}
```

## Troubleshooting

### 1. "Token not found" error

- Kiểm tra localStorage có `ACCESS_TOKEN_KEY`
- Verify Authorization header format: `Bearer <token>`

### 2. Routes không hoạt động trong production

- Đảm bảo sử dụng Hash Router, không phải Browser Router
- Kiểm tra static files được serve đúng cách

### 3. Database connection fails

- Verify `POSTGRESQL_URI` trong .env
- Kiểm tra PostgreSQL đang chạy
- Đảm bảo database tồn tại
- Chạy migrations: `bun run db:migrate`

### 4. Types không sync giữa frontend/backend

- Restart dev server để regenerate types
- Kiểm tra `src` path alias trong tsconfig.json
- Verify Eden Treaty được cấu hình đúng

### 5. Query không refetch sau mutation

- Đảm bảo `queryClient.invalidateQueries()` được gọi trong `onSuccess`
- Kiểm tra query key khớp chính xác

### 6. Prisma Client không được generate

```bash
# Generate Prisma client
bun run db:generate

# Nếu vẫn lỗi, xóa và generate lại
rm -rf src/generated/prisma
bun run db:generate
```

### 7. Biome format không hoạt động

```bash
# Check Biome config
bun run check

# Format manually
bun run format

# Lint manually
bun run lint
```

## Development Commands

```bash
# Install dependencies
bun install

# Database migrations
bun run db:migrate      # Tạo migration
bun run db:generate     # Generate Prisma client
bun run db:deploy       # Deploy migrations
bun run db:dev:reset    # Reset database (dev only)

# Code formatting & linting
bun run format          # Format code với Biome
bun run lint            # Lint code với Biome
bun run check           # Format và lint

# Development với hot reload
bun run dev

# Build cho production (compile to binary)
bun run build

# Start production server
bun start
```

## Testing API Endpoints

### Sử dụng Swagger UI

1. Start server: `bun run dev`
2. Mở: http://localhost:3000/docs
3. Click "Authorize" và nhập JWT token
4. Test endpoints trực tiếp

### Sử dụng Eden Treaty (Frontend)

```typescript
// Fully typed API calls
const response = await api.api.accounts.post({
    type: AccountType.cash,
    name: "Cash Account",
    currencyId: "xxx",
});

if (response.error) {
    console.error(response.error.value?.message);
} else {
    console.log(response.data); // TypeScript biết shape
}
```

## Common Patterns

### Upsert Pattern (Create or Update)

```typescript
async upsertAccount(userId: string, data: IUpsertAccountDto) {
    if (data.id) {
        return prisma.account.update({
            where: { id: data.id, userId },
            data: { ...data },
        });
    }
    return prisma.account.create({
        data: { userId, ...data },
    });
}
```

### List với Pagination

```typescript
async listAccounts(userId: string, query: ListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
        prisma.account.findMany({
            where: { userId },
            skip,
            take: limit,
        }),
        prisma.account.count({ where: { userId } }),
    ]);

    return {
        accounts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
```

### Error Handling trong Service

```typescript
async getAccount(userId: string, id: string) {
    const account = await prisma.account.findFirst({
        where: { id, userId },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    return account;
}
```

