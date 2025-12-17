# API Key Management - UI/UX Design Guide

## 📋 Mục Lục

1. [Design System](#design-system)
2. [Admin Interface](#admin-interface)
3. [User Interface](#user-interface)
4. [Component Specifications](#component-specifications)
5. [Interaction Patterns](#interaction-patterns)
6. [Responsive Design](#responsive-design)
7. [Accessibility](#accessibility)
8. [Error Handling](#error-handling)

---

## 🎨 Design System

### Color Palette

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| Active | Green | #52C41A | Active API keys |
| Revoked | Red | #F5222D | Revoked keys |
| Expired | Orange | #FA8C16 | Expired keys |
| Pending | Blue | #1890FF | Pending actions |
| Disabled | Gray | #BFBFBF | Disabled elements |

### Typography

```
Heading 1: 24px, Bold, Line-height: 1.35
Heading 2: 20px, Bold, Line-height: 1.4
Heading 3: 16px, Bold, Line-height: 1.5
Body: 14px, Regular, Line-height: 1.5
Small: 12px, Regular, Line-height: 1.5
Label: 14px, Medium, Line-height: 1.5
```

### Spacing

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

### Icons

Sử dụng Ant Design Icons:

- `CopyOutlined` - Copy to clipboard
- `EyeOutlined` - View
- `EditOutlined` - Edit
- `DeleteOutlined` - Delete
- `LockOutlined` - Locked/Secure
- `UnlockOutlined` - Unlocked
- `CheckCircleOutlined` - Active/Success
- `CloseCircleOutlined` - Revoked/Error
- `ClockCircleOutlined` - Expired
- `DownloadOutlined` - Download
- `PlusOutlined` - Add/Create
- `FilterOutlined` - Filter
- `SearchOutlined` - Search
- `ReloadOutlined` - Refresh
- `MoreOutlined` - More actions

---

## 👨‍💼 Admin Interface

### 1. Admin API Keys List Page

#### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Breadcrumb: Admin > API Keys                                │
│                                                               │
│ Title: API Key Management                                   │
│ Subtitle: Manage API keys for all users                     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Toolbar:                                                    │
│ [+ Create API Key] [Filters ▼] [Search...] [⟲ Refresh]    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filter Panel (Collapsible):                                 │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Status: [All ▼]                                     │   │
│ │ User: [Search user...] (Multi-select)              │   │
│ │ Date Range: [From] [To]                            │   │
│ │ [Apply] [Reset]                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Table:                                                      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☐ │ Name         │ User      │ Status  │ Last Used │ ... │
│ ├──────────────────────────────────────────────────────┤   │
│ │ ☑ │ Prod Key     │ John Doe  │ ✓ Active│ 2 min ago │ ... │
│ │ ☐ │ Dev Key      │ Jane Doe  │ ✗ Revoked│ Never   │ ... │
│ │ ☐ │ Test Key     │ Admin     │ ⏰ Expired│ 1 hour  │ ... │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Pagination: Showing 1-20 of 50  [< 1 2 3 >]               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Toolbar Components

```typescript
// Create Button
<Button 
  type="primary" 
  icon={<PlusOutlined />}
  onClick={handleCreate}
>
  Create API Key
</Button>

// Filters Dropdown
<Dropdown 
  menu={{ items: filterOptions }}
  placement="bottomLeft"
>
  <Button icon={<FilterOutlined />}>
    Filters
  </Button>
</Dropdown>

// Search Input
<Input.Search
  placeholder="Search API keys..."
  prefix={<SearchOutlined />}
  onSearch={handleSearch}
  style={{ width: 200 }}
/>

// Refresh Button
<Button 
  icon={<ReloadOutlined />}
  onClick={handleRefresh}
/>
```

#### Table Columns

```typescript
const columns: ProColumns<ApiKeyItem>[] = [
  {
    title: '',
    key: 'checkbox',
    width: 50,
    render: (_, record) => (
      <Checkbox 
        checked={selectedKeys.includes(record.id)}
        onChange={() => toggleSelect(record.id)}
      />
    ),
  },
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    render: (text, record) => (
      <a onClick={() => navigateToDetail(record.id)}>
        {text}
      </a>
    ),
  },
  {
    title: 'User',
    dataIndex: ['user', 'name'],
    key: 'user',
    width: 150,
    render: (text, record) => (
      <span>{text || record.userId}</span>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status) => (
      <Tag 
        color={statusColors[status]}
        icon={statusIcons[status]}
      >
        {status.toUpperCase()}
      </Tag>
    ),
  },
  {
    title: 'Last Used',
    dataIndex: 'lastUsedAt',
    key: 'lastUsedAt',
    width: 150,
    render: (date) => (
      <span>
        {date ? dayjs(date).fromNow() : 'Never'}
      </span>
    ),
  },
  {
    title: 'Expires',
    dataIndex: 'expiresAt',
    key: 'expiresAt',
    width: 150,
    render: (date) => (
      <span>
        {date ? dayjs(date).format('YYYY-MM-DD') : 'Never'}
      </span>
    ),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button 
          type="text" 
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigateToDetail(record.id)}
          title="View"
        />
        <Button 
          type="text" 
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditModal(record.id)}
          title="Edit"
        />
        <Dropdown 
          menu={{
            items: [
              {
                key: 'revoke',
                label: 'Revoke',
                onClick: () => handleRevoke(record.id),
              },
              {
                key: 'delete',
                label: 'Delete',
                danger: true,
                onClick: () => handleDelete(record.id),
              },
            ],
          }}
        >
          <Button 
            type="text" 
            size="small"
            icon={<MoreOutlined />}
          />
        </Dropdown>
      </Space>
    ),
  },
];
```

#### Filter Panel

```typescript
<Collapse
  items={[
    {
      key: 'filters',
      label: 'Filters',
      children: (
        <Form layout="vertical">
          <Form.Item label="Status">
            <Select
              mode="multiple"
              placeholder="Select statuses"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Revoked', value: 'revoked' },
                { label: 'Expired', value: 'expired' },
              ]}
              onChange={handleStatusChange}
            />
          </Form.Item>

          <Form.Item label="User">
            <Select
              mode="multiple"
              placeholder="Search users..."
              filterOption={false}
              onSearch={handleUserSearch}
              options={userOptions}
              onChange={handleUserChange}
            />
          </Form.Item>

          <Form.Item label="Date Range">
            <RangePicker
              onChange={handleDateChange}
            />
          </Form.Item>

          <Space>
            <Button type="primary" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
            <Button onClick={handleResetFilters}>
              Reset
            </Button>
          </Space>
        </Form>
      ),
    },
  ]}
/>
```

---

### 2. Create API Key Modal (Admin)

#### Modal Layout

```typescript
<Modal
  title="Create API Key"
  open={isCreateModalOpen}
  onOk={handleCreateSubmit}
  onCancel={handleCreateCancel}
  width={600}
  okText="Create"
  cancelText="Cancel"
>
  <Form
    form={createForm}
    layout="vertical"
    onFinish={handleCreateSubmit}
  >
    {/* User Selection - Admin Only */}
    <Form.Item
      label="User"
      name="userId"
      rules={[
        {
          required: false,
          message: 'Please select a user',
        },
      ]}
      tooltip="Leave empty to create for yourself"
    >
      <Select
        placeholder="Search users..."
        filterOption={false}
        onSearch={handleUserSearch}
        options={userOptions}
        allowClear
      />
    </Form.Item>

    {/* Name */}
    <Form.Item
      label="Name"
      name="name"
      rules={[
        {
          required: true,
          message: 'Please enter API key name',
        },
        {
          min: 1,
          max: 255,
          message: 'Name must be 1-255 characters',
        },
      ]}
    >
      <Input
        placeholder="e.g., Production API Key"
        maxLength={255}
      />
    </Form.Item>

    {/* Expires At */}
    <Form.Item
      label="Expires At"
      name="expiresAt"
      tooltip="Leave empty for no expiration"
    >
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        disabledDate={(current) =>
          current && current < dayjs().startOf('day')
        }
      />
    </Form.Item>

    {/* Permissions */}
    <Form.Item
      label="Permissions"
      name="permissions"
      tooltip="Leave empty to inherit all user permissions"
    >
      <Checkbox.Group
        options={permissionOptions}
        style={{ display: 'flex', flexDirection: 'column' }}
      />
    </Form.Item>

    {/* IP Whitelist */}
    <Form.Item
      label="IP Whitelist"
      tooltip="Leave empty for no IP restriction"
    >
      <Form.List name="ipWhitelist">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: 'flex' }}>
                <Form.Item
                  {...restField}
                  name={[name]}
                  rules={[
                    {
                      pattern: /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/,
                      message: 'Invalid IP address',
                    },
                  ]}
                >
                  <Input placeholder="192.168.1.1 or 10.0.0.0/8" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={() => add()}
              icon={<PlusOutlined />}
            >
              Add IP
            </Button>
          </>
        )}
      </Form.List>
    </Form.Item>

    {/* Metadata */}
    <Form.Item
      label="Metadata (JSON)"
      name="metadata"
      tooltip="Additional metadata as JSON"
    >
      <Input.TextArea
        placeholder='{"environment": "production"}'
        rows={4}
      />
    </Form.Item>
  </Form>
</Modal>
```

---

### 3. Edit API Key Modal (Admin)

#### Modal Layout

```typescript
<Modal
  title="Edit API Key"
  open={isEditModalOpen}
  onOk={handleEditSubmit}
  onCancel={handleEditCancel}
  width={600}
  okText="Save Changes"
  cancelText="Cancel"
  footer={[
    <Button key="cancel" onClick={handleEditCancel}>
      Cancel
    </Button>,
    <Button
      key="delete"
      danger
      onClick={handleDelete}
    >
      Delete
    </Button>,
    <Button
      key="revoke"
      onClick={handleRevoke}
    >
      Revoke
    </Button>,
    <Button
      key="submit"
      type="primary"
      onClick={handleEditSubmit}
    >
      Save Changes
    </Button>,
  ]}
>
  <Form
    form={editForm}
    layout="vertical"
    onFinish={handleEditSubmit}
  >
    {/* Key Prefix - Read Only */}
    <Form.Item label="Key Prefix">
      <Input
        value={selectedKey?.keyPrefix}
        disabled
        prefix={<LockOutlined />}
      />
    </Form.Item>

    {/* Status - Read Only */}
    <Form.Item label="Status">
      <Tag
        color={statusColors[selectedKey?.status]}
        icon={statusIcons[selectedKey?.status]}
      >
        {selectedKey?.status.toUpperCase()}
      </Tag>
      <Text type="secondary" style={{ marginLeft: 8 }}>
        Use "Revoke" button to change status
      </Text>
    </Form.Item>

    {/* Name */}
    <Form.Item
      label="Name"
      name="name"
      rules={[
        {
          required: true,
          message: 'Please enter API key name',
        },
      ]}
    >
      <Input placeholder="API Key Name" />
    </Form.Item>

    {/* Expires At */}
    <Form.Item
      label="Expires At"
      name="expiresAt"
    >
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        disabledDate={(current) =>
          current && current < dayjs().startOf('day')
        }
      />
    </Form.Item>

    {/* Permissions */}
    <Form.Item
      label="Permissions"
      name="permissions"
    >
      <Checkbox.Group
        options={permissionOptions}
        style={{ display: 'flex', flexDirection: 'column' }}
      />
    </Form.Item>

    {/* IP Whitelist */}
    <Form.Item label="IP Whitelist">
      <Form.List name="ipWhitelist">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: 'flex' }}>
                <Form.Item
                  {...restField}
                  name={[name]}
                  rules={[
                    {
                      pattern: /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/,
                      message: 'Invalid IP address',
                    },
                  ]}
                >
                  <Input placeholder="192.168.1.1 or 10.0.0.0/8" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={() => add()}
              icon={<PlusOutlined />}
            >
              Add IP
            </Button>
          </>
        )}
      </Form.List>
    </Form.Item>

    {/* Metadata */}
    <Form.Item
      label="Metadata (JSON)"
      name="metadata"
    >
      <Input.TextArea
        placeholder='{"environment": "production"}'
        rows={4}
      />
    </Form.Item>
  </Form>
</Modal>
```

---

### 4. API Key Detail Page (Admin)

#### Page Layout

```typescript
<div className="api-key-detail-page">
  {/* Header */}
  <PageHeader
    onBack={() => navigate(-1)}
    title={apiKey?.name}
    subTitle={`Key Prefix: ${apiKey?.keyPrefix}`}
    extra={[
      <Button
        key="edit"
        type="primary"
        icon={<EditOutlined />}
        onClick={handleEdit}
      >
        Edit
      </Button>,
      <Dropdown
        key="more"
        menu={{
          items: [
            {
              key: 'revoke',
              label: 'Revoke',
              onClick: handleRevoke,
            },
            {
              key: 'regenerate',
              label: 'Regenerate',
              onClick: handleRegenerate,
            },
            {
              key: 'delete',
              label: 'Delete',
              danger: true,
              onClick: handleDelete,
            },
          ],
        }}
      >
        <Button icon={<MoreOutlined />} />
      </Dropdown>,
    ]}
  />

  {/* Tabs */}
  <Tabs
    defaultActiveKey="overview"
    items={[
      {
        key: 'overview',
        label: 'Overview',
        children: <OverviewTab />,
      },
      {
        key: 'configuration',
        label: 'Configuration',
        children: <ConfigurationTab />,
      },
      {
        key: 'usage',
        label: 'Usage',
        children: <UsageTab />,
      },
      {
        key: 'history',
        label: 'History',
        children: <HistoryTab />,
      },
    ]}
  />
</div>
```

#### Overview Tab

```typescript
<Descriptions
  bordered
  column={2}
  items={[
    {
      key: 'id',
      label: 'ID',
      children: apiKey?.id,
    },
    {
      key: 'keyPrefix',
      label: 'Key Prefix',
      children: (
        <Space>
          <code>{apiKey?.keyPrefix}</code>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(apiKey?.keyPrefix)}
          />
        </Space>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      children: (
        <Tag
          color={statusColors[apiKey?.status]}
          icon={statusIcons[apiKey?.status]}
        >
          {apiKey?.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      children: (
        <span>
          {apiKey?.user?.name} ({apiKey?.user?.email})
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      children: dayjs(apiKey?.created).format(
        'YYYY-MM-DD HH:mm:ss'
      ),
    },
    {
      key: 'modified',
      label: 'Last Modified',
      children: dayjs(apiKey?.modified).format(
        'YYYY-MM-DD HH:mm:ss'
      ),
    },
  ]}
/>
```

#### Configuration Tab

```typescript
<Descriptions
  bordered
  column={1}
  items={[
    {
      key: 'expiresAt',
      label: 'Expires At',
      children: apiKey?.expiresAt
        ? dayjs(apiKey.expiresAt).format('YYYY-MM-DD HH:mm:ss')
        : 'Never',
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: apiKey?.permissions?.length ? (
        <Space wrap>
          {apiKey.permissions.map((perm) => (
            <Tag key={perm}>{perm}</Tag>
          ))}
        </Space>
      ) : (
        <Text type="secondary">All user permissions</Text>
      ),
    },
    {
      key: 'ipWhitelist',
      label: 'IP Whitelist',
      children: apiKey?.ipWhitelist?.length ? (
        <Space wrap>
          {apiKey.ipWhitelist.map((ip) => (
            <Tag key={ip}>{ip}</Tag>
          ))}
        </Space>
      ) : (
        <Text type="secondary">No restriction</Text>
      ),
    },
    {
      key: 'metadata',
      label: 'Metadata',
      children: apiKey?.metadata ? (
        <pre>{JSON.stringify(apiKey.metadata, null, 2)}</pre>
      ) : (
        <Text type="secondary">None</Text>
      ),
    },
  ]}
/>
```

#### Usage Tab

```typescript
<div>
  <Statistic.Group>
    <Statistic
      title="Total Requests"
      value={usageStats?.totalRequests}
    />
    <Statistic
      title="Last Used"
      value={
        usageStats?.lastUsedAt
          ? dayjs(usageStats.lastUsedAt).fromNow()
          : 'Never'
      }
    />
  </Statistic.Group>

  <Divider />

  <h3>Requests per Day</h3>
  <LineChart data={usageStats?.requestsPerDay} />

  <Divider />

  <h3>Top Endpoints</h3>
  <Table
    columns={[
      {
        title: 'Endpoint',
        dataIndex: 'endpoint',
        key: 'endpoint',
      },
      {
        title: 'Requests',
        dataIndex: 'count',
        key: 'count',
      },
    ]}
    dataSource={usageStats?.topEndpoints}
    pagination={false}
  />
</div>
```

#### History Tab

```typescript
<Table
  columns={[
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <Tag color={methodColors[method]}>{method}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code) => (
        <Tag color={statusCodeColors[code]}>{code}</Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: 'User Agent',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
    },
  ]}
  dataSource={usageHistory}
  pagination={pagination}
  loading={loading}
/>
```

---

## 👤 User Interface

### 1. User API Keys List Page

#### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Breadcrumb: Settings > API Keys                             │
│                                                               │
│ Title: My API Keys                                          │
│ Subtitle: Manage your API keys for integrations             │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Toolbar:                                                    │
│ [+ Create API Key] [Filters ▼] [Search...] [⟲ Refresh]    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Filter Panel (Collapsible):                                 │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Status: [All ▼]                                     │   │
│ │ Date Range: [From] [To]                            │   │
│ │ [Apply] [Reset]                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Table:                                                      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Name         │ Status  │ Last Used │ Expires │ ... │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ My API Key   │ ✓ Active│ 2 min ago │ 2026-12 │ ... │   │
│ │ Test Key     │ ✗ Revoked│ Never   │ 2025-12 │ ... │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                               │
│ Pagination: Showing 1-20 of 5  [< 1 >]                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Differences from Admin

- Không có User column
- Không có User filter
- Không có bulk select checkbox
- Simplified actions (View, Edit, Delete)
- Simplified filter options

---

### 2. Create API Key Modal (User)

#### Modal Layout

```typescript
<Modal
  title="Create API Key"
  open={isCreateModalOpen}
  onOk={handleCreateSubmit}
  onCancel={handleCreateCancel}
  width={600}
>
  <Form
    form={createForm}
    layout="vertical"
    onFinish={handleCreateSubmit}
  >
    {/* Name */}
    <Form.Item
      label="Name"
      name="name"
      rules={[
        {
          required: true,
          message: 'Please enter API key name',
        },
      ]}
    >
      <Input placeholder="e.g., My API Key" />
    </Form.Item>

    {/* Expires At */}
    <Form.Item
      label="Expires At"
      name="expiresAt"
      tooltip="Leave empty for no expiration"
    >
      <DatePicker
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        disabledDate={(current) =>
          current && current < dayjs().startOf('day')
        }
      />
    </Form.Item>

    {/* Permissions */}
    <Form.Item
      label="Permissions"
      name="permissions"
      tooltip="Leave empty to inherit all your permissions"
    >
      <Checkbox.Group
        options={permissionOptions}
        style={{ display: 'flex', flexDirection: 'column' }}
      />
    </Form.Item>

    {/* IP Whitelist */}
    <Form.Item
      label="IP Whitelist"
      tooltip="Leave empty for no IP restriction"
    >
      <Form.List name="ipWhitelist">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: 'flex' }}>
                <Form.Item
                  {...restField}
                  name={[name]}
                  rules={[
                    {
                      pattern: /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/,
                      message: 'Invalid IP address',
                    },
                  ]}
                >
                  <Input placeholder="192.168.1.1 or 10.0.0.0/8" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={() => add()}
              icon={<PlusOutlined />}
            >
              Add IP
            </Button>
          </>
        )}
      </Form.List>
    </Form.Item>
  </Form>
</Modal>
```

---

## 🧩 Component Specifications

### ApiKeyTable Component

```typescript
interface ApiKeyTableProps {
  dataSource: ApiKeyItem[];
  loading: boolean;
  pagination: PaginationConfig;
  onTableChange: (pagination, filters, sorter) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRevoke: (id: string) => void;
  onView: (id: string) => void;
  isAdmin?: boolean;
}

export function ApiKeyTable({
  dataSource,
  loading,
  pagination,
  onTableChange,
  onEdit,
  onDelete,
  onRevoke,
  onView,
  isAdmin = false,
}: ApiKeyTableProps) {
  // Implementation
}
```

### ApiKeyForm Component

```typescript
interface ApiKeyFormProps {
  initialValues?: Partial<ApiKeyItem>;
  onSubmit: (values: UpsertApiKeyParams) => Promise<void>;
  loading?: boolean;
  isAdmin?: boolean;
  users?: UserOption[];
}

export function ApiKeyForm({
  initialValues,
  onSubmit,
  loading = false,
  isAdmin = false,
  users = [],
}: ApiKeyFormProps) {
  // Implementation
}
```

### ApiKeyDetail Component

```typescript
interface ApiKeyDetailProps {
  id: string;
  onEdit: () => void;
  onDelete: () => void;
  onRevoke: () => void;
  onRegenerate: () => void;
}

export function ApiKeyDetail({
  id,
  onEdit,
  onDelete,
  onRevoke,
  onRegenerate,
}: ApiKeyDetailProps) {
  // Implementation
}
```

---

## 🎯 Interaction Patterns

### 1. Create API Key Flow

```
User clicks "Create API Key"
    ↓
Modal opens with form
    ↓
User fills in form
    ↓
User clicks "Create"
    ↓
Form validates
    ↓
API request sent
    ↓
Success: Show copy dialog
    ↓
User copies key
    ↓
User confirms
    ↓
Modal closes
    ↓
List refreshes
```

### 2. Edit API Key Flow

```
User clicks "Edit"
    ↓
Modal opens with current values
    ↓
User modifies fields
    ↓
User clicks "Save Changes"
    ↓
Form validates
    ↓
API request sent
    ↓
Success: Show toast
    ↓
Modal closes
    ↓
List refreshes
```

### 3. Delete API Key Flow

```
User clicks "Delete"
    ↓
Confirmation dialog appears
    ↓
User confirms
    ↓
API request sent
    ↓
Success: Show toast
    ↓
Dialog closes
    ↓
List refreshes
```

### 4. Revoke API Key Flow

```
User clicks "Revoke"
    ↓
Confirmation dialog appears
    ↓
User confirms
    ↓
API request sent
    ↓
Success: Show toast
    ↓
Dialog closes
    ↓
List refreshes
    ↓
Status changes to "Revoked"
```

---

## 📱 Responsive Design

### Breakpoints

```
xs: < 576px   (Mobile)
sm: 576px     (Tablet)
md: 768px     (Small Desktop)
lg: 992px     (Desktop)
xl: 1200px    (Large Desktop)
xxl: 1600px   (Extra Large Desktop)
```

### Mobile Layout

```
┌─────────────────────────────┐
│ API Key Management          │
├─────────────────────────────┤
│                              │
│ [+ Create]  [Filters] [⟲]  │
│                              │
├─────────────────────────────┤
│                              │
│ Name: Prod Key              │
│ Status: Active              │
│ Last Used: 2 min ago        │
│ [View] [Edit] [More ⋮]      │
│                              │
│ Name: Dev Key               │
│ Status: Revoked             │
│ Last Used: Never            │
│ [View] [Edit] [More ⋮]      │
│                              │
│ Showing 1-5 of 5            │
│                              │
└─────────────────────────────┘
```

### Tablet Layout

```
┌──────────────────────────────────────────┐
│ API Key Management                       │
├──────────────────────────────────────────┤
│                                           │
│ [+ Create] [Filters ▼] [Search] [⟲]    │
│                                           │
├──────────────────────────────────────────┤
│                                           │
│ ┌──────────────────────────────────────┐ │
│ │ Name    │ Status  │ Last Used │ ... │ │
│ ├──────────────────────────────────────┤ │
│ │ Prod... │ Active  │ 2 min ago │ ... │ │
│ │ Dev...  │ Revoked │ Never     │ ... │ │
│ └──────────────────────────────────────┘ │
│                                           │
│ Showing 1-5 of 5  [< 1 >]                │
│                                           │
└──────────────────────────────────────────┘
```

---

## ♿ Accessibility

### ARIA Labels

```typescript
<Button
  aria-label="Create new API key"
  icon={<PlusOutlined />}
>
  Create API Key
</Button>

<Input
  aria-label="Search API keys"
  placeholder="Search..."
/>

<Table
  aria-label="API keys table"
  columns={columns}
  dataSource={data}
/>
```

### Keyboard Navigation

- `Tab` - Navigate between elements
- `Enter` - Activate buttons/links
- `Space` - Toggle checkboxes
- `Escape` - Close modals/dropdowns
- `Arrow Up/Down` - Navigate in dropdowns

### Color Contrast

- Text on background: 4.5:1 ratio minimum
- UI components: 3:1 ratio minimum
- Status indicators: Use icons + colors

### Focus Management

- Focus visible on all interactive elements
- Focus trap in modals
- Focus restore when modal closes

---

## ⚠️ Error Handling

### Error Messages

```typescript
// Form validation errors
{
  required: 'This field is required',
  min: 'Minimum length is {min}',
  max: 'Maximum length is {max}',
  pattern: 'Invalid format',
  email: 'Invalid email address',
}

// API errors
{
  API_KEY_NOT_FOUND: 'API key not found',
  API_KEY_INVALID: 'Invalid API key',
  API_KEY_REVOKED: 'API key has been revoked',
  API_KEY_EXPIRED: 'API key has expired',
  PERMISSION_DENIED: 'You do not have permission',
  INVALID_INPUT: 'Invalid input data',
  RATE_LIMIT_EXCEEDED: 'Too many requests',
}
```

### Error Display

```typescript
// Form field error
<Form.Item
  label="Name"
  name="name"
  rules={[{ required: true }]}
>
  <Input />
</Form.Item>

// Toast notification
message.error('Failed to create API key');

// Alert component
<Alert
  message="Error"
  description="Failed to delete API key"
  type="error"
  closable
/>
```

### Loading States

```typescript
// Button loading
<Button loading={isLoading}>
  Create API Key
</Button>

// Table loading
<Table loading={isLoading} />

// Skeleton
<Skeleton active />
```

### Empty States

```typescript
<Empty
  description="No API keys found"
  style={{ marginTop: 48, marginBottom: 48 }}
>
  <Button type="primary" onClick={handleCreate}>
    Create API Key
  </Button>
</Empty>
```

---

## 📝 Notes

- Tuân theo Ant Design design system
- Sử dụng consistent spacing và typography
- Responsive design cho tất cả devices
- Accessible cho users with disabilities
- Clear error messages và feedback
- Loading states cho async operations
- Empty states khi không có data

---

**Last Updated:** 2025-12-17  
**Version:** 1.0  
**Status:** Ready for Implementation

