import type { ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AccessDeniedPage from 'src/app/pages/AccessDeniedPage';
import { AppPage } from 'src/components/common/AppPage';
import { GenericResourceTable } from 'src/components/resource/GenericResourceTable';
import { usePermissions } from 'src/hooks/auth/usePermissions';
import { useResourcePagination } from 'src/hooks/resource/useResourcePagination';
import { useResourcePermissions } from 'src/hooks/resource/useResourcePermissions';
import type { ResourceContext, ResourceScope } from 'src/types/resource';

export interface GenericResourcePageProps<
  TData extends Record<string, any>,
  TListParams extends Record<string, any> = Record<string, any>,
> {
  resource: ResourceContext<TData, TListParams, any>;
  scope?: ResourceScope;
  initialParams?: Partial<TListParams>;
  pageSize?: number;
  customColumns?: ProColumns<TData>[];
  extendBaseColumns?: boolean;
  formInitialValues?: TListParams;
  onSubmit?: (values: TListParams) => void;
  onReset?: () => void;
  extraToolbarActions?: React.ReactNode[];
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
}

export function GenericResourcePage<
  TData extends Record<string, any>,
  TListParams extends Record<string, any> = Record<string, any>,
>({
  resource,
  initialParams = {},
  pageSize = 20,
  customColumns,
  extendBaseColumns = false,
  formInitialValues,
  onSubmit,
  onReset,
  extraToolbarActions = [],
  customHeader,
  customFooter,
}: GenericResourcePageProps<TData, TListParams>) {
  const { t } = useTranslation();
  const permissions = useResourcePermissions(resource);
  const { hasPermission } = usePermissions();

  if (!permissions.canView) {
    return <AccessDeniedPage />;
  }

  const listParams = useMemo(
    () =>
      ({
        ...initialParams,
        take: pageSize,
      }) as unknown as TListParams,
    [initialParams, pageSize],
  );

  const {
    data,
    pagination,
    isLoading,
    isInitialLoading,
    reload,
    goToPage,
    changePageSize,
  } = useResourcePagination({
    resource,
    initialParams: listParams,
    pageSize,
    autoLoad: true,
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const visibleColumns = useMemo(() => {
    const baseColumns = resource.uiConfig.columns;
    const filtered = baseColumns.filter((col) => {
      if (
        col.dataIndex === resource.dataConfig.ownerField &&
        !permissions.canViewAll
      ) {
        return false;
      }
      return true;
    });
    return extendBaseColumns
      ? [...filtered, ...(customColumns ?? [])]
      : (customColumns ?? filtered);
  }, [resource, permissions.canViewAll, extendBaseColumns, customColumns]);

  const visibleActions = useMemo(() => {
    return resource.uiConfig.actions?.filter((action) => {
      if (action.permission) {
        const perms = Array.isArray(action.permission)
          ? action.permission
          : [action.permission];
        return hasPermission(perms, 'any');
      }
      return true;
    });
  }, [resource, hasPermission]);

  const visibleBulkActions = useMemo(() => {
    return resource.uiConfig.bulkActions?.filter((action) => {
      if (action.permission) {
        const perms = Array.isArray(action.permission)
          ? action.permission
          : [action.permission];
        return hasPermission(perms, 'any');
      }
      return true;
    });
  }, [resource, hasPermission]);

  const actionColumns: ProColumns<TData>[] = useMemo(() => {
    if (!visibleActions || visibleActions.length === 0) return [];

    return [
      {
        title: t('common.fields.actions'),
        dataIndex: 'actions',
        hideInSearch: true,
        render: (_: unknown, record: TData) => {
          const actionButtons = visibleActions
            .filter((action) => {
              if (action.visible && !action.visible(record)) return false;
              return true;
            })
            .map((action) => {
              const handleClick = async () => {
                await action.handler(record);
                await reload();
              };

              if (action.danger) {
                return (
                  <Popconfirm
                    key={action.key}
                    title={
                      t('common.dialogs.confirmAction' as any) || 'Confirm'
                    }
                    onConfirm={handleClick}
                  >
                    <Button size="small" danger type="link">
                      {action.label}
                    </Button>
                  </Popconfirm>
                );
              }

              return (
                <Button
                  key={action.key}
                  size="small"
                  type="link"
                  icon={action.icon}
                  onClick={handleClick}
                >
                  {action.label}
                </Button>
              );
            });

          if (actionButtons.length === 0) return '-';

          return <>{actionButtons}</>;
        },
      },
    ];
  }, [visibleActions, t, reload]);

  const allColumns = useMemo(() => {
    return [...visibleColumns, ...actionColumns];
  }, [visibleColumns, actionColumns]);

  const rowSelection: TableRowSelection<TData> | undefined = useMemo(() => {
    if (!visibleBulkActions || visibleBulkActions.length === 0)
      return undefined;

    return {
      selectedRowKeys,
      onChange: (keys) => {
        setSelectedRowKeys(keys.map(String));
      },
    };
  }, [selectedRowKeys, visibleBulkActions]);

  const bulkActionButtons = useMemo(() => {
    if (!visibleBulkActions || visibleBulkActions.length === 0) return [];

    return visibleBulkActions.map((action) => {
      const handleClick = async () => {
        if (selectedRowKeys.length === 0) return;
        await action.handler(selectedRowKeys);
        setSelectedRowKeys([]);
        await reload();
      };

      if (action.danger) {
        return (
          <Popconfirm
            key={action.key}
            title={(t as any)('common.dialogs.confirmAction')}
            description={t(
              'common.dialogs.confirmBulkAction' as any,
              {
                count: selectedRowKeys.length,
              } as any,
            )}
            onConfirm={handleClick}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              key={action.key}
              danger
              disabled={selectedRowKeys.length === 0}
            >
              {action.label}
            </Button>
          </Popconfirm>
        );
      }

      return (
        <Button
          key={action.key}
          disabled={selectedRowKeys.length === 0}
          onClick={handleClick}
        >
          {action.label}
        </Button>
      );
    });
  }, [visibleBulkActions, selectedRowKeys, t, reload]);

  const HeaderComponent = resource.uiConfig.customComponents?.header;
  const FooterComponent = resource.uiConfig.customComponents?.footer;

  return (
    <AppPage>
      {customHeader || (HeaderComponent && <HeaderComponent />)}
      <GenericResourceTable<TData, TListParams>
        resource={resource}
        data={data}
        loading={isLoading || isInitialLoading}
        pagination={pagination}
        onPageChange={async (page, pageSize) => {
          if (pageSize && pageSize !== pagination.pageSize) {
            await changePageSize(pageSize);
          } else {
            await goToPage(page);
          }
        }}
        columns={allColumns}
        extendBaseColumns={false}
        formInitialValues={formInitialValues}
        onSubmit={onSubmit}
        onReset={onReset}
        extraToolbarActions={[...bulkActionButtons, ...extraToolbarActions]}
        rowSelection={rowSelection}
      />
      {customFooter || (FooterComponent && <FooterComponent />)}
    </AppPage>
  );
}
