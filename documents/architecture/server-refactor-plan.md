# Kế hoạch triển khai refactor `server/`

> Mục tiêu: **giảm code trùng lặp**, **typesafe tối đa**, **code clean & ngắn gọn**, và **tuân thủ quy tắc dự án** tại `@.agent/rules/*`.

## 0) Phạm vi & nguyên tắc

### Phạm vi

- Áp dụng cho backend trong thư mục `server/` (Elysia + Prisma + TypeBox).
- Tập trung refactor theo **patterns** và **cấu trúc** (DTO/service/controller), không đổi behavior nếu không được yêu cầu.

### Nguyên tắc bắt buộc (trích từ `@.agent/rules`)

- **DRY / tái sử dụng code**: tìm cái đã có trước khi tạo mới; ưu tiên đặt shared code trong `server/src/share`.
- **Type safety tuyệt đối**: tránh `any`; ưu tiên type từ **Prisma** và type từ **TypeBox `.static`**.
- **Không tạo wrapper trống**: chỉ tạo abstraction khi có giá trị (giảm lặp/chuẩn hóa/error handling).
- **Consistent với codebase**: follow patterns hiện hữu.

### Định nghĩa “xong” (Definition of Done)

- Giảm rõ rệt các đoạn lặp trong controllers/services/DTO.
- Không làm giảm type safety (tốt hơn trước).
- Không đổi API contract (route, request/response shape) trừ khi có migration plan.
- `bun run check` + `bun run typecheck` pass.

---

## 1) Hiện trạng (cần khảo sát trước khi refactor)

> Trước khi làm từng hạng mục, **bắt buộc** khảo sát trong codebase:

- Controllers:
  - Lặp lại các pattern: `checkAuth`, `detail.security`, `tags`, mapping query/pagination, try/catch, response shape.
- DTOs:
  - Nhiều DTO trùng field (pagination, sort, date range, id params, search).
  - Các schema TypeBox lặp `Type.String({ minLength: ... })`...
- Services:
  - Lặp logic truy vấn Prisma: `findUnique` + `not found`, pagination `skip/take`, orderBy parse, include/select lặp.
- Share:
  - Đã có `server/src/share/utils`, `server/src/share/types`, `server/src/share/errors`… xem có thể mở rộng thay vì tạo mới.

Kết quả khảo sát cần ghi lại:

- Danh sách cụm trùng lặp lớn (top 10) + file path.
- Quyết định: **extract** sang shared utility hay refactor tại chỗ.

---

## 2) Giảm code trùng lặp (DRY)

### 2.1 Chuẩn hóa DTO dùng chung (TypeBox)

Mục tiêu: tái sử dụng schema/type để tránh copy/paste.

#### DTO dùng chung đề xuất

Đặt tại: `server/src/dtos/common/` (hoặc `server/src/share/dtos/` nếu project đang theo hướng share).

- `PaginationQueryDto`:
  - `page?: number`, `pageSize?: number` (có default ở layer parse).
- `SortQueryDto`:
  - `sortBy?: string`, `sortOrder?: 'asc' | 'desc'`.
- `SearchQueryDto`:
  - `search?: string`.
- `IdParamsDto`:
  - `id: string`.
- `DateRangeQueryDto`:
  - `from?: string`, `to?: string` (nếu hệ thống đang dùng ISO string).

> Quy tắc: export **schema** và **type**:

```ts
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const PaginationQueryDto = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
});

export type PaginationQueryDto = Static<typeof PaginationQueryDto>;
```

#### Tái sử dụng schema bằng `Type.Intersect` + spread

- Dùng `Type.Intersect([A, B, C])` để compose schema.
- Nếu cần override/extend field, tạo schema mới từ compose.

Ví dụ:

```ts
export const ListUsersQueryDto = Type.Intersect([
  PaginationQueryDto,
  SearchQueryDto,
  SortQueryDto,
]);
export type ListUsersQueryDto = Static<typeof ListUsersQueryDto>;
```

### 2.2 Chuẩn hóa response shape

Mục tiêu: tránh mỗi controller tự định nghĩa kiểu list/detail.

Đề xuất tạo helper types:

- `ListResult<T>`: `{ items: T[]; total: number }`
- `PaginatedResult<T>` (nếu có `page/pageSize`).

Đặt tại: `server/src/share/types/api.ts`.

> Lưu ý: không tạo abstraction nếu codebase đã có sẵn type tương tự.

### 2.3 Chuẩn hóa parse pagination/sort/query

Mục tiêu: mọi endpoint list đều dùng chung 1 cách tính `skip/take` và `orderBy`.

Đặt tại: `server/src/share/utils/query.ts`:

- `getPagination(params): { page: number; pageSize: number; skip: number; take: number }`
- `getOrderBy<TModel>(params): Prisma.<Model>OrderByWithRelationInput` (typesafe nhất có thể; xem phần 3).

### 2.4 Giảm lặp trong controller Elysia

Các pattern lặp thường gặp:

- `.use(checkAuth)` cho mọi route protected.
- `detail: { security, tags }`.

Đề xuất:

- Tạo factory `createProtectedController({ prefix, tags })` trả về `new Elysia({ prefix })...use(checkAuth)...`.
- Hoặc tối thiểu tạo helper `withAuthDetails(tags)` trả về object config.

> Không tạo wrapper “trống”: helper phải giảm lặp thực tế ở nhiều controllers.

### 2.5 Giảm lặp trong service

Các pattern:

- `findUnique` + not found.
- `count` + `findMany` list.

Đề xuất utility:

- `requireEntity(entity, message?)` hoặc `assertFound(entity, error)`.
- `findManyWithCount(prisma.<model>, args)` nếu áp dụng được nhiều nơi.

---

## 3) Đảm bảo type-safe tối đa (Prisma + TypeBox)

### 3.1 Nguyên tắc

- Request validation: TypeBox schema.
- Request types: `Static<typeof Schema>`.
- DB access: Prisma types (`Prisma.*Args`, `Prisma.*WhereInput`, `Prisma.*Select`, `Prisma.*Include`).
- Response types: ưu tiên derived từ Prisma `GetPayload` hoặc `Select`.

### 3.2 Tận dụng Prisma `validator` + `GetPayload`

Mục tiêu: type-safe cho `select/include` và response.

Ví dụ pattern chuẩn:

```ts
import { Prisma } from "src/generated/prisma";

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  status: true,
  createdAt: true,
});

export type UserDto = Prisma.UserGetPayload<{ select: typeof userSelect }>;
```

Ưu điểm:

- Nếu field đổi trong Prisma schema → TS báo lỗi ngay.
- Không phải viết type thủ công.

### 3.3 Typesafe cho `where/orderBy`

- Với filter đơn giản: dùng thẳng `Prisma.UserWhereInput`.
- Với mapping từ query string → `orderBy`:
  - Chỉ cho phép `sortBy` thuộc danh sách cụ thể.
  - Danh sách đó nên được type hóa bằng `satisfies`.

Ví dụ:

```ts
const USER_SORT_FIELDS = ["createdAt", "email"] as const;

type UserSortField = (typeof USER_SORT_FIELDS)[number];

function isUserSortField(v: string): v is UserSortField {
  return (USER_SORT_FIELDS as readonly string[]).includes(v);
}
```

### 3.4 “Không any” & ưu tiên `satisfies`

- Tránh `as SomeType` khi có thể.
- Dùng `satisfies` để kiểm tra shape mà không mất inference.

---

## 4) Code clean & ngắn gọn

### 4.1 Quy tắc viết code

- Ưu tiên **pure functions** cho parse/query building.
- Một function làm một việc, nhưng không tách vụn.
- Tên rõ ràng, tránh abbreviation.
- Giảm nesting bằng early-return / throw.

### 4.2 Dùng JS/TS techniques để ngắn gọn (nhưng readable)

- Object spread để conditionally add fields:

```ts
const where: Prisma.UserWhereInput = {
  ...(search ? { email: { contains: search, mode: "insensitive" } } : {}),
  ...(status ? { status } : {}),
};
```

- Conditional include/select:

```ts
const include = {
  ...(withRoles ? { roles: true } : {}),
} satisfies Prisma.UserInclude;
```

- Default params ở layer parse:

```ts
const page = params.page ?? 1;
const pageSize = params.pageSize ?? 20;
```

> Lưu ý: chỉ dùng trick khi không làm khó đọc.

### 4.3 Chuẩn hóa error handling

- Backend: **throw Error** để middleware chuẩn hóa (theo rules).
- Dùng error types đã có trong `server/src/share/errors` nếu tồn tại.
- Với not-found: 1 pattern thống nhất.

---

## 5) Lộ trình triển khai (phased plan)

### Phase 1 — Khảo sát & thống kê trùng lặp (an toàn)

- [ ] Thống kê các pattern lặp (controllers, services, dtos).
- [ ] Chốt danh sách shared DTOs và utilities.

**Output**: danh sách file impacted + bản thiết kế utilities/DTO.

### Phase 2 — Tạo DTO/common utilities (không đổi behavior)

- [ ] Thêm các DTO dùng chung (pagination/sort/search/id).
- [ ] Thêm `query utils` (pagination/orderBy parse).
- [ ] Thêm `api types` (ListResult/PaginatedResult).

**Rule**: không “đụng” route logic nhiều; chỉ thêm building blocks.

### Phase 3 — Refactor từng module theo domain (incremental)

- [ ] Chọn 1 module có nhiều endpoint list/detail (ví dụ: admin/users).
- [ ] Refactor DTO -> compose từ common DTO.
- [ ] Refactor controller -> dùng helper (nếu có lợi).
- [ ] Refactor service -> dùng query utils + Prisma.validator + GetPayload.

**Rule**: refactor theo PR nhỏ, dễ review.

### Phase 4 — Chuẩn hóa toàn server

- [ ] Áp dụng dần cho các module còn lại.
- [ ] Xoá code cũ bị thay thế (không để dead code).

### Phase 5 — Hardening

- [ ] Re-check Swagger docs (tags/security).
- [ ] Chạy `bun run check`, `bun run typecheck`.
- [ ] Nếu có test suite: chạy `bun run test`.

---

## 6) Checklist tuân thủ `@.agent/rules` khi refactor

- [ ] Đã tìm kiếm code tương tự trước khi tạo mới (share/utils/types/dtos).
- [ ] Không có duplicate logic mới.
- [ ] Không tạo wrapper trống.
- [ ] Không dùng `any` (trừ khi có lý do rõ + isolate).
- [ ] DTO: dùng TypeBox + export `.static` type.
- [ ] Prisma: dùng `validator` + `GetPayload` cho select/include.
- [ ] Protected routes: có `checkAuth` + `detail.security`.

---

## 7) Rủi ro & cách giảm thiểu

- **Rủi ro đổi behavior do refactor query**:
  - Giảm thiểu: refactor từng module nhỏ; so sánh response trước/sau; giữ defaults (page/pageSize).
- **Rủi ro mất type inference do assertion**:
  - Giảm thiểu: ưu tiên `satisfies`, `Prisma.validator`.
- **Rủi ro tạo quá nhiều abstraction**:
  - Giảm thiểu: chỉ extract khi có >= 3 nơi dùng và giảm lặp rõ.

---

## 8) Gợi ý commit message (English, Conventional Commits)

- `docs(architecture): add server refactor plan`



