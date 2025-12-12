# Thiết Kế UI/UX Cho Resource Management Pages

## 1. Tổng Quan

Tài liệu này mô tả thiết kế UI/UX cho các trang quản lý resource (sessions, notifications, security events, API keys, ...) với mục tiêu:

- **Giảm thiểu code trùng lặp**: Tái sử dụng components và logic
- **Dễ sử dụng**: UX nhất quán, trực quan
- **Đảm bảo phân quyền**: Không vượt quyền, bảo mật tốt

## 2. Phân Tích Hiện Trạng

### 2.1. Cấu Trúc Hiện Tại

#### Frontend

- **MySessionsPage** (`/me/sessions`): User xem sessions của chính mình
- **AdminSessionsPage** (`/admin/sessions`): Admin xem tất cả sessions
- Cả hai page dùng chung:
  - `SessionsTable` component
  - `useAdminSessionsPagination` hook
  - Logic tương tự: filter, pagination, revoke, row selection

#### Backend

- **session-user.controller** (`/sessions`): Endpoint cho user
- **session-admin.controller** (`/admin/sessions`): Endpoint cho admin
- **sessionService**: Service layer xử lý logic chung
  - `list()`: Nhận `hasViewPermission` và `currentUserId` để filter
  - `revoke()`: Revoke sessions của user cụ thể
  - `revokeMany()`: Revoke nhiều sessions (admin)

### 2.2. Vấn Đề

1. **Code trùng lặp**: Logic giữa MySessionsPage và AdminSessionsPage gần như giống nhau
2. **Khó mở rộng**: Mỗi resource mới (notification, security event, ...) cần tạo page riêng với code tương tự
3. **Khó maintain**: Thay đổi logic cần sửa ở nhiều nơi
4. **Phân quyền phức tạp**: Logic phân quyền rải rác trong components

## 3. Giải Pháp Thiết Kế

### 3.1. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│                    Resource Page                         │
│  (Generic Component - Configurable)                     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Resource     │  │ Resource     │  │ Permission   │
│ Table        │  │ Hooks        │  │ Manager      │
│ (Generic)    │  │ (Generic)    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  API Service    │
                 │  (Resource)     │
                 └─────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Backend API    │
                 │  (Controller)   │
                 └─────────────────┘
```

### 3.2. Core Concepts

#### 3.2.1. Resource Context

Mỗi resource (session, notification, security event, ...) được định nghĩa bằng một **Resource Context**:

```typescript
interface ResourceContext<TData, TListParams, TActionParams> {
  // Resource identification
  name: string; // 'session', 'notification', 'security-event', ...
  displayName: string; // Display name for UI

  // Permissions
  permissions: {
    view: string | string[]; // 'SESSION.VIEW' | ['SESSION.VIEW', 'SESSION.VIEW_ALL']
    viewAll?: string; // 'SESSION.VIEW_ALL'
    create?: string | string[];
    update?: string | string[];
    delete?: string | string[];
    action?: Record<string, string | string[]>; // Custom actions
  };

  // API endpoints
  endpoints: {
    list: string; // '/api/admin/sessions' or '/api/sessions'
    detail?: string;
    create?: string;
    update?: string;
    delete?: string;
    actions?: Record<string, string>; // Custom action endpoints
  };

  // Data configuration
  dataConfig: {
    idField: string; // 'id'
    statusField?: string; // 'status'
    statusComputed?: (item: TData) => string; // Computed status
    ownerField?: string; // 'createdById' - field to check ownership
  };

  // UI configuration
  uiConfig: {
    columns: ProColumns<TData>[];
    filters?: FilterConfig[];
    actions?: ActionConfig<TData>[];
    bulkActions?: BulkActionConfig[];
    customComponents?: {
      header?: React.ComponentType;
      footer?: React.ComponentType;
      empty?: React.ComponentType;
    };
  };

  // Scope configuration
  scope: "user" | "admin" | "both"; // Determines default filtering
}
```

#### 3.2.2. Resource Scope

**User Scope** (`scope: 'user'`):

- Chỉ hiển thị data của current user
- Endpoint: `/api/{resource}` (không có `/admin`)
- Permissions: `{resource}.VIEW`, `{resource}.CREATE`, ...

**Admin Scope** (`scope: 'admin'`):

- Hiển thị tất cả data (có thể filter theo user)
- Endpoint: `/api/admin/{resource}`
- Permissions: `{resource}.VIEW_ALL`, `{resource}.CREATE`, ...

**Both Scope** (`scope: 'both'`):

- Có thể switch giữa user view và admin view
- Hoặc tự động detect dựa trên permissions

### 3.3. Component Architecture

#### 3.3.1. GenericResourcePage Component

Component chính, configurable cho mọi resource:

```typescript
interface GenericResourcePageProps<TData, TListParams> {
  resource: ResourceContext<TData, TListParams, any>;
  initialParams?: Partial<TListParams>;
  pageSize?: number;
}
```

**Features**:

- Tự động handle permissions
- Tự động filter theo scope (user/admin)
- Tự động render columns, filters, actions
- Tự động handle pagination
- Tự động handle bulk actions

#### 3.3.2. GenericResourceTable Component

Table component generic, tương tự `SessionsTable` nhưng configurable:

```typescript
interface GenericResourceTableProps<TData, TListParams> {
  resource: ResourceContext<TData, TListParams, any>;
  data: TData[];
  loading: boolean;
  pagination: PaginationConfig;
  onPageChange: (page: number, pageSize?: number) => void;
  // ... other props
}
```

#### 3.3.3. useResourcePagination Hook

Generic hook cho pagination, tương tự `useAdminSessionsPagination`:

```typescript
function useResourcePagination<TData, TListParams>(
  resource: ResourceContext<TData, TListParams, any>,
  options: {
    initialParams: Partial<TListParams>;
    pageSize?: number;
    autoLoad?: boolean;
  }
): UseResourcePaginationResult<TData>;
```

#### 3.3.4. useResourcePermissions Hook

Hook để check permissions cho resource:

```typescript
function useResourcePermissions(resource: ResourceContext<any, any, any>): {
  canView: boolean;
  canViewAll: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAction: (action: string) => boolean;
};
```

### 3.4. Backend Architecture

#### 3.4.1. Generic Controller Pattern

Thay vì tách `session-user.controller` và `session-admin.controller`, sử dụng một controller với middleware phân quyền:

```typescript
// session.controller.ts
export const sessionController = new Elysia({
  prefix: "/sessions",
})
  .use(authCheck)
  .get("/", async ({ currentUser, query }) => {
    // Auto-detect scope based on permissions
    const hasViewAll = currentUser.permissions.includes("SESSION.VIEW_ALL");

    const result = await sessionService.list({
      ...query,
      currentUserId: currentUser.id,
      hasViewPermission: hasViewAll,
    });
    return castToRes(result);
  })
  .post("/revoke", async ({ currentUser, body }) => {
    const hasRevokeAll = currentUser.permissions.includes("SESSION.REVOKE_ALL");

    if (hasRevokeAll) {
      await sessionService.revokeMany(ids);
    } else {
      await sessionService.revoke(currentUser.id, ids);
    }
    return castToRes(null);
  });
```

**Lợi ích**:

- Một endpoint cho cả user và admin
- Backend tự động filter dựa trên permissions
- Frontend không cần biết endpoint khác nhau

#### 3.4.2. Service Layer Pattern

Service layer vẫn giữ nguyên, nhưng có thể generalize:

```typescript
class ResourceService<TData, TListParams> {
  async list(
    params: TListParams & {
      currentUserId: string;
      hasViewPermission: boolean;
    }
  ): Promise<PagingResponse<TData>> {
    // Generic list logic
  }

  async revoke(userId: string, ids: string[]): Promise<void> {
    // Revoke logic with ownership check
  }

  async revokeMany(ids: string[]): Promise<void> {
    // Revoke without ownership check (admin only)
  }
}
```

## 4. Implementation Details

### 4.1. Resource Configuration

#### 4.1.1. Session Resource Config

```typescript
// resources/session.resource.ts
export const sessionResource: ResourceContext<
  AdminSession,
  AdminSessionListParams,
  { ids: string[] }
> = {
  name: "session",
  displayName: "Session",

  permissions: {
    view: ["SESSION.VIEW", "SESSION.VIEW_ALL"],
    viewAll: "SESSION.VIEW_ALL",
    delete: ["SESSION.REVOKE", "SESSION.REVOKE_ALL"],
  },

  endpoints: {
    list: "/api/sessions", // Unified endpoint
    delete: "/api/sessions/revoke",
  },

  dataConfig: {
    idField: "id",
    ownerField: "createdById",
    statusComputed: (session) => {
      if (session.revoked) return "revoked";
      if (dayjs(session.expired).isBefore(dayjs())) return "expired";
      return "active";
    },
  },

  uiConfig: {
    columns: [
      createDateColumn({ dataIndex: "created", title: "Created At" }),
      createDateColumn({ dataIndex: "expired", title: "Expires At" }),
      { title: "Device", dataIndex: "device" },
      { title: "IP", dataIndex: "ip" },
      createStatusColumn({
        dataIndex: "status",
        getStatus: (record) =>
          sessionResource.dataConfig.statusComputed!(record),
      }),
    ],
    filters: [
      { type: "dateRange", field: "created", label: "Created" },
      { type: "text", field: "ip", label: "IP" },
      {
        type: "select",
        field: "status",
        label: "Status",
        options: ["all", "active", "revoked"],
      },
    ],
    actions: [
      {
        key: "revoke",
        label: "Revoke",
        icon: <DeleteOutlined />,
        danger: true,
        permission: ["SESSION.REVOKE", "SESSION.REVOKE_ALL"],
        handler: async (record) => {
          await sessionService.revoke([record.id]);
        },
      },
    ],
    bulkActions: [
      {
        key: "revoke-selected",
        label: "Revoke Selected",
        permission: ["SESSION.REVOKE", "SESSION.REVOKE_ALL"],
        handler: async (ids) => {
          await sessionService.revoke(ids);
        },
      },
    ],
  },

  scope: "both", // Can be used for both user and admin
};
```

### 4.2. Usage Examples

#### 4.2.1. MySessionsPage (User Scope)

```typescript
// pages/MySessionsPage.tsx
export default function MySessionsPage() {
  return (
    <GenericResourcePage
      resource={sessionResource}
      scope="user" // Force user scope
      initialParams={{
        take: 20,
        created0: dayjs().subtract(7, "days").toISOString(),
        created1: dayjs().toISOString(),
      }}
    />
  );
}
```

#### 4.2.2. AdminSessionsPage (Admin Scope)

```typescript
// pages/AdminSessionsPage.tsx
export default function AdminSessionsPage() {
  return (
    <GenericResourcePage
      resource={sessionResource}
      scope="admin" // Force admin scope
      initialParams={{
        take: 20,
        created0: dayjs().subtract(7, "days").toISOString(),
        created1: dayjs().toISOString(),
      }}
    />
  );
}
```

#### 4.2.3. Unified SessionsPage (Auto-detect Scope)

```typescript
// pages/SessionsPage.tsx
export default function SessionsPage() {
  const { hasPermission } = usePermissions();
  const canViewAll = hasPermission("SESSION.VIEW_ALL");

  return (
    <GenericResourcePage
      resource={sessionResource}
      scope={canViewAll ? "admin" : "user"} // Auto-detect
      initialParams={{
        take: 20,
        created0: dayjs().subtract(7, "days").toISOString(),
        created1: dayjs().toISOString(),
      }}
    />
  );
}
```

### 4.3. Permission Handling

#### 4.3.1. Frontend Permission Check

```typescript
// GenericResourcePage.tsx
function GenericResourcePage<TData, TListParams>({ resource, scope }: Props) {
  const permissions = useResourcePermissions(resource);

  // Check view permission
  if (!permissions.canView) {
    return <AccessDeniedPage />;
  }

  // Determine effective scope
  const effectiveScope =
    scope === "both" ? (permissions.canViewAll ? "admin" : "user") : scope;

  // Filter columns based on permissions
  const visibleColumns = resource.uiConfig.columns.filter((col) => {
    // Hide user column if can't view all
    if (col.dataIndex === "createdById" && !permissions.canViewAll) {
      return false;
    }
    return true;
  });

  // Filter actions based on permissions
  const visibleActions = resource.uiConfig.actions?.filter((action) => {
    return permissions.canAction(action.key);
  });

  // ...
}
```

#### 4.3.2. Backend Permission Check

```typescript
// session.controller.ts
.get(
  '/',
  async ({ currentUser, query }) => {
    // Check permission
    const hasView = currentUser.permissions.includes('SESSION.VIEW');
    const hasViewAll = currentUser.permissions.includes('SESSION.VIEW_ALL');

    if (!hasView && !hasViewAll) {
      throw new ForbiddenErr(ErrCode.PermissionDenied);
    }

    // Auto-filter based on permission
    const result = await sessionService.list({
      ...query,
      currentUserId: currentUser.id,
      hasViewPermission: hasViewAll, // If false, filter by currentUserId
    });

    return castToRes(result);
  }
)
```

### 4.4. Security Considerations

#### 4.4.1. Ownership Validation

Khi user thực hiện action (revoke, delete, ...), backend phải validate ownership:

```typescript
// session.service.ts
async revoke(userId: string, sessionIds: string[], hasRevokeAll: boolean) {
  const whereCondition: SessionWhereInput = {
    ...(hasRevokeAll
      ? {} // Admin can revoke any
      : { createdById: userId } // User can only revoke own
    ),
    id: { in: sessionIds },
    revoked: { not: { equals: true } },
  };

  await this.deps.db.session.updateMany({
    where: whereCondition,
    data: { revoked: true },
  });
}
```

#### 4.4.2. Data Filtering

Backend luôn filter data dựa trên permissions:

```typescript
// session.service.ts
async list(params: ListParams) {
  const conditions: SessionWhereInput[] = [
    // Date range, IP, status filters...
  ];

  // Always filter by ownership if not admin
  if (!params.hasViewPermission) {
    conditions.push({ createdById: params.currentUserId });
  }

  // Additional user filter (admin only)
  if (params.userIds && params.userIds.length > 0) {
    if (!params.hasViewPermission) {
      // User can't filter by other users
      throw new ForbiddenErr(ErrCode.PermissionDenied);
    }
    conditions.push({ createdById: { in: params.userIds } });
  }

  // ...
}
```

## 5. Migration Strategy

### 5.1. Phase 1: Create Generic Components

1. Tạo `GenericResourcePage` component
2. Tạo `GenericResourceTable` component
3. Tạo `useResourcePagination` hook
4. Tạo `useResourcePermissions` hook

### 5.2. Phase 2: Refactor Session Resource

1. Tạo `sessionResource` config
2. Refactor `MySessionsPage` để dùng `GenericResourcePage`
3. Refactor `AdminSessionsPage` để dùng `GenericResourcePage`
4. Test và verify

### 5.3. Phase 3: Unify Backend Endpoints

1. Merge `session-user.controller` và `session-admin.controller` thành `session.controller`
2. Update routes
3. Test và verify

### 5.4. Phase 4: Apply to Other Resources

1. Tạo resource configs cho notification, security event, API key, ...
2. Tạo pages sử dụng `GenericResourcePage`
3. Test và verify

## 6. Benefits

### 6.1. Code Reusability

- **Before**: Mỗi resource cần ~200-300 lines code cho page
- **After**: Chỉ cần ~50-100 lines config

### 6.2. Consistency

- UX nhất quán giữa các resources
- Behavior nhất quán (pagination, filtering, actions)
- Error handling nhất quán

### 6.3. Maintainability

- Bug fix ở một nơi, fix cho tất cả resources
- Feature mới (export, import, ...) chỉ cần implement một lần
- Dễ test và verify

### 6.4. Security

- Permission logic tập trung
- Ownership validation nhất quán
- Dễ audit và review

## 7. Example: Notification Resource

```typescript
// resources/notification.resource.ts
export const notificationResource: ResourceContext<
  Notification,
  NotificationListParams,
  { ids: string[] }
> = {
  name: "notification",
  displayName: "Notification",

  permissions: {
    view: ["NOTIFICATION.VIEW", "NOTIFICATION.VIEW_ALL"],
    viewAll: "NOTIFICATION.VIEW_ALL",
    update: ["NOTIFICATION.MARK_READ", "NOTIFICATION.MARK_READ_ALL"],
    delete: ["NOTIFICATION.DELETE", "NOTIFICATION.DELETE_ALL"],
  },

  endpoints: {
    list: "/api/notifications",
    update: "/api/notifications/mark-read",
    delete: "/api/notifications",
  },

  dataConfig: {
    idField: "id",
    ownerField: "userId",
    statusField: "read",
  },

  uiConfig: {
    columns: [
      { title: "Title", dataIndex: "title" },
      { title: "Message", dataIndex: "message" },
      createDateColumn({ dataIndex: "created", title: "Created At" }),
      createStatusColumn({
        dataIndex: "read",
        valueEnum: {
          true: { text: "Read", status: "Success" },
          false: { text: "Unread", status: "Processing" },
        },
      }),
    ],
    actions: [
      {
        key: "mark-read",
        label: "Mark as Read",
        permission: ["NOTIFICATION.MARK_READ", "NOTIFICATION.MARK_READ_ALL"],
        handler: async (record) => {
          await notificationService.markRead([record.id]);
        },
      },
      {
        key: "delete",
        label: "Delete",
        danger: true,
        permission: ["NOTIFICATION.DELETE", "NOTIFICATION.DELETE_ALL"],
        handler: async (record) => {
          await notificationService.delete([record.id]);
        },
      },
    ],
    bulkActions: [
      {
        key: "mark-read-selected",
        label: "Mark Selected as Read",
        permission: ["NOTIFICATION.MARK_READ", "NOTIFICATION.MARK_READ_ALL"],
        handler: async (ids) => {
          await notificationService.markRead(ids);
        },
      },
      {
        key: "delete-selected",
        label: "Delete Selected",
        danger: true,
        permission: ["NOTIFICATION.DELETE", "NOTIFICATION.DELETE_ALL"],
        handler: async (ids) => {
          await notificationService.delete(ids);
        },
      },
    ],
  },

  scope: "both",
};
```

**Usage**:

```typescript
// pages/MyNotificationsPage.tsx
export default function MyNotificationsPage() {
  return <GenericResourcePage resource={notificationResource} scope="user" />;
}

// pages/AdminNotificationsPage.tsx
export default function AdminNotificationsPage() {
  return <GenericResourcePage resource={notificationResource} scope="admin" />;
}
```

## 8. Conclusion

Thiết kế này giúp:

- **Giảm 70-80% code trùng lặp**
- **Tăng tính nhất quán** giữa các resources
- **Dễ mở rộng** cho resources mới
- **Đảm bảo bảo mật** với permission handling tập trung
- **Dễ maintain** với logic tập trung

Việc implement có thể làm từng bước, không cần refactor toàn bộ một lúc.
