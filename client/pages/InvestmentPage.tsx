import AddEditInvestmentDialog from '@client/components/AddEditInvestmentDialog';
import InvestmentTable from '@client/components/InvestmentTable';
import {
  useCreateInvestmentMutation,
  useUpdateInvestmentMutation,
} from '@client/hooks/mutations/useInvestmentMutations';
import { useCurrenciesQuery } from '@client/hooks/queries/useCurrencyQueries';
import { useInvestmentsQuery } from '@client/hooks/queries/useInvestmentQueries';
import type {
  InvestmentFormData,
  InvestmentFull,
} from '@client/types/investment';
import { Button, MultiSelect, Text } from '@mantine/core';
import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

const InvestmentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedInvestment, setSelectedInvestment] =
    useState<InvestmentFull | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [assetTypes, setAssetTypes] = useState<InvestmentAssetType[]>([]);
  const [modes, setModes] = useState<InvestmentMode[]>([]);
  const [currencyIds, setCurrencyIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(
    () => ({
      assetTypes: assetTypes.length > 0 ? assetTypes : undefined,
      modes: modes.length > 0 ? modes : undefined,
      currencyIds: currencyIds.length > 0 ? currencyIds : undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      assetTypes,
      modes,
      currencyIds,
      searchQuery,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
  );

  const { data, isLoading } = useInvestmentsQuery(queryParams);
  const { data: currencies = [] } = useCurrenciesQuery();
  const createMutation = useCreateInvestmentMutation();
  const updateMutation = useUpdateInvestmentMutation();

  const handleAdd = () => {
    setSelectedInvestment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (investment: InvestmentFull) => {
    setSelectedInvestment(investment);
    setIsDialogOpen(true);
  };

  const handleView = (investment: InvestmentFull) => {
    navigate(`/investments/${investment.id}`);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedInvestment(null);
  };

  const handleSubmit = async (formData: InvestmentFormData) => {
    if (formData.id) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    handleDialogClose();
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    assetTypes.length > 0 ||
    modes.length > 0 ||
    currencyIds.length > 0;

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || isLoading;

  const summary = data?.pagination
    ? [
        <Text
          key="total"
          size="sm"
          className="text-gray-600 dark:text-gray-400"
        >
          {t('investments.totalCount', {
            defaultValue: 'Total investments: {{count}}',
            count: data.pagination.total,
          })}
        </Text>,
      ]
    : null;

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('investments.title', { defaultValue: 'Investments' })}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('investments.subtitle', {
                  defaultValue:
                    'Track your assets, positions, and performance in one place.',
                })}
              </p>
            </div>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {t('investments.addInvestment', {
                defaultValue: 'New investment',
              })}
            </Button>
          </div>

          <InvestmentTable
            investments={data?.investments || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onView={handleView}
            search={{
              onSearch: (value: string) => {
                setSearchQuery(value);
                setPage(1);
              },
              placeholder: t('investments.search', {
                defaultValue: 'Search investments',
              }),
            }}
            filters={{
              hasActive: hasActiveFilters,
              onReset: () => {
                setAssetTypes([]);
                setModes([]);
                setCurrencyIds([]);
                setSearchQuery('');
                setPage(1);
              },
              slots: [
                <MultiSelect
                  key="asset-filter"
                  value={assetTypes}
                  onChange={(value) =>
                    setAssetTypes(value as InvestmentAssetType[])
                  }
                  placeholder={t('investments.assetFilter', {
                    defaultValue: 'Asset type',
                  })}
                  data={[
                    {
                      value: InvestmentAssetType.coin,
                      label: t('investments.asset.coin', {
                        defaultValue: 'Coin',
                      }),
                    },
                    {
                      value: InvestmentAssetType.ccq,
                      label: t('investments.asset.ccq', {
                        defaultValue: 'Mutual fund',
                      }),
                    },
                    {
                      value: InvestmentAssetType.custom,
                      label: t('investments.asset.custom', {
                        defaultValue: 'Custom',
                      }),
                    },
                  ]}
                />,
                <MultiSelect
                  key="mode-filter"
                  value={modes}
                  onChange={(value) => setModes(value as InvestmentMode[])}
                  placeholder={t('investments.modeFilter', {
                    defaultValue: 'Mode',
                  })}
                  data={[
                    {
                      value: InvestmentMode.priced,
                      label: t('investments.mode.priced', {
                        defaultValue: 'Market priced',
                      }),
                    },
                    {
                      value: InvestmentMode.manual,
                      label: t('investments.mode.manual', {
                        defaultValue: 'Manual valuation',
                      }),
                    },
                  ]}
                />,
                <MultiSelect
                  key="currency-filter"
                  value={currencyIds}
                  onChange={setCurrencyIds}
                  placeholder={t('investments.currencyFilter', {
                    defaultValue: 'Currency',
                  })}
                  data={currencies.map((currency) => ({
                    value: currency.id,
                    label: `${currency.code} - ${currency.name}`,
                  }))}
                />,
              ],
            }}
            pageSize={{
              initialSize: limit,
              onPageSizeChange: (size: number) => {
                setLimit(size);
                setPage(1);
              },
            }}
            pagination={
              data?.pagination && data.pagination.totalPages > 0
                ? {
                    currentPage: page,
                    totalPages: data.pagination.totalPages,
                    totalItems: data.pagination.total,
                    itemsPerPage: limit,
                    onPageChange: setPage,
                  }
                : undefined
            }
            sorting={{
              sortBy,
              sortOrder,
              onSortChange: (
                newSortBy: string,
                newSortOrder: 'asc' | 'desc',
              ) => {
                setSortBy(newSortBy as 'name' | 'createdAt' | 'updatedAt');
                setSortOrder(newSortOrder);
                setPage(1);
              },
            }}
            summary={summary}
          />
        </div>
      </div>

      {isDialogOpen && (
        <AddEditInvestmentDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          investment={selectedInvestment}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default InvestmentPage;
