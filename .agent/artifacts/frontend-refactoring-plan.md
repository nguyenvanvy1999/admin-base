# Kế hoạch Refactor Frontend

## Tổng quan

Dựa trên phân tích toàn bộ codebase Frontend của dự án FinTrack, đây là kế hoạch refactor toàn diện nhằm:
- Loại bỏ code trùng lặp, thừa và không sử dụng
- Tập trung sử dụng các App component và Pro Components của Ant Design
- Tối ưu hóa type system với extends, omit, pick
- Đảm bảo tuân thủ project rules
- Đạt mục tiêu code clean, tái sử dụng và ngắn gọn nhất có thể

---

## 🔴 Phần 1: Loại bỏ Code Trùng & Code Thừa

### 1.1. Duplicate Mutation Logic

**Vấn đề:** Các hooks mutation tại `hooks/api/useAdmin*.ts` có logic trùng lặp đáng kể về:
- Query invalidation
- Success/error message handling
- Error code mapping

**Giải pháp:**
- Tạo generic mutation hook wrapper: `hooks/api/useAppMutation.ts` (đã có nhưng chưa được sử dụng đầy đủ)
- Tạo helper `createMutationOptions` để tái sử dụng logic chung
- Refactor tất cả mutation hooks để sử dụng wrapper chung

**Files cần refactor:**
- ✅ `hooks/api/useAdminI18n.ts`
- ✅ `hooks/api/useAdminRoles.ts`
- ✅ `hooks/api/useAdminSettings.ts`
- ✅ `hooks/api/useAdminSessions.ts`
- ✅ `hooks/api/useAdminPermissions.ts`
- ✅ `hooks/api/useAdminUsers.ts` (trong `features/admin/users/hooks/`)

**Ví dụ refactor:**

```typescript
// Before
export function useUpsertI18n(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: (data: I18nUpsertDto) => adminI18nService.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminI18nKeys.all });
      message.success(t('adminI18nPage.messages.saveSuccess'));
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      message.error(t('adminI18nPage.messages.saveError', { error: error.message }));
    },
  });
}

// After
export function useUpsertI18n(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: I18nUpsertDto) => adminI18nService.upsert(data),
    invalidateKeys: [adminI18nKeys.all],
    successMessageKey: 'adminI18nPage.messages.saveSuccess',
    errorMessageKey: 'adminI18nPage.messages.saveError',
    ...options,
  });
}
```

### 1.2. Duplicate Table Params Types

**Vấn đề:** Mỗi admin page định nghĩa riêng `AdminXxxTableParams` mặc dù có cấu trúc tương tự:

```typescript
// AdminRolesPage
type AdminRoleTableParams = {
  current?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
};

// AdminUsersPage
type AdminUserTableParams = {
  current?: number;
  pageSize?: number;
  search?: string;
  statuses?: AdminUserStatus[];
  roleIds?: string[];
};
```

**Giải pháp:**
- Tạo base type `BaseTableParams` trong `types/table.ts`
- Sử dụng generics và utility types để tạo specific params

```typescript
// types/table.ts
export interface BaseTableParams {
  current?: number;
  pageSize?: number;
  search?: string;
}

export type TableParamsWithFilters<T> = BaseTableParams & T;

// Usage
type AdminRoleTableParams = TableParamsWithFilters<{
  userId?: string;
}>;

type AdminUserTableParams = TableParamsWithFilters<{
  statuses?: AdminUserStatus[];
  roleIds?: string[];
}>;
```

### 1.3. Duplicate Form Modal Logic

**Vấn đề:** 
- `I18nFormModal.tsx` và `SettingFormModal.tsx` có logic xử lý form tương tự
- `I18nFormModal` sử dụng Ant Design Modal + Form
- `SettingFormModal` sử dụng `FormModal` component wrapper
- Logic reset fields, validation, submit handling bị lặp lại

**Giải pháp:**
- Chuẩn hóa tất cả form modals sử dụng `FormModal` component
- Refactor `I18nFormModal` để sử dụng `FormModal` component
- Loại bỏ logic trùng lặp về form handling

### 1.4. Duplicate Column Creators

**Vấn đề:** Có nhiều nơi tự tạo columns thay vì dùng helpers:
- Action columns được tạo thủ công trong nhiều pages
- Date columns có format logic lặp lại
- Search columns có cấu hình tương tự

**Giải pháp:**
- Sử dụng triệt để `tableColumns.tsx` helpers:
  - `createActionColumn`
  - `createDateColumn`
  - `createSearchColumn`
  - `createStatusColumn`

### 1.5. Unused Code

**Files cần kiểm tra và loại bỏ nếu không dùng:**
- `components/common/CrudTable.tsx` - Có vẻ không được sử dụng, cần verify
- `components/common/AppEmpty.tsx` - Kiểm tra usage
- `hooks/api/useProTable.ts` - Nếu không dùng thì xóa
- `features/admin/sessions/components/SessionsTable.tsx` - Verify nếu được sử dụng

---

## 🔵 Phần 2: Tận Dụng Pro Components & App Components

### 2.1. AppTable - Sử dụng Toàn Diện

**Hiện trạng:** Đã sử dụng khá tốt trong các admin pages

**Cải thiện:**
- Đảm bảo tất cả tables đều dùng `AppTable` thay vì raw `ProTable`
- Chuẩn hóa cấu hình `search`, `pagination`, `toolBarRender`

### 2.2. FormModal - Chuẩn Hóa

**Vấn đề:** `I18nFormModal` không sử dụng `FormModal` component

**Giải pháp:**
```typescript
// Refactor I18nFormModal.tsx để sử dụng FormModal
export function I18nFormModal({ open, i18nEntry, onClose, onSubmit, loading }: Props) {
  return (
    <FormModal<I18nUpsertDto>
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={i18nEntry ? t('adminI18nPage.form.editTitle') : t('adminI18nPage.form.createTitle')}
      initialValues={i18nEntry || {}}
      loading={loading}
      mode={i18nEntry ? 'edit' : 'create'}
    >
      <ProFormText name="key" label={t('adminI18nPage.form.key')} disabled={!!i18nEntry} />
      <ProFormTextArea name="en" label={t('adminI18nPage.form.en')} />
      <ProFormTextArea name="vi" label={t('adminI18nPage.form.vi')} />
    </FormModal>
  );
}
```

### 2.3. Sử dụng ProForm Components

**Cải thiện:**
- Tất cả form inputs nên sử dụng ProForm components thay vì raw Ant Design
- Đã làm tốt trong `SettingFormModal`, cần áp dụng cho tất cả forms

### 2.4. AppPage - Chuẩn Hóa Layout

**Hiện trạng:** Đã sử dụng tốt trong admin pages

**Cải thiện:**
- Đảm bảo tất cả pages đều wrap trong `AppPage`
- Verify các page props như title, breadcrumb

---

## 🟢 Phần 3: Tối Ưu Type System

### 3.1. Shared Response Types

**Vấn đề:** Response types bị lặp lại:

```typescript
// admin-i18n.ts
export interface I18nPaginatedResponse {
  items: I18n[];
  total: number;
}

// admin-roles.ts
export interface AdminRoleListResponse {
  docs: AdminRole[];
  count: number;
}
```

**Giải pháp:**
```typescript
// types/api.ts
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface ListResponse<T> {
  docs: T[];
  count: number;
}

// Usage
export type I18nPaginatedResponse = PaginatedResponse<I18n>;
export type AdminRoleListResponse = ListResponse<AdminRole>;
```

### 3.2. Common DTO Patterns

**Vấn đề:** Các DTO có patterns tương tự:

```typescript
// admin-i18n.ts
export interface I18nUpsertDto {
  id?: string;
  key: string;
  en: string | null;
  vi: string | null;
}

// admin-settings.ts
export interface UpdateSettingDto {
  value: string;
  isSecret: boolean;
  description?: string | null;
}
```

**Giải pháp:**
```typescript
// types/common.ts
export type UpsertDto<T> = Partial<Pick<T, 'id'>> & Omit<T, 'id'>;
export type CreateDto<T> = Omit<T, 'id'>;
export type UpdateDto<T> = Partial<Omit<T, 'id'>>;

// Usage - khi phù hợp
export type I18nCreateDto = CreateDto<I18n>;
export type I18nUpdateDto = Partial<Pick<I18n, 'en' | 'vi'>>;
```

### 3.3. Consolidate Enum Definitions

**Vấn đề:** Enums và constants phân tán:

```typescript
// admin-users.ts
export const ADMIN_USER_STATUSES = ['inactive', 'active', 'suspendded', 'banned'] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

// admin-settings.ts
export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}
```

**Giải pháp:**
- Chuẩn hóa: Dùng `as const` arrays cho enums đơn giản
- Dùng `enum` khi cần namespace hoặc có nhiều methods liên quan
- Group related enums vào files riêng

### 3.4. Extend Base Types

**Vấn đề:** Summary và Detail types có nhiều fields chung:

```typescript
export interface AdminUserSummary {
  id: string;
  email: string;
  status: AdminUserStatus;
  name: string | null;
  created: string;
  // ...
}

export interface AdminUserDetail extends AdminUserSummary {
  modified: string;
  lockoutUntil: string | null;
  // ...
}
```

**Đánh giá:** Đã làm tốt! Tiếp tục pattern này

**Cải thiện thêm:**
```typescript
// Tạo base type cho common fields
export interface BaseEntity {
  id: string;
  created: string;
  modified?: string;
}

export interface AdminUserBase extends BaseEntity {
  email: string;
  status: AdminUserStatus;
  name: string | null;
  emailVerified: boolean;
}

export interface AdminUserSummary extends AdminUserBase {
  roles: AdminUserRoleRef[];
  protected?: boolean;
  sessionStats: SessionStats;
}

export interface AdminUserDetail extends AdminUserSummary {
  modified: string;
  lockoutUntil: string | null;
  lockoutReason: AdminLockoutReason | null;
  // ...
}
```

### 3.5. Utility Types for Forms

**Thêm helper types:**

```typescript
// types/form.ts
export type FormValues<T> = Omit<T, 'id' | 'created' | 'modified'>;
export type FormFieldProps<T, K extends keyof T> = {
  name: K;
  label: string;
  required?: boolean;
  initialValue?: T[K];
};
```

---

## 🟡 Phần 4: Chuẩn Hóa Patterns

### 4.1. Standardize Hook Patterns

**Quy chuẩn:**

```typescript
// hooks/api/use{Domain}.ts

// 1. List query hook
export function use{Domain}List(params: ListParams) {
  return useAppQuery({
    queryKey: {domain}Keys.list(params),
    queryFn: () => {domain}Service.list(params),
  });
}

// 2. Detail query hook
export function use{Domain}Detail(id?: string) {
  return useAppQuery({
    queryKey: {domain}Keys.detail(id ?? 'unknown'),
    queryFn: () => {
      if (!id) throw new Error('ID required');
      return {domain}Service.detail(id);
    },
    enabled: !!id,
  });
}

// 3. Create mutation hook
export function useCreate{Domain}(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (data: CreateDto) => {domain}Service.create(data),
    invalidateKeys: [{domain}Keys.lists()],
    successMessageKey: '{domain}.create.success',
    ...options,
  });
}

// 4. Update mutation hook
export function useUpdate{Domain}(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDto }) => 
      {domain}Service.update(id, data),
    invalidateKeys: (vars) => [
      {domain}Keys.detail(vars.id),
      {domain}Keys.lists(),
    ],
    successMessageKey: '{domain}.update.success',
    ...options,
  });
}

// 5. Delete mutation hook
export function useDelete{Domain}(options?: MutationCallbacks) {
  return useAppMutation({
    mutationFn: (ids: string[]) => {domain}Service.delete(ids),
    invalidateKeys: [{domain}Keys.lists()],
    successMessageKey: '{domain}.delete.success',
    ...options,
  });
}
```

### 4.2. Standardize Service Patterns

```typescript
// services/api/{domain}.service.ts

export const {domain}Keys = createQueryKeys('{domain}');

class {Domain}Service {
  async list(params?: ListParams): Promise<ListResponse<T>> {
    return apiClient.get('/{domain}', { params });
  }
  
  async detail(id: string): Promise<T> {
    return apiClient.get(`/{domain}/${id}`);
  }
  
  async create(data: CreateDto): Promise<T> {
    return apiClient.post('/{domain}', data);
  }
  
  async update(id: string, data: UpdateDto): Promise<T> {
    return apiClient.patch(`/{domain}/${id}`, data);
  }
  
  async delete(ids: string[]): Promise<void> {
    return apiClient.delete('/{domain}', { data: { ids } });
  }
}

export const {domain}Service = new {Domain}Service();
```

### 4.3. Standardize Page Component Structure

```typescript
// features/{domain}/{feature}/pages/{Feature}Page.tsx

export default function {Feature}Page() {
  // 1. Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { hasPermission } = usePermissions();
  
  // 2. Refs
  const actionRef = useRef<ActionType | null>(null);
  
  // 3. Permissions
  const canView = hasPermission('{DOMAIN}.VIEW');
  const canCreate = hasPermission('{DOMAIN}.CREATE');
  const canUpdate = hasPermission('{DOMAIN}.UPDATE');
  const canDelete = hasPermission('{DOMAIN}.DELETE');
  
  // 4. Local state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  
  // 5. Mutations
  const deleteMutation = useDelete{Domain}({
    onSuccess: () => {
      notify.success(t('{domain}.delete.success'));
      actionRef.current?.reload();
    },
  });
  
  // 6. Handlers
  const handleCreate = () => { ... };
  const handleEdit = (record: T) => { ... };
  const handleDelete = (record: T) => { ... };
  
  // 7. Column definitions
  const columns: ProColumns<T>[] = [ ... ];
  
  // 8. Guard clauses
  if (!canView) return null;
  
  // 9. Render
  return (
    <AppPage>
      <AppTable ... />
      {/* Modals */}
    </AppPage>
  );
}
```

### 4.4. Consolidate Utility Functions

**Tạo shared utilities:**

```typescript
// lib/utils/table.utils.ts
export function createSkipFromPagination(current: number, pageSize: number): number {
  return (current - 1) * pageSize;
}

export function createTableRequest<T, P>(
  params: P,
  service: (params: any) => Promise<{ docs: T[]; count: number }>,
) {
  return async (params: P & { current?: number; pageSize?: number }) => {
    const { current = 1, pageSize = 20, ...filters } = params;
    const skip = createSkipFromPagination(current, pageSize);
    const response = await service({ skip, take: pageSize, ...filters });
    return {
      data: response.docs || [],
      success: true,
      total: response.count || 0,
    };
  };
}
```

---

## 🟣 Phần 5: Cấu trúc Thư Mục & File Organization

### 5.1. Consolidate Index Exports

**Vấn đề:** Nhiều index.ts chưa export đầy đủ

**Cải thiện:**

```typescript
// features/admin/{domain}/hooks/index.ts
export * from './use{Domain}List';
export * from './use{Domain}Detail';
export * from './use{Domain}Pagination';
export * from './use{Domain}...';

// features/admin/{domain}/components/index.ts
export * from './{Domain}FormModal';
export * from './{Domain}Table';
export * from './{Domain}...';

// types/index.ts - thêm barrel export
export * from './admin-users';
export * from './admin-roles';
export * from './admin-settings';
export * from './admin-sessions';
export * from './admin-i18n';
export * from './table';
export * from './api';
export * from './auth';
export * from './common';
```

### 5.2. Standardize Feature Structure

```
features/admin/{domain}/
├── components/
│   ├── {Domain}FormModal.tsx
│   ├── {Domain}Table.tsx (if needed)
│   └── index.ts
├── hooks/
│   ├── use{Domain}Pagination.ts (if needed)
│   └── index.ts
├── pages/
│   ├── {Domain}Page.tsx
│   ├── {Domain}DetailPage.tsx (if needed)
│   └── index.ts
└── utils/
    └── index.ts
```

---

## 🔶 Phần 6: Specific Refactoring Tasks

### Task 1: Refactor I18nFormModal
**Priority:** High  
**Effort:** Low  
- Chuyển từ Ant Modal => FormModal component
- Sử dụng ProForm components
- Estimated: 30 mins

### Task 2: Create useAppMutation wrapper
**Priority:** High  
**Effort:** Medium  
- Enhance existing `useAppMutation` hook
- Add query invalidation logic
- Add i18n message handling
- Estimated: 1 hour

### Task 3: Refactor all mutation hooks
**Priority:** High  
**Effort:** High  
- Apply useAppMutation to all hooks
- Estimated: 2-3 hours

### Task 4: Consolidate table params types
**Priority:** Medium  
**Effort:** Low  
- Create BaseTableParams
- Refactor all page params
- Estimated: 30 mins

### Task 5: Audit and remove unused code
**Priority:** Medium  
**Effort:** Medium  
- Check CrudTable usage
- Check SessionsTable usage
- Remove unused utilities
- Estimated: 1 hour

### Task 6: Standardize response types
**Priority:** Medium  
**Effort:** Low  
- Create generic PaginatedResponse
- Create generic ListResponse
- Estimated: 30 mins

### Task 7: Create common utilities
**Priority:** Low  
**Effort:** Medium  
- table.utils.ts
- form.utils.ts
- Estimated: 1 hour

### Task 8: Documentation
**Priority:** Low  
**Effort:** Low  
- Update component usage examples
- Document patterns
- Estimated: 30 mins

---

## 📊 Tổng Kết & Metrics

### Estimated Impact

**Code Reduction:**
- Remove ~200-300 lines of duplicate code
- Consolidate ~50-100 lines into reusable utilities
- Total reduction: ~15-20%

**Type Safety:**
- Reduce type definitions by ~30% through utility types
- Better IntelliSense support

**Maintainability:**
- Standardized patterns across all features
- Easier onboarding for new developers
- Consistent error handling and messaging

### Execution Order

1. **Phase 1 - Foundation (Week 1)**
   - Task 2: useAppMutation wrapper
   - Task 6: Response types
   - Task 4: Table params types

2. **Phase 2 - Refactoring (Week 1-2)**
   - Task 1: I18nFormModal
   - Task 3: All mutation hooks
   - Task 5: Remove unused code

3. **Phase 3 - Utilities (Week 2)**
   - Task 7: Common utilities

4. **Phase 4 - Documentation (Week 2)**
   - Task 8: Documentation

### Success Criteria

✅ No duplicate code patterns across features  
✅ All forms use FormModal component  
✅ All tables use AppTable component  
✅ All mutations use useAppMutation wrapper  
✅ Consistent type patterns with utility types  
✅ 100% compliance with project rules  
✅ No unused files or exports  
✅ Consistent file/folder structure  

---

## 📝 Notes & Considerations

### Breaking Changes
- None expected - all changes are internal refactoring

### Testing Strategy
- Manual testing of all refactored pages
- Verify all CRUD operations still work
- Check error handling flows
- Verify permissions still work correctly

### Risk Mitigation
- Refactor incrementally (one feature at a time)
- Test thoroughly after each feature refactor
- Keep Git commits atomic for easy rollback
- No changes to backend API contracts

### Future Improvements
- Consider adding Zod validation for forms
- Consider using TanStack Table for more complex tables
- Consider adding Storybook for component documentation
- Consider E2E tests with Playwright/Cypress
