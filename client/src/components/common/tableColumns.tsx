import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Space, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { TableActionConfig } from 'src/types/table';

export interface CreateActionColumnOptions<T> extends TableActionConfig<T> {
  width?: number;
  fixed?: 'left' | 'right';
  title?: string;
  viewTooltip?: string;
  editTooltip?: string;
  deleteTooltip?: string;
}

export function createActionColumn<T = Record<string, unknown>>(
  options: CreateActionColumnOptions<T> = {},
): ProColumns<T> {
  const {
    onView,
    onEdit,
    onDelete,
    viewTooltip,
    editTooltip,
    deleteTooltip,
    canView = () => true,
    canEdit = () => true,
    canDelete = () => true,
    width = 120,
    fixed = 'right',
    title,
  } = options;

  return {
    title: title ?? 'Actions',
    dataIndex: 'actions',
    valueType: 'option',
    width,
    fixed,
    hideInSearch: true,
    render: (_: unknown, record: T) => {
      const actions: React.ReactNode[] = [];

      if (onView && canView(record)) {
        actions.push(
          <Tooltip key="view" title={viewTooltip ?? 'View'}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
            />
          </Tooltip>,
        );
      }

      if (onEdit && canEdit(record)) {
        actions.push(
          <Tooltip key="edit" title={editTooltip ?? 'Edit'}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>,
        );
      }

      if (onDelete && canDelete(record)) {
        actions.push(
          <Tooltip key="delete" title={deleteTooltip ?? 'Delete'}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            />
          </Tooltip>,
        );
      }

      if (actions.length === 0) {
        return '-';
      }

      return <Space size="small">{actions}</Space>;
    },
  };
}

export interface CreateStatusColumnOptions<T> {
  dataIndex: string | string[];
  getStatus: (record: T) => string;
  getColor?: (status: string) => string;
  width?: number;
  hideInSearch?: boolean;
}

export function createStatusColumn<T = Record<string, unknown>>(
  options: CreateStatusColumnOptions<T>,
): ProColumns<T> {
  const {
    dataIndex,
    getStatus,
    getColor = () => 'default',
    width = 100,
    hideInSearch = true,
  } = options;

  return {
    title: 'Status',
    dataIndex: Array.isArray(dataIndex) ? dataIndex[0] : dataIndex,
    width,
    hideInSearch,
    render: (_: unknown, record: T) => {
      const status = getStatus(record);
      const color = getColor(status);
      return <Tag color={color}>{status}</Tag>;
    },
  };
}

export interface CreateDateColumnOptions {
  dataIndex: string | string[];
  title?: string;
  format?: string;
  valueType?: 'date' | 'dateRange' | 'dateTime' | 'dateTimeRange';
  hideInSearch?: boolean;
  sorter?: boolean;
}

export function createDateColumn<T = Record<string, unknown>>(
  options: CreateDateColumnOptions,
): ProColumns<T> {
  const {
    dataIndex,
    title,
    format = 'YYYY-MM-DD HH:mm:ss',
    valueType = 'date',
    hideInSearch = false,
    sorter = false,
  } = options;

  const dataIndexStr = Array.isArray(dataIndex) ? dataIndex[0] : dataIndex;

  return {
    title: title ?? 'Date',
    dataIndex: dataIndexStr,
    valueType,
    hideInSearch,
    sorter: sorter
      ? (a, b) => {
          const aVal = (a as Record<string, unknown>)[dataIndexStr];
          const bVal = (b as Record<string, unknown>)[dataIndexStr];
          if (!aVal || !bVal) return 0;
          return (
            dayjs(aVal as string).valueOf() - dayjs(bVal as string).valueOf()
          );
        }
      : false,
    render: (_: unknown, record: T) => {
      const value = (record as Record<string, unknown>)[dataIndexStr];
      if (!value) return '-';
      return dayjs(value as string).format(format);
    },
  };
}

export interface CreateSearchColumnOptions {
  dataIndex: string;
  placeholder?: string;
  valueType?: 'text' | 'select';
  options?: Array<{ label: string; value: string | number }>;
}

export function createSearchColumn<T = Record<string, unknown>>(
  options: CreateSearchColumnOptions,
): ProColumns<T> {
  const {
    dataIndex,
    placeholder = 'Search...',
    valueType = 'text',
    options: selectOptions,
  } = options;

  return {
    title: 'Search',
    dataIndex,
    hideInTable: true,
    valueType,
    fieldProps: {
      placeholder,
      ...(valueType === 'select' && selectOptions
        ? {
            options: selectOptions,
            allowClear: true,
            showSearch: true,
          }
        : {
            allowClear: true,
          }),
    },
  };
}
