## FinTrack Cursor Rules

Tài liệu này cung cấp hướng dẫn để Cursor Agents làm việc nhất quán trong dự án FinTrack. Luôn đọc toàn bộ file trước khi bắt đầu task.

### 1. Tổng quan dự án
- Monorepo `investment` gồm `server` (Bun + Elysia) và `client` (React + Vite).
- Ngôn ngữ chính: TypeScript toàn bộ stack, comment/code bắt buộc tiếng Anh.
- Ưu tiên type-safety tuyệt đối (Prisma, Eden Treaty, Zod/TypeBox).

### 2. Tech stack chính
- **Runtime**: Bun (bunfig + scripts trong `server/package.json`).
- **Backend**: Elysia.js, Prisma ORM, PostgreSQL, Eden Treaty (auto types).
- **Frontend**: React 19 + Vite + Mantine UI + Tailwind CSS v4.
- **State**: Zustand (client state), TanStack Query/Form/Table (server data, forms, tables).
- **Auth**: JWT (jsonwebtoken) với macro `checkAuth` trên backend, token lưu localStorage phía client.
- **Logging**: Logtape (structured logs với rotation).
- **Tooling**: Biome (lint+format), TypeScript strict, Swagger docs, BullMQ/Redis (tùy chọn jobs), CoinGecko/NAV feeds (tương lai).

### 3. Cấu trúc codebase bắt buộc
- `server/src/modules/*`: controllers, dtos, index theo domain.
- `server/src/service/*`: business services; file pattern `[area].service.ts`.
- `server/src/config/*`: bootstrap config (db, env, logger, pubsub, queue...).
- `server/src/share/*`: constants, errors, utils, types dùng chung.
- `client/src/app/*`: providers, routes, layouts.
- `client/src/components/*`: chia `business`, `common`, `ui`.
- `client/src/features/*`: domain-specific logic (auth, dashboard, settings).
- `docs/technology/*`: tài liệu nền, nên tham chiếu khi bổ sung rule.

### 4. Quy tắc phát triển
1. **Router Hash**: frontend bắt buộc dùng `createHashRouter`. Nghiêm cấm Browser Router.
2. **Schema lifecycle**: mọi thay đổi DB phải cập nhật `server/src/prisma/schema.prisma`, chạy `bun run db:migrate` + `bun run db:generate`. Không chỉnh tay `generated/`.
3. **Auth guard**: backend routes cần `checkAuth` + `detail.security`. Frontend sử dụng `ProtectedRoute` và token injection trong `api/client.ts`.
4. **State phân định**:
   - Global UI/preferences: Zustand store.
   - Server data: TanStack Query (invalidate sau mutation).
   - Forms: TanStack Form + Zod/TypeBox schema.
5. **Code style**: chạy `bun run check` trước PR. Biome format/lint duy nhất. Không disable rule trừ khi có lý do rõ.
6. **Type safety**: tránh `any`. Ưu tiên `satisfies` và types từ Prisma/Eden Treaty. DTO lấy type từ schema `.static`.
7. **Comment**: chỉ khi cần thiết, tiếng Anh, ngắn gọn giải thích intent.
8. **Error handling**: backend throw Error để middleware chuẩn hóa; frontend luôn kiểm tra `response.error`.
9. **Security**: password dùng `Bun.password.hash` (bcrypt). JWT qua header `Authorization: Bearer`.
10. **Tests**: services phải có unit test trong `server/test/unit`. Business logic quan trọng cần integration test. Không merge code chưa test nếu ảnh hưởng core flow (transactions, P&L).

### 5. Workflow chuẩn khi tạo feature backend
1. Tạo DTO trong `modules/<domain>/dtos`.
2. Viết service logic (`service/<domain>`).
3. Tạo controller group (`modules/<domain>/controllers`), apply macro auth, schema.
4. Đăng ký module trong `modules/index.ts` hoặc entrypoint tương ứng.
5. Cập nhật Swagger tags nếu cần (config swagger).
6. Viết test (unit + fixtures nếu cần).

### 6. Workflow chuẩn khi tạo feature frontend
1. Khai báo types trong `client/src/types` hoặc domain `features`.
2. Sử dụng hooks `client/src/hooks/api` với Eden Treaty client.
3. State server-side = TanStack Query; mutation phải invalidate query key chuẩn.
4. Page/component đặt trong `app/pages` hoặc `features/<domain>/components`.
5. Route mới: cập nhật `app/routes.tsx` (hash router) + bảo vệ bằng layout Protected nếu yêu cầu auth.
6. Giao diện dùng AntDesign. Ưu tiên component tái sử dụng trong `components/common`.

### 7. Naming & conventions
- Backend controllers: `<name>.controller.ts`; services: `<Name>Service.ts`; DTO: `<name>.dto.ts`.
- Frontend pages: `<Name>Page.tsx`; hooks: `use<Name>Query.ts`; stores/types lowercase file.
- Environment constants uppercase snake case.
- Commit message theo Conventional Commits (`feat(accounts): ...`).

### 8. Commands quan trọng
```bash
# root
bun install              # cài deps (hoặc npm/pnpm cho client nếu cần)

# server
cd server
bun run dev              # chạy backend dev
bun run db:migrate
bun run db:generate
bun run check            # format + lint
bun run test             # nếu script có sẵn

# client
cd client
bun run dev              # hoặc npm run dev tùy lockfile
bun run build
bun run check            # nếu cấu hình Biome riêng
```

### 9. Quy định review & PR
- PR phải đính kèm mô tả
- Checklist bắt buộc: format (Biome), test pass, docs cập nhật (`docs/*` hoặc README).
- Không merge khi còn TODO/tạm code. Sử dụng `FIXME`/`TODO` khi cần nhưng phải tạo issue liên quan.

### 10. Common pitfalls
- Quên invalidate query sau mutation → UI không cập nhật.
- Prisma model đổi nhưng không regenerate → type mismatch.
- Không bật strict mode trong TS config (đã bật sẵn, không chỉnh).
- Dùng local state thay vì TanStack Query → duplicate fetching logic.

### 11. Checklist nhanh cho Cursor Agent
- [ ] Đọc task & xác nhận file ảnh hưởng.
- [ ] Tra cứu docs tương ứng trong `docs/`.
- [ ] Viết code tuân thủ quy tắc sections 4-7.
- [ ] Chạy test/lint liên quan.
- [ ] Cập nhật docs nếu thay đổi hành vi.
- [ ] Ghi chú bước verify trong final response.

### 12. Tài liệu tham khảo nội bộ
- `docs/technology/tech-stack.md`: mô tả chi tiết stack.
- `docs/technology/coding-rules.md`: quy tắc code bắt buộc.
- `docs/technology/development-guide.md`: quy trình thêm feature, DB, routes.
- `docs/project/*`: kiến trúc database, roadmap, migration plans.
- `README.md`: hướng dẫn tổng quan, scripts chung.

Luôn cập nhật file này khi quy trình thay đổi đáng kể để Cursor Agents khác nắm được chuẩn mới nhất.

