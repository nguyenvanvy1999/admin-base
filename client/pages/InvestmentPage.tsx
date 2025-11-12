import AddEditInvestmentDialog from '@client/components/AddEditInvestmentDialog';
import InvestmentTable from '@client/components/InvestmentTable';
import { PageContainer } from '@client/components/PageContainer';
import { TextInput } from '@client/components/TextInput';
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

  const stats = useMemo(() => {
    if (!data?.pagination) return undefined;
    return [
      {
        titleI18nKey: 'investments.totalCount' as any,
        value: String(data.pagination.total),
        color: undefined,
      },
    ];
  }, [data?.pagination]);

  return (
    <PageContainer
      filterGroup={
        <>
          <TextInput
            placeholder={t('investments.search', {
              defaultValue: 'Search investments',
            })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
              }
            }}
            style={{ flex: 1, maxWidth: '300px' }}
          />
          <MultiSelect
            value={assetTypes}
            onChange={(value) => setAssetTypes(value as InvestmentAssetType[])}
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
            style={{ maxWidth: '200px' }}
          />
          <MultiSelect
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
            style={{ maxWidth: '200px' }}
          />
          <MultiSelect
            value={currencyIds}
            onChange={setCurrencyIds}
            placeholder={t('investments.currencyFilter', {
              defaultValue: 'Currency',
            })}
            data={currencies.map((currency) => ({
              value: currency.id,
              label: `${currency.code} - ${currency.name}`,
            }))}
            style={{ maxWidth: '200px' }}
          />
        </>
      }
      buttonGroups={
        <Button onClick={handleAdd} disabled={isSubmitting}>
          {t('investments.addInvestment', {
            defaultValue: 'New investment',
          })}
        </Button>
      }
      onReset={
        hasActiveFilters
          ? () => {
              setAssetTypes([]);
              setModes([]);
              setCurrencyIds([]);
              setSearchQuery('');
              setPage(1);
            }
          : undefined
      }
      stats={stats}
    >
      <InvestmentTable
        investments={data?.investments || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onView={handleView}
        recordsPerPage={limit}
        recordsPerPageOptions={[10, 20, 50, 100]}
        onRecordsPerPageChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        totalRecords={data?.pagination?.total}
        sorting={
          sortBy
            ? [
                {
                  id: sortBy,
                  desc: sortOrder === 'desc',
                },
              ]
            : undefined
        }
        onSortingChange={(updater) => {
          const newSorting =
            typeof updater === 'function'
              ? updater(
                  sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [],
                )
              : updater;
          if (newSorting.length > 0) {
            setSortBy(newSorting[0].id as 'name' | 'createdAt' | 'updatedAt');
            setSortOrder(newSorting[0].desc ? 'desc' : 'asc');
          } else {
            setSortBy('createdAt');
            setSortOrder('desc');
          }
          setPage(1);
        }}
      />

      {isDialogOpen && (
        <AddEditInvestmentDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          investment={selectedInvestment}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      )}
    </PageContainer>
  );
};

export default InvestmentPage;
