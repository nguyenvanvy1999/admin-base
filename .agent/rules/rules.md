# Admin Base Portal - Agent Rules

Tài liệu này cung cấp hướng dẫn cốt lõi để các AI Agent làm việc nhất quán trong dự án Admin Base Portal. **Luôn đọc toàn bộ file này và các tài liệu tham khảo trước khi bắt đầu task.**

## 📚 Tài Liệu Tham Khảo Bắt Buộc

Trước khi bắt đầu bất kỳ task nào, AI Agent **PHẢI** đọc các tài liệu sau:

1. **[Project Introduction](./project-introduction.md)** - Tổng quan dự án, tech stack, cấu trúc codebase, tính năng core
2. **[Coding Standards](./coding-standards.md)** - Quy tắc code clean, tái sử dụng code, naming conventions, best practices
3. **[Development Workflow](./development-workflow.md)** - Workflow phát triển, commands, schema lifecycle

## 🎯 Nguyên Tắc Cốt Lõi

### 1. Tái Sử Dụng Code (Bắt Buộc)

**Trước khi tạo bất kỳ code mới nào:**

1. ✅ Tìm kiếm components/services/hooks/utilities tương tự đã có trong codebase
2. ✅ Xem xét extend hoặc compose từ code hiện có
3. ✅ Chỉ tạo mới khi không thể tái sử dụng hoặc không phù hợp

**Ưu tiên tái sử dụng:**

- Common components từ `components/common/` (AppTable, AppForm, AppModal, AppDrawer, etc.)
- Service patterns từ `services/api/` (createAdminService, etc.)
- Hook patterns từ `hooks/api/`
- Utility functions từ `lib/utils/` hoặc `share/utils/`
- Type definitions từ `types/` hoặc `share/types/`

### 2. Code Clean & Readable

- **Tự đọc hiểu**: Code phải tự giải thích, tránh comment không cần thiết
- **Đơn giản**: Ưu tiên giải pháp đơn giản, dễ hiểu hơn là tối ưu phức tạp
- **Consistent**: Tuân thủ patterns đã có trong codebase
- **DRY**: Không duplicate logic, extract common logic thành shared utilities

### 3. Type Safety Tuyệt Đối

- **Tránh `any`**: Chỉ dùng khi thực sự cần và có lý do rõ ràng
- **Ưu tiên `satisfies`**: Thay vì type assertion
- **Types từ Prisma/Eden Treaty**: Sử dụng khi có thể
- **DTO từ schema `.static`**: Backend DTOs lấy type từ TypeBox schema

### 4. Không Được Làm

1. ❌ Không tạo type/function/biến dư thừa nếu không dùng hoặc không mang lại giá trị
2. ❌ Không tạo wrapper trống hoặc chỉ forward mà không có logic/mục đích
3. ❌ Không duplicate code - extract thành shared utilities
4. ❌ Không tối ưu vi mô gây khó maintain
5. ❌ Không disable linter rules trừ khi có lý do rõ ràng
6. ❌ Không dùng `any` trừ khi thực sự cần và có lý do
7. ❌ Không tạo components/services mới nếu có thể tái sử dụng
8. ❌ Không quên invalidate query sau mutation (TanStack Query)

## 🔍 Checklist Bắt Buộc Trước Khi Code

Khi nhận task, AI Agent **PHẢI** thực hiện:

- [ ] **Đọc task kỹ** và xác nhận file/area ảnh hưởng
- [ ] **Tra cứu codebase** để tìm tính năng/components/services tương tự đã có
- [ ] **Xác định pattern** cần follow (xem các file tương tự)
- [ ] **Kiểm tra tái sử dụng**: Có thể dùng lại code nào không?
- [ ] **Xác định vị trí code**: Đúng folder structure chưa?

## 📝 Quy Tắc Phát Triển Cốt Lõi

### Router & Routing

- **Frontend**: Bắt buộc dùng `createHashRouter`. Nghiêm cấm BrowserRouter.
- **Protected Routes**: Sử dụng `ProtectedRoute` với permission check nếu cần auth

### Database & Schema

- **Schema lifecycle**: Mọi thay đổi DB phải cập nhật `server/src/prisma/schema.prisma`
- **Migration**: Chạy `bun run db:migrate` + `bun run db:generate`
- **Không chỉnh tay**: Không chỉnh tay `generated/`

### Authentication & Authorization

- **Backend**: Routes cần `checkAuth` + `detail.security`
- **Frontend**: Sử dụng `ProtectedRoute` và token injection trong `lib/api/client.ts`

### State Management

- **Server data**: TanStack Query (với invalidation sau mutation)
- **Local UI state**: React useState
- **Global preferences**: React Context (AuthProvider, ThemeModeProvider)
- **Không dùng**: Redux/Zustand cho server state

### Code Quality

- **Format & Lint**: Chạy `bun run check` trước commit/PR
- **Biome**: Format/lint duy nhất, không disable rule trừ khi có lý do rõ
- **Type Check**: Chạy `bun run typecheck` trước commit/PR
- **Comments**: Chỉ khi cần thiết, tiếng Anh, ngắn gọn giải thích intent

### Error Handling

- **Backend**: Throw Error để middleware chuẩn hóa
- **Frontend**: Luôn kiểm tra `response.error` và dùng `useNotify` để hiển thị

### Security

- **Password**: Dùng `Bun.password.hash` (bcrypt)
- **JWT**: Qua header `Authorization: Bearer`
- **XSS**: Protection (elysia-xss)
- **Rate Limiting**: elysia-rate-limit

## 🚀 Workflow Tổng Quan

### Backend Feature

1. Tạo DTO trong `modules/<domain>/dtos`
2. Viết service logic (`services/<domain>` hoặc `services/<domain>/<name>.service.ts`)
3. Tạo controller (`modules/<domain>/controllers`), apply auth, schema
4. Đăng ký module trong `modules/index.ts` hoặc entrypoint
5. Cập nhật Swagger tags nếu cần
6. Viết test (khi user yêu cầu rõ ràng)

**Chi tiết**: Xem [Development Workflow](./development-workflow.md#workflow-phát-triển-feature-backend)

### Frontend Feature

1. Khai báo types trong `client/src/types` hoặc trong module nếu chỉ dùng cục bộ
2. Viết service gọi API tại `client/src/services/api/*.ts`
3. Wrap service bằng hook trong `client/src/hooks/api` sử dụng TanStack Query
4. Page/component đặt trong `features/<domain>/pages` hoặc `features/<domain>/components`
5. Route mới: cập nhật `app/routes.tsx` (hash router) + bảo vệ bằng `ProtectedRoute` nếu cần
6. UI dùng Ant Design Pro Components (`ProTable`, `ProForm`, `ProDrawer`, `PageHeader`...)
7. Sử dụng common components từ `components/common` (AppTable, AppForm, AppModal, AppDrawer...)

**Chi tiết**: Xem [Development Workflow](./development-workflow.md#workflow-phát-triển-feature-frontend)

## 📋 Naming Conventions

### Backend

- **Controllers**: `<name>.controller.ts`
- **Services**: `<Name>Service.ts` hoặc `<name>-<domain>.service.ts`
- **DTOs**: `<name>.dto.ts`, export PascalCase + hậu tố `Dto`
- **Types**: PascalCase với hậu tố `Params`/`Result`/`Response`
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### Frontend

- **Pages**: `<Name>Page.tsx`
- **Components**: PascalCase, file name match component name
- **Hooks**: `use<Name>Query.ts` hoặc `use<Name>Mutation.ts`
- **Services**: camelCase, file name `<name>.service.ts`
- **Types**: PascalCase, file name lowercase
- **Constants**: UPPER_SNAKE_CASE hoặc camelCase tùy context

### Commit Messages

Sử dụng Conventional Commits:

```
feat(admin): add user management page
fix(auth): resolve login redirect issue
refactor(services): extract common service pattern
docs(readme): update setup instructions
```

**Chi tiết**: Xem [Coding Standards](./coding-standards.md#naming-conventions)

## ⚠️ Common Pitfalls

1. **Quên invalidate query** sau mutation (TanStack Query) → UI không cập nhật
2. **Prisma model đổi** nhưng không regenerate → type mismatch
3. **Tạo wrappers/hàm không có logic** → tăng độ phức tạp, khó review
4. **Quên thêm route** vào `app/routes.tsx` → route không hoạt động
5. **Quên permission check** trong `ProtectedRoute` → security issue
6. **Tạo component mới** thay vì tái sử dụng AppTable/AppForm → duplicate code

**Chi tiết**: Xem [Development Workflow](./development-workflow.md#common-pitfalls--solutions)

## ✅ Checklist Hoàn Thành Task

Khi hoàn thành task, AI Agent **PHẢI**:

- [ ] Code tuân thủ [Coding Standards](./coding-standards.md)
- [ ] Đã tái sử dụng components/services/hooks có sẵn
- [ ] Không có duplicate code
- [ ] Type safety (không có `any` không cần thiết)
- [ ] Error handling đầy đủ
- [ ] State management đúng pattern
- [ ] Đã chạy `bun run check` và pass
- [ ] Đã chạy `bun run typecheck` và pass
- [ ] Đã invalidate query sau mutation (nếu có)
- [ ] Đã thêm route (nếu tạo page mới)
- [ ] Đã thêm permission check (nếu cần)
- [ ] Ghi chú bước verify trong final response

## 📖 Tài Liệu Bổ Sung

- **[README.md](../../README.md)**: Hướng dẫn setup, commands chung
- **[System Overview](../../documents/architecture/system-overview.md)**: Chi tiết kiến trúc hệ thống
- **[Features Documentation](../../documents/features/)**: Tài liệu chi tiết các tính năng
- **[Biome Configuration](../../biome.json)**: Linter/Formatter config

## 🔄 Cập Nhật Tài Liệu

Luôn cập nhật các tài liệu này khi:

- Quy trình thay đổi đáng kể
- Thêm pattern/convention mới
- Phát hiện pitfall mới
- Có thay đổi về architecture

---

**Lưu ý**: File này chỉ chứa các quy tắc cốt lõi. Chi tiết về project, coding standards, và workflow xem các tài liệu tham khảo ở trên.
