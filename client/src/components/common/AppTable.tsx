import type { ProTableProps } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';

export function AppTable<
  T extends Record<string, any>,
  U extends Record<string, any> = Record<string, any>,
>(props: ProTableProps<T, U>) {
  return (
    <ProTable<T, U>
      bordered
      rowKey={props.rowKey ?? 'id'}
      search={
        props.search ?? {
          collapsed: false,
          labelWidth: 'auto',
        }
      }
      pagination={
        props.pagination ?? {
          pageSize: 10,
          showSizeChanger: true,
        }
      }
      options={
        props.options ?? {
          density: true,
          fullScreen: true,
          setting: true,
        }
      }
      {...props}
    />
  );
}
