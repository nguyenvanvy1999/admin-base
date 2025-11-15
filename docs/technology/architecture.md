# Kiến Trúc Hệ Thống

Tài liệu này mô tả kiến trúc và các patterns được sử dụng trong dự án FinTrack.

## Tổng Quan Kiến Trúc

FinTrack sử dụng kiến trúc layered với separation of concerns rõ ràng:

- **Controller Layer**: Xử lý HTTP requests/responses
- **Service Layer**: Business logic và data processing
- **Database Layer**: Prisma ORM với PostgreSQL
- **Middleware**: Error handling, authentication, validation

## Cấu Trúc Thư Mục

```
fin-track/
├── src/                      # Backend (Elysia.js)
│   ├── controllers/          # API endpoint handlers
│   ├── services/             # Business logic layer
│   ├── middlewares/          # Request/response processors
│   ├── macros/               # Elysia macros (auth, etc.)
│   ├── dto/                  # Data Transfer Objects (validation schemas)
│   ├── constants/            # Backend constants
│   ├── libs/                 # Utilities (db, logger, env)
│   ├── generated/            # Generated Prisma client
│   ├── scripts/              # Utility scripts (seed, etc.)
│   └── index.ts              # Server entry point
│
├── client/                   # Frontend (React)
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   ├── layouts/              # Layout wrappers
│   ├── store/                # Zustand stores (global state)
│   ├── hooks/                # Custom React hooks
│   ├── libs/                 # Utilities & API client
│   ├── types/                # TypeScript type definitions
│   ├── providers/            # React context providers
│   └── styles/               # Global styles & theme
```

## Backend Architecture

### Controller Pattern

Controllers xử lý HTTP requests và responses, delegate business logic cho services.

```typescript
// src/controllers/account.controller.ts
import { Elysia, t } from "elysia";
import { UpsertAccountDto, ListAccountsQueryDto } from "../dto/account.dto";
import authMacro from "../macros/auth";
import accountService from "../services/account.service";

const accountController = new Elysia()
    .group("/accounts", {
        detail: {
            tags: ["Account"],
            description: "Account management endpoints",
        },
    }, (group) =>
        group
            .use(accountService)
            .use(authMacro)
            .post("/", async ({ user, body, accountService }) => {
                return accountService.upsertAccount(user.id, body);
            }, {
                checkAuth: ["user"],
                body: UpsertAccountDto,
                detail: {
                    tags: ["Account"],
                    security: [{ JwtAuth: [] }],
                    summary: "Create or update account",
                },
            })
            .get("/", async ({ user, query, accountService }) => {
                return accountService.listAccounts(user.id, query);
            }, {
                checkAuth: ["user"],
                query: ListAccountsQueryDto,
                detail: {
                    tags: ["Account"],
                    security: [{ JwtAuth: [] }],
                    summary: "List all accounts",
                },
            })
    );

export default accountController;
```

### Service Pattern

Services chứa business logic và data processing, được export như Elysia plugin để dependency injection.

```typescript
// src/services/AccountService.ts
import { Elysia } from "elysia";
import { prisma } from "../libs/db";
import type { IUpsertAccountDto } from "../dto/account.dto";

export class AccountService {
    async upsertAccount(userId: string, data: IUpsertAccountDto) {
        if (data.id) {
            return prisma.account.update({
                where: { id: data.id, userId },
                data: {
                    name: data.name,
                    type: data.type,
                    currencyId: data.currencyId,
                    // ... other fields
                },
            });
        }
        return prisma.account.create({
            data: {
                userId,
                name: data.name,
                type: data.type,
                currencyId: data.currencyId,
                // ... other fields
            },
        });
    }

    async listAccounts(userId: string, query: any) {
        // Business logic here
        const accounts = await prisma.account.findMany({
            where: { userId },
            // ... query logic
        });
        return { accounts, pagination: {} };
    }
}

// Export as Elysia plugin for dependency injection
export default new Elysia().decorate("accountService", new AccountService());
```

### DTO Pattern

DTOs định nghĩa validation schemas sử dụng TypeBox (Elysia `t`), và extract TypeScript types.

```typescript
// src/dto/account.dto.ts
import { t } from "elysia";
import { AccountType } from "../generated/prisma/enums";

export const UpsertAccountDto = t.Object({
    id: t.Optional(t.String()),
    type: t.Enum(AccountType),
    name: t.String(),
    currencyId: t.String(),
    initialBalance: t.Optional(t.Number()),
});

export type IUpsertAccountDto = typeof UpsertAccountDto.static;
```

### Auth Macro Pattern

Macro system của Elysia cho phép tạo custom functionality như authentication checking.

```typescript
// src/macros/auth.ts
import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { UserRole } from "../generated/prisma/enums";

const authMacro = new Elysia()
    .macro({
        checkAuth(roles: string[]) {
            return {
                resolve({ headers }) {
                    const token = headers.authorization?.split(" ")[1];
                    if (!token) {
                        throw new Error("Token not found");
                    }
                    const decoded = jwt.verify(token, appEnv.JWT_SECRET!) as any;
                    if (!roles.includes(decoded.role)) {
                        throw new Error("Permission denied");
                    }
                    return { user: decoded };
                },
            };
        },
    });

export default authMacro;
```

## Frontend Architecture

### API Client Pattern (Eden Treaty)

Eden Treaty cung cấp type-safe API client với auto-generated types từ backend.

```typescript
// client/libs/api.ts
import { treaty } from "@elysiajs/eden";
import type { app } from "@server";
import { ACCESS_TOKEN_KEY } from "@client/constants";

export const api = treaty<typeof app>(window.location.origin, {
    onRequest() {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (accessToken) {
            return {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            };
        }
    },
});
```

### Query Hooks Pattern (TanStack Query)

Query hooks sử dụng TanStack Query để fetch và cache server state.

```typescript
// client/hooks/queries/useAccountQueries.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@client/libs/api";
import type { AccountFull } from "@client/types/account";

type ListAccountsQuery = {
    type?: AccountType[];
    currencyId?: string[];
    search?: string;
    page?: number;
    limit?: number;
};

export const useAccountsQuery = (query: ListAccountsQuery = {}) => {
    return useQuery({
        queryKey: ["accounts", query],
        queryFn: async () => {
            const response = await api.api.accounts.get({ query });

            if (response.error) {
                throw new Error(
                    response.error.value?.message ?? "Failed to fetch accounts"
                );
            }

            return {
                accounts: response.data.accounts.map((account) => ({
                    ...account,
                    balance: account.balance.toString(),
                })) satisfies AccountFull[],
                pagination: response.data.pagination,
            };
        },
    });
};
```

### Mutation Hooks Pattern (TanStack Query)

Mutation hooks xử lý data mutations với automatic query invalidation.

```typescript
// client/hooks/mutations/useAccountMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useToast from "@client/hooks/useToast";
import { api } from "@client/libs/api";
import type { AccountFormData } from "@client/types/account";

export const useCreateAccountMutation = () => {
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<AccountFormData, "id">) => {
            const response = await api.api.accounts.post(data);
            if (response.error) {
                throw new Error(
                    response.error.value?.message ?? "An unknown error occurred"
                );
            }
            return response.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["accounts"] });
            showSuccess("Account created successfully");
        },
        onError: (error: Error) => {
            showError(error.message);
        },
    });
};
```

### Store Pattern (Zustand)

Zustand stores quản lý global state như user info và theme preferences.

```typescript
// client/store/user.ts
import { create } from "zustand";

export type UserStore = {
    user: User;
    setUser: (user: User) => void;
    clearUser: () => void;
};

const useUserStore = create<UserStore>((set) => ({
    user: defaultUser,
    setUser: (user: User) => set({ user }),
    clearUser: () => set({ user: defaultUser }),
}));

export default useUserStore;
```

### DataTable Component Pattern

DataTable component tái sử dụng với sorting, filtering, pagination.

```typescript
// client/components/AccountTable.tsx
import DataTable from "./DataTable";
import { createColumnHelper } from "@tanstack/react-table";
import type { AccountFull } from "@client/types/account";

const columnHelper = createColumnHelper<AccountFull>();

const AccountTable = ({ accounts, onEdit, onDelete }) => {
    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: t("accounts.name"),
                enableSorting: true,
            }),
            columnHelper.accessor("balance", {
                header: t("accounts.balance"),
                cell: (info) => formatCurrency(info.getValue(), account.currency.symbol),
            }),
            // ... more columns
        ],
        []
    );

    return (
        <DataTable
            data={accounts}
            columns={columns}
            pagination={pagination}
            search={{ onSearch: handleSearch }}
            filters={{ slots: filterSlots, onReset: handleResetFilters }}
            actions={{ onEdit, onDelete }}
        />
    );
};
```

### Toast Notifications Pattern

Toast notifications sử dụng Mantine Notifications với custom hook.

```typescript
// client/hooks/useToast.tsx
import { notifications } from "@mantine/notifications";
import { Check, Close } from "@mui/icons-material";

const useToast = () => {
    return {
        showSuccess: (message: string, duration?: number) =>
            notifications.show({
                message,
                color: "teal",
                icon: <Check />,
                autoClose: duration ?? 5000,
            }),
        showError: (message: string, duration?: number) =>
            notifications.show({
                message,
                color: "red",
                icon: <Close />,
                autoClose: duration ?? 5000,
            }),
    };
};
```

### i18n Pattern

Internationalization sử dụng i18next với react-i18next.

```typescript
// client/i18n.ts
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        lng: "vi",
        fallbackLng: "vi",
        resources: {
            en: { translation: enTranslations },
            vi: { translation: viTranslations },
        },
    });

// Usage in component
import { useTranslation } from "react-i18next";

const AccountPage = () => {
    const { t } = useTranslation();
    return <h1>{t("accounts.title")}</h1>;
};
```

### Protected Route Pattern

Protected routes kiểm tra authentication và redirect nếu cần.

```typescript
// client/layouts/index.tsx
const ProtectedPageLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
            navigate("/login");
        }
    }, [location.pathname]);

    return (
        <div>
            <Header />
            <Outlet />
            <Footer />
        </div>
    );
};
```

### Router Pattern (CRITICAL)

**QUAN TRỌNG**: Phải sử dụng Hash Router để tránh conflict với server routes.

```typescript
// client/router.ts
import { createHashRouter } from "react-router"; // ✅ Hash Router

// ❌ NEVER use createBrowserRouter - conflicts with static serving
const router = createHashRouter([
    {
        Component: ProtectedPageLayout,
        children: [
            { path: "/", Component: HomePage },
            { path: "/accounts", Component: AccountPage },
            // ... more routes
        ],
    },
    { path: "/login", Component: LoginPage },
    { path: "/register", Component: RegisterPage },
]);
```

## State Management Patterns

### Global State (Zustand)

Chỉ sử dụng cho state cần share giữa nhiều components:

- User information
- Theme preferences
- UI state (sidebar open/close)

### Server State (TanStack Query)

Luôn sử dụng cho API data:

- Accounts, Transactions, Investments
- Automatic caching và synchronization
- Background refetching

### Local State (useState)

Sử dụng cho component-specific state:

- Form inputs
- Dialog open/close
- Selected items

## Type Safety Patterns

### Eden Treaty (End-to-End Types)

Types tự động generate từ backend, không cần định nghĩa lại.

### Prisma Generated Types

Sử dụng types từ Prisma generated client cho database models.

### Frontend Type Definitions

Định nghĩa types riêng cho frontend trong `client/types/` khi cần transform data.

## Best Practices

1. **Separation of Concerns**: Controllers chỉ xử lý HTTP, Services chứa business logic
2. **Dependency Injection**: Sử dụng Elysia plugins để inject dependencies
3. **Type Safety**: Luôn sử dụng types từ backend, tránh định nghĩa lại
4. **Query Invalidation**: Luôn invalidate queries sau mutations
5. **Error Handling**: Centralized error handling trong middleware và hooks

