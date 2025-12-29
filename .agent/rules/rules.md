## Admin Base Portal - Agent Rules

Tài liệu này cung cấp hướng dẫn để các AI Agent làm việc nhất quán trong dự án Admin Base Portal. Đây là một base project đầy đủ tính năng được thiết kế để tái sử dụng ở các dự án khác. Luôn đọc toàn bộ file trước khi bắt đầu task.

### 1. Tổng quan dự án

- **Mục tiêu**: Admin Base Portal - một base project đầy đủ tính năng quản trị để tái sử dụng ở nhiều dự án khác.
- **Kiến trúc**: Monorepo `admin-base-monorepo` gồm `server` (Bun + Elysia) và `client` (React + Vite).
- **Ngôn ngữ**: TypeScript toàn bộ stack, comment/code bắt buộc tiếng Anh.
- **Type Safety**: Ưu tiên type-safety tuyệt đối (Prisma, Eden Treaty, Zod/TypeBox).

### 2. Tech stack chính

- **Runtime**: Bun (bunfig + scripts trong `package.json` từng app).
- **Backend**: Elysia.js, Prisma ORM, PostgreSQL, JWT auth, policy-based authorization, Logtape logging, BullMQ/Redis.
- **Frontend**: React 19 + Vite, Ant Design 5 + @ant-design/pro-components, TanStack Query, i18next.
- **State Management**: 
  - Server data: TanStack Query (caching, invalidation).
  - Local UI state: React useState.
  - Global preferences: React Context (AuthProvider, ThemeModeProvider).
- **Tooling**: Biome (formatter/linter), TypeScript strict mode, Swagger docs.

### 3. Cấu trúc codebase bắt buộc

#### Backend (`server/src/`)

- `modules/*`: Controllers, DTOs, index theo domain (admin, auth, misc).
- `service/*`: Business services; file pattern `[area].service.ts` hoặc `[area]-[domain].service.ts`.
- `config/*`: Bootstrap config (db, env, logger, pubsub, queue, swagger, error handling).
- `share/*`: Constants, errors, utils, types dùng chung.
- `prisma/`: Schema và migrations.
- `app/backend/`: Entry point cho backend server.
- `app/worker/`: Entry point cho background workers.

#### Frontend (`client/src/`)

- `app/*`: Providers, routes, layouts (MainLayout, AuthLayout).
- `components/*`: Chia `business`, `common`, `ui`. Common components là wrappers cho Ant Design.
- `features/*`: Domain-specific logic (admin, auth, dashboard, settings).
- `services/api/*`: API service modules.
- `hooks/api/*`: Query hooks wrap services.
- `hooks/auth/*`: Authentication hooks.
- `lib/*`: Axios instance, React Query client, utilities.
- `locales/*`: i18n resources (en, vi).
- `types/*`: TypeScript type definitions.
- `store/*`: Global stores (authStore).

### 4. Tính năng core đã có sẵn

Dự án này đã bao gồm các tính năng admin portal cơ bản:

#### Authentication & Authorization
- ✅ User registration & login
- ✅ JWT-based authentication
- ✅ Multi-factor authentication (MFA) với TOTP
- ✅ OTP verification
- ✅ OAuth integration (Google)
- ✅ Password reset & recovery
- ✅ Session management
- ✅ Policy-based authorization (roles & permissions)

#### User Management
- ✅ User CRUD operations
- ✅ User status management (active, inactive, suspended, banned)
- ✅ User detail view
- ✅ IP whitelist management

#### Role & Permission System
- ✅ Role management (CRUD)
- ✅ Permission management
- ✅ Role-permission assignment
- ✅ Permission-based route protection

#### System Management
- ✅ Settings management (key-value với data types: string, number, boolean, date, json)
- ✅ Audit logs (tracking user actions)
- ✅ Session tracking & management
- ✅ Internationalization (i18n) management

#### Infrastructure
- ✅ File upload/download service
- ✅ Email service (React Email templates)
- ✅ Background job processing (BullMQ)
- ✅ Redis caching
- ✅ Database migrations (Prisma)
- ✅ API documentation (Swagger)

### 5. Quy tắc phát triển

1. **Router Hash**: Frontend bắt buộc dùng `createHashRouter`. Nghiêm cấm BrowserRouter.

2. **Schema lifecycle**: 
   - Mọi thay đổi DB phải cập nhật `server/src/prisma/schema.prisma`.
   - Chạy `bun run db:migrate` + `bun run db:generate`.
   - Không chỉnh tay `generated/`.

3. **Auth guard**: 
   - Backend routes cần `checkAuth` + `detail.security`.
   - Frontend sử dụng `ProtectedRoute` và token injection trong `lib/api/client.ts`.

4. **State phân định**:
   - Server data: TanStack Query (invalidate sau mutation).
   - Local UI state: React useState.
   - Global preferences: React Context.

5. **Code style**: 
   - Chạy `bun run check` trước commit/PR.
   - Biome format/lint duy nhất.
   - Không disable rule trừ khi có lý do rõ.

6. **Type safety**: 
   - Tránh `any`.
   - Ưu tiên `satisfies` và types từ Prisma/Eden Treaty.
   - DTO lấy type từ schema `.static`.

7. **Comment**: Chỉ khi cần thiết, tiếng Anh, ngắn gọn giải thích intent.

8. **Error handling**: 
   - Backend throw Error để middleware chuẩn hóa.
   - Frontend luôn kiểm tra `response.error` và dùng `useNotify` để hiển thị.

9. **Security**: 
   - Password dùng `Bun.password.hash` (bcrypt).
   - JWT qua header `Authorization: Bearer`.
   - XSS protection (elysia-xss).
   - Rate limiting (elysia-rate-limit).

### 6. Workflow chuẩn khi tạo feature backend

1. Tạo DTO trong `modules/<domain>/dtos`.
2. Viết service logic (`service/<domain>` hoặc `service/<domain>/<name>.service.ts`).
3. Tạo controller group (`modules/<domain>/controllers`), apply macro auth, schema.
4. Đăng ký module trong `modules/index.ts` hoặc entrypoint tương ứng.
5. Cập nhật Swagger tags nếu cần (config swagger).
6. Viết test (unit + fixtures khi user yêu cầu rõ ràng).

### 7. Workflow chuẩn khi tạo feature frontend

1. Khai báo types trong `client/src/types` hoặc trong chính module nếu chỉ dùng cục bộ.
2. Viết service gọi API tại `client/src/services/api/*.ts`.
3. Wrap service bằng hook trong `client/src/hooks/api` sử dụng TanStack Query.
4. Page/component đặt trong `features/<domain>/pages` hoặc `features/<domain>/components`.
5. Route mới: cập nhật `app/routes.tsx` (hash router) + bảo vệ bằng `ProtectedRoute` nếu yêu cầu auth.
6. UI dùng Ant Design Pro Components (`ProTable`, `ProForm`, `ProDrawer`, `PageHeader`...).
7. Sử dụng common components từ `components/common` (AppTable, AppForm, AppModal, AppDrawer...).

### 8. Naming & conventions

- Backend controllers: `<name>.controller.ts`; services: `<Name>Service.ts` hoặc `<name>-<domain>.service.ts`; DTO: `<name>.dto.ts`.
- DTO/schema export: đặt PascalCase + hậu tố `Dto`; type alias PascalCase dùng hậu tố `Params`/`Result`/`Response`; không export DTO ở dạng camelCase.
- Frontend pages: `<Name>Page.tsx`; hooks: `use<Name>Query.ts` hoặc `use<Name>Mutation.ts`; stores/types lowercase file.
- Environment constants: uppercase snake case.
- Commit message: theo Conventional Commits (`feat(admin): ...`, `fix(auth): ...`).

### 9. Commands quan trọng

```bash
# Root
bun install              # Cài deps cho cả workspace

# Server
cd server
bun run start:server:dev # Chạy backend dev
bun run db:migrate       # Tạo migration
bun run db:generate      # Generate Prisma client
bun run db:deploy        # Deploy migrations
bun run check            # Format + lint
bun run test             # Chạy tests
bun run seed             # Seed database

# Client
cd client
bun run dev              # Chạy frontend dev
bun run build            # Build production
bun run preview          # Preview production build
bun run typecheck        # Type check

# Root scripts
bun run dev:server       # Chạy server từ root
bun run dev:client       # Chạy client từ root
bun run check            # Format + lint toàn bộ
bun run typecheck        # Type check toàn bộ
```

### 10. Quy định review & PR

- PR phải đính kèm mô tả rõ ràng về thay đổi.
- Checklist bắt buộc: format (Biome), test pass, docs cập nhật nếu cần.
- Không merge khi còn TODO/tạm code. Sử dụng `FIXME`/`TODO` khi cần nhưng phải tạo issue liên quan.
- Đảm bảo backward compatibility khi thay đổi API hoặc schema.

### 11. Common pitfalls

- Quên invalidate query sau mutation (TanStack Query) → UI không cập nhật.
- Prisma model đổi nhưng không regenerate → type mismatch.
- Không bật strict mode trong TS config (đã bật sẵn, không chỉnh).
- Tạo thêm wrappers/hàm không có logic → tăng độ phức tạp, khó review.
- Quên thêm route vào `app/routes.tsx` → route không hoạt động.
- Quên thêm permission check trong `ProtectedRoute` → security issue.

### 12. Checklist nhanh cho các AI Agent

- [ ] Đọc task & xác nhận file ảnh hưởng.
- [ ] Tra cứu tính năng tương tự đã có trong codebase để tái sử dụng pattern.
- [ ] Viết code tuân thủ quy tắc sections 4-7.
- [ ] Chạy test/lint liên quan.
- [ ] Cập nhật docs nếu thay đổi hành vi hoặc thêm tính năng mới.
- [ ] Ghi chú bước verify trong final response.

### 13. Quy tắc bổ sung cho các AI Agent

- Không tạo type, function, biến dư thừa nếu không dùng hoặc không mang lại giá trị rõ ràng.
- Không tạo các hàm/class wrapper trống hoặc chỉ forward mà không có logic/mục đích cụ thể.
- Không viết comment khi không thực sự cần; ưu tiên làm code tự đọc hiểu.
- Luôn giữ code clean, dễ hiểu, tránh tối ưu vi mô gây khó maintain.
- Không tách nhỏ hàm đến mức gây phân mảnh; chỉ tách khi có logic độc lập, tái sử dụng hoặc cần test riêng.
- Khi thêm tính năng mới, ưu tiên tái sử dụng components/services đã có thay vì tạo mới.

### 14. Hướng dẫn tái sử dụng project

Khi sử dụng project này làm base cho dự án mới:

1. **Clone & Setup**:
   - Clone repository.
   - Cập nhật tên project trong `package.json` (root, server, client).
   - Setup environment variables từ `.env.example`.

2. **Database**:
   - Tạo database mới.
   - Cập nhật `DATABASE_URL` trong `.env`.
   - Chạy `bun run db:migrate` và `bun run db:generate`.
   - Chạy `bun run seed` để tạo dữ liệu mẫu.

3. **Customization**:
   - Cập nhật branding (logo, favicon, theme colors).
   - Cập nhật i18n translations trong `client/src/locales`.
   - Tùy chỉnh theme trong `client/src/config/theme.ts`.
   - Thêm/tùy chỉnh routes trong `client/src/app/routes.tsx`.

4. **Extend Features**:
   - Thêm modules mới theo pattern hiện có.
   - Tái sử dụng common components và services.
   - Thêm permissions mới vào hệ thống nếu cần.

5. **Remove Unused**:
   - Xóa các tính năng không cần thiết (nếu có).
   - Cleanup unused dependencies.

### 15. Tài liệu tham khảo

- `README.md`: Hướng dẫn tổng quan, setup, scripts chung.
- Codebase structure: Tham khảo các module/features hiện có để hiểu pattern.

Luôn cập nhật file này khi quy trình thay đổi đáng kể để các AI Agent khác nắm được chuẩn mới nhất.
