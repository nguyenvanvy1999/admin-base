import AddContributionDialog from '@client/components/AddContributionDialog';
import AddTradeDialog from '@client/components/AddTradeDialog';
import AddValuationDialog from '@client/components/AddValuationDialog';
import { DataTable, type DataTableColumn } from '@client/components/DataTable';
import {
  useCreateInvestmentContributionMutation,
  useCreateInvestmentTradeMutation,
  useUpsertInvestmentValuationMutation,
} from '@client/hooks/mutations/useInvestmentMutations';
import {
  useInvestmentContributionsQuery,
  useInvestmentPositionQuery,
  useInvestmentQuery,
  useInvestmentTradesQuery,
  useInvestmentValuationsQuery,
} from '@client/hooks/queries/useInvestmentQueries';
import type {
  InvestmentContribution,
  InvestmentTrade,
  InvestmentValuation,
} from '@client/types/investment';
import {
  Badge,
  Button,
  Card,
  Group,
  NumberFormatter,
  Tabs,
  Text,
} from '@mantine/core';
import {
  ContributionType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

const InvestmentDetailPage = () => {
  const { investmentId } = useParams();
  const { t } = useTranslation();

  if (!investmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text c="red">
          {t('investments.invalidId', {
            defaultValue: 'Investment identifier is missing.',
          })}
        </Text>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] =
    useState(false);
  const [isValuationDialogOpen, setIsValuationDialogOpen] = useState(false);

  const [tradePage, setTradePage] = useState(1);
  const [tradeLimit, setTradeLimit] = useState(20);
  const [contributionPage, setContributionPage] = useState(1);
  const [contributionLimit, setContributionLimit] = useState(20);
  const [valuationPage, setValuationPage] = useState(1);
  const [valuationLimit, setValuationLimit] = useState(20);

  const { data: investment, isLoading: isInvestmentLoading } =
    useInvestmentQuery(investmentId);
  const { data: position, isLoading: isPositionLoading } =
    useInvestmentPositionQuery(investmentId);

  const { data: tradesData, isLoading: isTradesLoading } =
    useInvestmentTradesQuery(investmentId, {
      page: tradePage,
      limit: tradeLimit,
      sortOrder: 'desc',
    });

  const { data: contributionsData, isLoading: isContributionsLoading } =
    useInvestmentContributionsQuery(investmentId, {
      page: contributionPage,
      limit: contributionLimit,
      sortOrder: 'desc',
    });

  const { data: valuationsData, isLoading: isValuationsLoading } =
    useInvestmentValuationsQuery(investmentId, {
      page: valuationPage,
      limit: valuationLimit,
      sortOrder: 'desc',
    });

  const tradeMutation = useCreateInvestmentTradeMutation();
  const contributionMutation = useCreateInvestmentContributionMutation();
  const valuationMutation = useUpsertInvestmentValuationMutation();

  const currencySymbol = investment?.currency.symbol
    ? `${investment.currency.symbol} `
    : '';

  const baseCurrencySymbol = investment?.baseCurrency?.symbol
    ? `${investment.baseCurrency.symbol} `
    : '';

  const formatCurrency = (
    value: number | null | undefined,
    prefix?: string,
  ) => {
    if (value === null || value === undefined) return '--';
    return (
      <NumberFormatter
        value={value}
        prefix={prefix ?? currencySymbol}
        thousandSeparator=","
        decimalScale={2}
      />
    );
  };

  const formatNumber = (value: number | null | undefined, scale = 4) => {
    if (value === null || value === undefined) return '--';
    return (
      <NumberFormatter
        value={value}
        thousandSeparator=","
        decimalScale={scale}
        allowNegative
      />
    );
  };

  const tradeColumns = useMemo(
    (): DataTableColumn<InvestmentTrade>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.trade.date',
        format: 'date',
      },
      {
        accessor: 'side',
        title: 'investments.trade.side',
        render: (value: unknown, row: InvestmentTrade) => (
          <Badge
            color={row.side === TradeSide.buy ? 'green' : 'red'}
            variant="light"
          >
            {row.side === TradeSide.buy
              ? t('investments.trade.buy', { defaultValue: 'Buy' })
              : t('investments.trade.sell', { defaultValue: 'Sell' })}
          </Badge>
        ),
      },
      {
        accessor: 'account.name',
        title: 'investments.trade.account',
      },
      {
        accessor: 'quantity',
        title: 'investments.trade.quantity',
        render: (value) => formatNumber(parseFloat(String(value))),
      },
      {
        accessor: 'price',
        title: 'investments.trade.price',
        render: (value) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'amount',
        title: 'investments.trade.amount',
        render: (value) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'fee',
        title: 'investments.trade.fee',
        render: (value) => formatCurrency(parseFloat(String(value))),
      },
    ],
    [formatCurrency, formatNumber, t],
  );

  const contributionColumns = useMemo(
    (): DataTableColumn<InvestmentContribution>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.contribution.date',
        format: 'date',
      },
      {
        accessor: 'type',
        title: 'investments.contribution.type',
        render: (value: unknown, row: InvestmentContribution) => (
          <Badge
            color={row.type === ContributionType.deposit ? 'green' : 'red'}
            variant="light"
          >
            {row.type === ContributionType.deposit
              ? t('investments.contribution.deposit', {
                  defaultValue: 'Deposit',
                })
              : t('investments.contribution.withdrawal', {
                  defaultValue: 'Withdrawal',
                })}
          </Badge>
        ),
      },
      {
        accessor: 'amount',
        title: 'investments.contribution.amount',
        render: (value) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: (row: InvestmentContribution) => row.account?.name,
        title: 'investments.contribution.account',
        render: (value: unknown) => (value ? String(value) : '--'),
      },
      {
        accessor: 'note',
        title: 'investments.contribution.note',
        ellipsis: true,
      },
    ],
    [formatCurrency, t],
  );

  const valuationColumns = useMemo(
    (): DataTableColumn<InvestmentValuation>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.valuation.date',
        format: 'date',
      },
      {
        accessor: 'price',
        title: 'investments.valuation.price',
        render: (value) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'source',
        title: 'investments.valuation.source',
        ellipsis: true,
      },
    ],
    [formatCurrency],
  );

  const isLoading =
    isInvestmentLoading ||
    isPositionLoading ||
    isTradesLoading ||
    isContributionsLoading ||
    isValuationsLoading;

  const isMutationPending =
    tradeMutation.isPending ||
    contributionMutation.isPending ||
    valuationMutation.isPending;

  return (
    <div className="min-h-screen bg-[hsl(var(--color-background))] dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {investment?.name ??
                t('investments.detailTitle', {
                  defaultValue: 'Investment detail',
                })}
            </h1>
            <Text size="sm" c="dimmed">
              {investment?.symbol && (
                <span className="mr-2">{investment.symbol}</span>
              )}
              {investment?.assetType.toString().toUpperCase()}
            </Text>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsContributionDialogOpen(true)}
              disabled={isMutationPending}
            >
              {t('investments.addContribution', {
                defaultValue: 'Add contribution',
              })}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsValuationDialogOpen(true)}
              disabled={isMutationPending}
            >
              {t('investments.addValuation', {
                defaultValue: 'Add valuation',
              })}
            </Button>
            <Button
              onClick={() => setIsTradeDialogOpen(true)}
              disabled={
                isMutationPending || investment?.mode !== InvestmentMode.priced
              }
            >
              {t('investments.addTrade', { defaultValue: 'Add trade' })}
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value || 'overview')}
        >
          <Tabs.List>
            <Tabs.Tab value="overview">
              {t('investments.tabs.overview', { defaultValue: 'Overview' })}
            </Tabs.Tab>
            <Tabs.Tab value="trades">
              {t('investments.tabs.trades', { defaultValue: 'Trades' })}
            </Tabs.Tab>
            <Tabs.Tab value="contributions">
              {t('investments.tabs.contributions', {
                defaultValue: 'Contributions',
              })}
            </Tabs.Tab>
            <Tabs.Tab value="valuations">
              {t('investments.tabs.valuations', { defaultValue: 'Valuations' })}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('investments.position.quantity', {
                    defaultValue: 'Quantity',
                  })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatNumber(position?.quantity)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('investments.position.avgCost', {
                    defaultValue: 'Average cost',
                  })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatCurrency(position?.avgCost ?? null)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('investments.position.realizedPnl', {
                    defaultValue: 'Realized PnL',
                  })}
                </Text>
                <Text
                  size="lg"
                  fw={600}
                  className={
                    (position?.realizedPnl ?? 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {formatCurrency(position?.realizedPnl ?? 0)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('investments.position.unrealizedPnl', {
                    defaultValue: 'Unrealized PnL',
                  })}
                </Text>
                <Text
                  size="lg"
                  fw={600}
                  className={
                    (position?.unrealizedPnl ?? 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {formatCurrency(position?.unrealizedPnl ?? 0)}
                </Text>
              </Card>
            </div>

            {investment?.baseCurrencyId && position && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
                <Card shadow="sm" padding="lg" withBorder>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.costBasisInBaseCurrency', {
                      defaultValue: 'Cost Basis (Base Currency)',
                    })}
                  </Text>
                  <Text size="lg" fw={600}>
                    {position.costBasisInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.costBasisInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'}
                  </Text>
                </Card>
                <Card shadow="sm" padding="lg" withBorder>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.realizedPnlInBaseCurrency', {
                      defaultValue: 'Realized PnL (Base Currency)',
                    })}
                  </Text>
                  <Text
                    size="lg"
                    fw={600}
                    className={
                      (position.realizedPnlInBaseCurrency ?? 0) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {position.realizedPnlInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.realizedPnlInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'}
                  </Text>
                </Card>
                <Card shadow="sm" padding="lg" withBorder>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.unrealizedPnlInBaseCurrency', {
                      defaultValue: 'Unrealized PnL (Base Currency)',
                    })}
                  </Text>
                  <Text
                    size="lg"
                    fw={600}
                    className={
                      (position.unrealizedPnlInBaseCurrency ?? 0) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {position.unrealizedPnlInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.unrealizedPnlInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'}
                  </Text>
                </Card>
                <Card shadow="sm" padding="lg" withBorder>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.exchangeRateGainLoss', {
                      defaultValue: 'Exchange Rate Impact',
                    })}
                  </Text>
                  <Text
                    size="lg"
                    fw={600}
                    className={
                      (position.exchangeRateGainLoss ?? 0) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {position.exchangeRateGainLoss !== undefined
                      ? formatCurrency(
                          position.exchangeRateGainLoss,
                          baseCurrencySymbol,
                        )
                      : '--'}
                  </Text>
                </Card>
              </div>
            )}

            {investment?.baseCurrencyId &&
              position?.lastValueInBaseCurrency !== undefined && (
                <Card shadow="sm" padding="lg" withBorder mt="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" c="dimmed">
                        {t('investments.position.lastValueInBaseCurrency', {
                          defaultValue: 'Market value (Base Currency)',
                        })}
                      </Text>
                      <Text size="xl" fw={600}>
                        {formatCurrency(
                          position.lastValueInBaseCurrency,
                          baseCurrencySymbol,
                        )}
                      </Text>
                    </div>
                    {position.currentExchangeRate !== undefined && (
                      <div>
                        <Text size="sm" c="dimmed">
                          {t('investments.position.currentExchangeRate', {
                            defaultValue: 'Current Exchange Rate',
                          })}
                        </Text>
                        <Text size="lg" fw={600}>
                          {position.currentExchangeRate?.toFixed(6) ?? '--'}
                        </Text>
                      </div>
                    )}
                  </Group>
                </Card>
              )}

            <Card shadow="sm" padding="lg" withBorder mt="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.lastValue', {
                      defaultValue: 'Market value',
                    })}
                  </Text>
                  <Text size="xl" fw={600}>
                    {formatCurrency(position?.lastValue ?? null)}
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.netContribution', {
                      defaultValue: 'Net contributions',
                    })}
                  </Text>
                  <Text size="lg" fw={600}>
                    {formatCurrency(position?.netContributions ?? 0)}
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    {t('investments.position.lastUpdated', {
                      defaultValue: 'Last valuation',
                    })}
                  </Text>
                  <Text size="lg" fw={600}>
                    {position?.lastValuationAt
                      ? new Date(position.lastValuationAt).toLocaleString()
                      : t('investments.position.noValuation', {
                          defaultValue: 'No valuation yet',
                        })}
                  </Text>
                </div>
              </Group>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="trades" pt="md">
            <DataTable
              data={(tradesData?.trades || []) as unknown as InvestmentTrade[]}
              columns={tradeColumns}
              loading={isTradesLoading}
              page={tradePage}
              onPageChange={setTradePage}
              totalRecords={tradesData?.pagination?.total}
              recordsPerPage={tradeLimit}
              onRecordsPerPageChange={(size: number) => {
                setTradeLimit(size);
                setTradePage(1);
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="contributions" pt="md">
            <DataTable
              data={
                (contributionsData?.contributions ||
                  []) as unknown as InvestmentContribution[]
              }
              columns={contributionColumns}
              loading={isContributionsLoading}
              page={contributionPage}
              onPageChange={setContributionPage}
              totalRecords={contributionsData?.pagination?.total}
              recordsPerPage={contributionLimit}
              onRecordsPerPageChange={(size: number) => {
                setContributionLimit(size);
                setContributionPage(1);
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="valuations" pt="md">
            <DataTable
              data={
                (valuationsData?.valuations ||
                  []) as unknown as InvestmentValuation[]
              }
              columns={valuationColumns}
              loading={isValuationsLoading}
              page={valuationPage}
              onPageChange={setValuationPage}
              totalRecords={valuationsData?.pagination?.total}
              recordsPerPage={valuationLimit}
              onRecordsPerPageChange={(size: number) => {
                setValuationLimit(size);
                setValuationPage(1);
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </div>

      {investment && isTradeDialogOpen && (
        <AddTradeDialog
          isOpen={isTradeDialogOpen}
          onClose={() => setIsTradeDialogOpen(false)}
          investment={investment}
          onSubmit={async (data) => {
            await tradeMutation.mutateAsync({ investmentId, data });
            setIsTradeDialogOpen(false);
          }}
          isLoading={tradeMutation.isPending || isLoading}
        />
      )}

      {investment && isContributionDialogOpen && (
        <AddContributionDialog
          isOpen={isContributionDialogOpen}
          onClose={() => setIsContributionDialogOpen(false)}
          investment={investment}
          onSubmit={async (data) => {
            await contributionMutation.mutateAsync({ investmentId, data });
            setIsContributionDialogOpen(false);
          }}
          isLoading={contributionMutation.isPending || isLoading}
        />
      )}

      {investment && isValuationDialogOpen && (
        <AddValuationDialog
          isOpen={isValuationDialogOpen}
          onClose={() => setIsValuationDialogOpen(false)}
          investment={investment}
          onSubmit={async (data) => {
            await valuationMutation.mutateAsync({ investmentId, data });
            setIsValuationDialogOpen(false);
          }}
          isLoading={valuationMutation.isPending || isLoading}
        />
      )}
    </div>
  );
};

export default InvestmentDetailPage;
