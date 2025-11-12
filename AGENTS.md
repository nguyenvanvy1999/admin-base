# FinTrack - Personal Finance & Investment Management

## Project Overview

FinTrack is a modern fullstack TypeScript application for personal finance and investment management, built with Bun
runtime, featuring Elysia.js backend and React frontend with end-to-end type safety via Eden Treaty.

**Key Features:**

- 🔥 Hot reload development with Bun (no bundlers needed)
- 🛡️ JWT authentication with macro-based route protection
- 📊 Prisma ORM for type-safe database operations with PostgreSQL
- ⚛️ React 19 with Mantine UI + Tailwind CSS
- 🔗 Eden Treaty for end-to-end type safety
- 📚 Auto-generated Swagger documentation
- 🌐 Internationalization (i18n) support
- 📊 Advanced data tables with sorting, filtering, pagination
- 🔄 TanStack Query for server state management
- 🎨 Modern UI components with Mantine UI v8

## Tech Stack

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

## Project Structure

```
fin-track/
├── src/                      # Backend (Elysia.js)
│   ├── controllers/          # API endpoint handlers
│   │   └── *.controller.ts   # Pattern: [name].controller.ts
│   ├── services/             # Business logic layer
│   │   └── *Service.ts       # Pattern: [Name]Service.ts
│   ├── middlewares/          # Request/response processors
│   │   └── error-middleware.ts
│   ├── macros/               # Elysia macros (e.g., auth)
│   │   └── auth.ts           # JWT authentication macro
│   ├── dto/                  # Data Transfer Objects
│   │   └── *.dto.ts          # Pattern: [name].dto.ts
│   ├── constants/            # Backend constants
│   ├── libs/                 # Utilities (db, logger, env)
│   ├── generated/            # Generated Prisma client
│   │   └── prisma/           # Prisma client types and models
│   ├── scripts/              # Utility scripts (seed, etc.)
│   └── index.ts              # Server entry point
│
├── client/                   # Frontend (React)
│   ├── components/           # Reusable UI components
│   │   ├── DataTable/         # DataTable component & utilities
│   │   ├── utils/             # Component utilities
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── pages/                # Page components
│   │   └── *Page.tsx         # Pattern: [Name]Page.tsx
│   ├── layouts/              # Layout wrappers
│   │   └── index.tsx         # ProtectedPageLayout
│   ├── store/                # Zustand stores (global state)
│   │   └── user.ts           # User state management
│   ├── hooks/                # Custom React hooks
│   │   ├── queries/          # TanStack Query hooks
│   │   │   └── use*Queries.ts # Pattern: use[Name]Queries.ts
│   │   ├── mutations/        # TanStack Query mutation hooks
│   │   │   └── use*Mutations.ts # Pattern: use[Name]Mutations.ts
│   │   └── useToast.tsx      # Toast notification hook
│   ├── libs/                 # Utilities & API client
│   │   ├── api.ts            # Eden Treaty API client
│   │   └── queryClient.ts    # TanStack Query client config
│   ├── types/                # TypeScript type definitions
│   │   └── *.ts              # Pattern: [name].ts
│   ├── providers/            # React context providers
│   │   └── MantineProvider.tsx
│   ├── styles/               # Global styles & theme
│   ├── locales/              # i18n translation files
│   │   ├── en/
│   │   └── vi/
│   ├── constants.ts          # App constants
│   ├── router.ts             # Route definitions (Hash Router)
│   ├── i18n.ts               # i18n configuration
│   ├── index.tsx             # React entry point
│   ├── index.html            # HTML template
│   └── global.css            # Global styles (Tailwind import)
│
├── prisma/                    # Prisma schema and migrations
│   ├── schema.prisma         # Database schema definition
│   └── migrations/           # Database migration files
├── logs/                     # Application logs
├── biome.json                # Biome configuration (formatter & linter)
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── bunfig.toml               # Bun configuration
└── Dockerfile                # Container configuration
```

## Implementation Status

### ✅ Completed Features

#### Backend

- [x] Database schema design (Prisma)
- [x] User authentication (JWT)
- [x] Account management (CRUD)
- [x] Category management (CRUD)
- [x] Entity management (CRUD)
- [x] Tag management (CRUD)
- [x] Currency management
- [x] Transaction management (CRUD)
- [x] Error handling middleware
- [x] Logging system (Logtape)
- [x] Swagger documentation
- [x] DTO validation schemas

#### Frontend

- [x] Authentication pages (Login/Register)
- [x] User store (Zustand)
- [x] API client (Eden Treaty)
- [x] Query client setup (TanStack Query)
- [x] Account management page
- [x] Category management page
- [x] Entity management page
- [x] Tag management page
- [x] DataTable component
- [x] Toast notifications (Mantine)
- [x] i18n setup (i18next)
- [x] Mantine UI provider
- [x] Theme support
- [x] Protected routes
- [x] Query hooks pattern
- [x] Mutation hooks pattern

### 🚧 In Progress

- [ ] Investment management
- [ ] Budget management
- [ ] Recurring transactions
- [ ] Reports & analytics
- [ ] Dashboard with charts

### 📋 Planned Features

- [ ] Price sync service (CoinGecko, NAV feed)
- [ ] Holdings & P&L calculations
- [ ] Portfolio view
- [ ] Cashflow reports
- [ ] Export functionality (CSV/PDF)
- [ ] Mobile responsive improvements

## Architecture Patterns

### 1. Backend Architecture (Elysia.js)

#### Controller Pattern

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

#### Service Pattern

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

#### DTO Pattern

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

#### Auth Macro Pattern

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
                    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
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

### 2. Frontend Architecture (React)

#### API Client Pattern (Eden Treaty)

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

#### Query Hooks Pattern (TanStack Query)

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
        queryFn:() => {
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

#### Mutation Hooks Pattern (TanStack Query)

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

#### Store Pattern (Zustand)

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

#### DataTable Component Pattern

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

#### Toast Notifications Pattern

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

#### i18n Pattern

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

#### Protected Route Pattern

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

#### Router Pattern (CRITICAL)

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

## Critical Rules & Conventions

### 🚨 MUST FOLLOW

1. **Hash Router Required**
    - ALWAYS use `createHashRouter` from `react-router`
    - NEVER use `createBrowserRouter`
    - Reason: Static file serving mounts at `/`, browser router conflicts with server routes

2. **Prisma Schema Management**
    - New models MUST be added to `prisma/schema.prisma`
    - Run `bun run db:migrate` to create migration
    - Run `bun run db:generate` to generate Prisma client
    - Schema changes require migration generation

3. **Protected Routes**
   ```typescript
   // Backend
   .get("/endpoint", handler, {
       checkAuth: ["user"], // or ["admin"]
       detail: {
           security: [{ JwtAuth: [] }], // For Swagger
       },
   });

   // Frontend
   const token = localStorage.getItem(ACCESS_TOKEN_KEY);
   // Token auto-added to requests via api.ts onRequest
   ```

4. **Code Style (Biome)**
    - Use Biome for formatting and linting
    - Run `bun run check` to format and lint
    - Configuration in `biome.json`

5. **State Management Rules**
    - **Zustand**: Only for global state (user, theme, preferences)
    - **TanStack Query**: Always for server state (API data)
    - **useState**: For component-specific state
    - Always invalidate queries after mutations

6. **Type Safety Rules**
    - Always use Eden Treaty types from backend
    - Use Prisma generated types for database models
    - Avoid `any`, prefer `unknown` with type guards
    - Use `satisfies` instead of `as` when possible

### 📁 Naming Conventions

| Type           | Pattern                 | Example                  |
|----------------|-------------------------|--------------------------|
| Controllers    | `[name].controller.ts`  | `user.controller.ts`     |
| Services       | `[Name]Service.ts`      | `UserService.ts`         |
| DTOs           | `[name].dto.ts`         | `user.dto.ts`            |
| Pages          | `[Name]Page.tsx`        | `LoginPage.tsx`          |
| Components     | `[Name].tsx`            | `Header.tsx`             |
| Query Hooks    | `use[Name]Queries.ts`   | `useAccountQueries.ts`   |
| Mutation Hooks | `use[Name]Mutations.ts` | `useAccountMutations.ts` |
| Types          | `[name].ts`             | `account.ts`             |
| Stores         | `[name].ts`             | `user.ts`                |

## Common Development Tasks

### Adding a New API Endpoint

1. **Create DTO** (`src/dto/`)

```typescript
// src/dto/myentity.dto.ts
import { t } from "elysia";

export const CreateMyEntityDto = t.Object({
    name: t.String(),
    // ... other fields
});

export type ICreateMyEntityDto = typeof CreateMyEntityDto.static;
```

2. **Create/Update Service** (`src/services/`)

```typescript
// src/services/MyEntityService.ts
export class MyEntityService {
    async createMyEntity(userId: string, data: ICreateMyEntityDto) {
        // Business logic here
        return prisma.myEntity.create({
            data: { userId, ...data },
        });
    }
}

export default new Elysia().decorate("myEntityService", new MyEntityService());
```

3. **Create/Update Controller** (`src/controllers/`)

```typescript
// src/controllers/myentity.controller.ts
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
                detail: { tags: ["MyEntity"], security: [{ JwtAuth: [] }] },
            })
    );

export default myEntityController;
```

4. **Add to Main App** (`src/index.ts`)

```typescript
.group("/api", (group) =>
    group
        .use(myEntityController) // Add here
)
```

5. **Create Frontend Types** (`client/types/`)

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

6. **Create Query Hook** (`client/hooks/queries/`)

```typescript
// client/hooks/queries/useMyEntityQueries.ts
export const useMyEntitiesQuery = (query = {}) => {
    return useQuery({
        queryKey: ["myentities", query],
        queryFn:() => {
            const response = await api.api.myentities.get({ query });
            if (response.error) throw new Error(response.error.value?.message);
            return response.data;
        },
    });
};
```

7. **Create Mutation Hook** (`client/hooks/mutations/`)

```typescript
// client/hooks/mutations/useMyEntityMutations.ts
export const useCreateMyEntityMutation = () => {
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: MyEntityFormData) => {
            const response = await api.api.myentities.post(data);
            if (response.error) throw new Error(response.error.value?.message);
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

8. **Create Page Component** (`client/pages/`)

```typescript
// client/pages/MyEntityPage.tsx
const MyEntityPage = () => {
    const { data, isLoading } = useMyEntitiesQuery();
    const createMutation = useCreateMyEntityMutation();

    // ... component logic
};
```

### Adding a New Database Model

1. **Add Model to Prisma Schema** (`prisma/schema.prisma`)

```prisma
model MyEntity {
  id        String   @id @default(uuidv7())
  userId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

2. **Generate Migration**

```bash
bun run db:migrate
bun run db:generate
```

3. **Use in Services**

```typescript
import { prisma } from "../libs/db";

const item = await prisma.myEntity.findUnique({
    where: { id },
});
```

### Adding a Protected Frontend Route

1. **Add Route Definition** (`client/router.ts`)

```typescript
const router = createHashRouter([
    {
        Component: ProtectedPageLayout,
        children: [
            { path: "/newpage", Component: NewPage }, // Protected
        ],
    },
]);
```

2. **Create Page Component** (`client/pages/NewPage.tsx`)

```typescript
const NewPage = () => {
    const { user } = useUserStore(); // Access user
    return <div>{/* Content */}</div>;
};
```

### Adding Authentication to Endpoint

```typescript
// In controller
.get("/protected", handler, {
    checkAuth: ["user"], // Require "user" or "admin" role
    detail: {
        tags: ["Protected"],
        security: [{ JwtAuth: [] }], // Swagger UI auth
    },
});

// Handler receives user
async ({ user }) => {
    console.log(user.id, user.role);
    // ... logic
}
```

## Environment Variables

Create `.env` file:

```env
POSTGRES_URL=postgresql://user:password@localhost:5432/investment
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
```

## Development Commands

```bash
# Install dependencies
bun install

# Database migrations
bun run db:migrate      # Create migration
bun run db:generate     # Generate Prisma client
bun run db:deploy       # Deploy migrations
bun run db:dev:reset    # Reset database (dev only)

# Code formatting & linting
bun run format          # Format code with Biome
bun run lint            # Lint code with Biome
bun run check            # Format and lint

# Development with hot reload
bun run dev

# Build for production (compile to binary)
bun run build

# Start production server
bun start
```

## API Documentation

- **Swagger UI**: http://localhost:3000/docs
- Auto-generated from Elysia route definitions
- JWT authentication support built-in

## Testing API Endpoints

### Using Swagger UI

1. Start server: `bun run dev`
2. Open: http://localhost:3000/docs
3. Click "Authorize" and enter JWT token
4. Test endpoints directly

### Using Eden Treaty (Frontend)

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
    console.log(response.data); // TypeScript knows the shape
}
```

## Error Handling

### Backend

```typescript
// In handlers - throw errors
if (!user) {
    throw new Error("User not found"); // Auto-handled by middleware
}

// error-middleware.ts catches and formats
return {
    message: error.message,
    status: 400,
};
```

### Frontend

```typescript
// API calls return { data, error }
const response = await api.api.accounts.post(body);

if (response.error) {
    const errorMsg = response.error.value?.message ?? "Unknown error";
    // Show error toast
} else {
    const data = response.data;
    // Success logic
}

// Or use mutation hooks (recommended)
const mutation = useCreateAccountMutation();
// Error handling is done in the hook
```

## Security Considerations

1. **Password Hashing**

```typescript
// Use Bun's built-in bcrypt
const hashed = await Bun.password.hash(password, "bcrypt");
const isValid = await Bun.password.verify(password, hashed, "bcrypt");
```

2. **JWT Tokens**
    - Stored in localStorage (client-side)
    - Sent via Authorization header
    - Validated on every protected route

3. **Route Protection**
    - Backend: `checkAuth` macro
    - Frontend: Protected layout checks token

## Deployment

### Docker

```bash
# Build image
docker build -t fin-track .

# Run container
docker run -p 3000:3000 --env-file .env fin-track
```

### Production Build

```bash
# Compile to standalone binary
bun run build

# Run binary
./server
```

## Troubleshooting

### Common Issues

1. **"Token not found" error**
    - Check localStorage has `ACCESS_TOKEN_KEY`
    - Verify Authorization header format: `Bearer <token>`

2. **Routes not working in production**
    - Ensure using Hash Router, not Browser Router
    - Check static files are being served correctly

3. **Database connection fails**
    - Verify POSTGRES_URL in .env
    - Check PostgreSQL is running
    - Ensure database exists
    - Run migrations: `bun run db:migrate`

4. **Types not syncing between frontend/backend**
    - Restart dev server to regenerate types
    - Check `@server` path alias in tsconfig.json
    - Verify Eden Treaty is properly configured

5. **Query not refetching after mutation**
    - Ensure `queryClient.invalidateQueries()` is called in `onSuccess`
    - Check query key matches exactly

## Additional Resources

- [Elysia.js Documentation](https://elysiajs.com)
- [Bun Documentation](https://bun.sh/docs)
- [Eden Treaty Guide](https://elysiajs.com/eden/overview.html)
- [Mantine UI](https://mantine.dev)
- [TanStack Query](https://tanstack.com/query)
- [TanStack Form](https://tanstack.com/form)
- [TanStack Table](https://tanstack.com/table)
- [i18next](https://www.i18next.com)
- [Biome](https://biomejs.dev)

## Contributing Guidelines

When contributing to this project:

1. Follow existing patterns and conventions
2. Update this AGENTS.md if adding new patterns
3. Ensure TypeScript strict mode compliance
4. Test both development and production builds
5. Update Swagger documentation for new endpoints
6. Follow Biome code style (biome.json)
7. Use TanStack Query for all API data
8. Use Zustand only for global state
9. Always add i18n translations for new UI text
10. Write type-safe code with Eden Treaty types

---

**Note for AI Agents**: This file contains the complete context needed to understand, modify, and extend this fullstack
application. Always refer to the patterns and conventions outlined here when generating code.
