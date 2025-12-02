import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space } from 'antd';
import { useState } from 'react';
import { confirmModal } from 'src/components/common/AppModal';
import { AppTable } from 'src/components/common/AppTable';

export interface CrudTableProps<T extends Record<string, unknown>> {
  dataSource?: T[];
  columns: ProColumns<T>[];
  loading?: boolean;
  onCreate?: () => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => Promise<void> | void;
  createButtonText?: string;
  editButtonText?: string;
  deleteButtonText?: string;
  deleteConfirmTitle?: string;
  deleteConfirmContent?: string | ((record: T) => string);
  rowKey?: string | ((record: T) => string);

  [key: string]: unknown;
}

export function CrudTable<T extends Record<string, unknown>>({
  dataSource,
  columns,
  loading,
  onCreate,
  onEdit,
  onDelete,
  createButtonText = 'Tạo mới',
  editButtonText = 'Sửa',
  deleteButtonText = 'Xóa',
  deleteConfirmTitle = 'Xác nhận xóa',
  deleteConfirmContent,
  rowKey = 'id',
  ...tableProps
}: CrudTableProps<T>) {
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const handleDelete = (record: T) => {
    const id =
      typeof rowKey === 'function'
        ? rowKey(record)
        : (record[rowKey] as string | number);

    confirmModal({
      title: deleteConfirmTitle,
      content:
        typeof deleteConfirmContent === 'function'
          ? deleteConfirmContent(record)
          : (deleteConfirmContent ?? 'Bạn có chắc chắn muốn xóa mục này?'),
      okType: 'danger',
      onOk: async () => {
        if (onDelete) {
          setDeletingId(id);
          try {
            await onDelete(record);
          } finally {
            setDeletingId(null);
          }
        }
      },
    });
  };

  const actionColumns: ProColumns<T> = {
    title: 'Thao tác',
    key: 'action',
    fixed: 'right',
    width: 120,
    render: (_: unknown, record: T) => {
      const id =
        typeof rowKey === 'function'
          ? rowKey(record)
          : (record[rowKey] as string | number);
      const isDeleting = deletingId === id;

      return (
        <Space>
          {onEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              disabled={isDeleting}
            >
              {editButtonText}
            </Button>
          )}
          {onDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={isDeleting}
              disabled={isDeleting}
            >
              {deleteButtonText}
            </Button>
          )}
        </Space>
      );
    },
  };

  const finalColumns = [...columns, actionColumns];

  return (
    <AppTable<T>
      dataSource={dataSource}
      columns={finalColumns}
      loading={loading}
      rowKey={rowKey}
      toolBarRender={() => [
        onCreate && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            {createButtonText}
          </Button>
        ),
      ]}
      {...tableProps}
    />
  );
}
