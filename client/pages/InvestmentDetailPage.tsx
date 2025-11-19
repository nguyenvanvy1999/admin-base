import AddContributionDialog from '@client/components/dialogs/AddContributionDialog';
import AddTradeDialog from '@client/components/dialogs/AddTradeDialog';
import AddValuationDialog from '@client/components/dialogs/AddValuationDialog';
import { StatCard } from '@client/components/StatCard';
import { DataTable, type DataTableColumn } from '@client/components/tables';
import {
  useCreateInvestmentContributionMutation,
  useCreateInvestmentTradeMutation,
  useDeleteManyInvestmentContributionsMutation,
  useDeleteManyInvestmentTradesMutation,
  useDeleteManyInvestmentValuationsMutation,
  useUpsertInvestmentValuationMutation,
} from '@client/hooks/mutations/useInvestmentMutations';
import {
  useInvestmentContributionsQuery,
  useInvestmentPositionQuery,
  useInvestmentQuery,
  useInvestmentTradesQuery,
  useInvestmentValuationsQuery,
} from '@client/hooks/queries/useInvestmentQueries';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Modal,
  NumberFormatter,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import type { InvestmentContributionResponse } from '@server/dto/contribution.dto';
import type { InvestmentTradeResponse } from '@server/dto/trade.dto';
import type { InvestmentValuationResponse } from '@server/dto/valuation.dto';
import { ContributionType, InvestmentMode, TradeSide } from '@server/generated';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

const InvestmentDetailPage = () => {
  const { investmentId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!investmentId) {
    return (
      <Center h="100vh">
        <Text c="red">
          {t('investments.invalidId', {
            defaultValue: 'Investment identifier is missing.',
          })}
        </Text>
      </Center>
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
  const deleteManyTradesMutation = useDeleteManyInvestmentTradesMutation();
  const deleteManyContributionsMutation =
    useDeleteManyInvestmentContributionsMutation();
  const deleteManyValuationsMutation =
    useDeleteManyInvestmentValuationsMutation();

  const [tradeToDelete, setTradeToDelete] =
    useState<InvestmentTradeResponse | null>(null);
  const [contributionToDelete, setContributionToDelete] =
    useState<InvestmentContributionResponse | null>(null);
  const [valuationToDelete, setValuationToDelete] =
    useState<InvestmentValuationResponse | null>(null);

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

  const handleDeleteTrade = (trade: InvestmentTradeResponse) => {
    setTradeToDelete(trade);
  };

  const handleDeleteContribution = (
    contribution: InvestmentContributionResponse,
  ) => {
    setContributionToDelete(contribution);
  };

  const handleDeleteValuation = (valuation: InvestmentValuationResponse) => {
    setValuationToDelete(valuation);
  };

  const handleConfirmDeleteTrade = async () => {
    if (tradeToDelete && investmentId) {
      try {
        await deleteManyTradesMutation.mutateAsync({
          investmentId,
          tradeIds: [tradeToDelete.id],
        });
        setTradeToDelete(null);
      } catch {
        /* handled by mutation */
      }
    }
  };

  const handleConfirmDeleteContribution = async () => {
    if (contributionToDelete && investmentId) {
      try {
        await deleteManyContributionsMutation.mutateAsync({
          investmentId,
          contributionIds: [contributionToDelete.id],
        });
        setContributionToDelete(null);
      } catch {
        /* handled by mutation */
      }
    }
  };

  const handleConfirmDeleteValuation = async () => {
    if (valuationToDelete && investmentId) {
      try {
        await deleteManyValuationsMutation.mutateAsync({
          investmentId,
          valuationIds: [valuationToDelete.id],
        });
        setValuationToDelete(null);
      } catch {
        /* handled by mutation */
      }
    }
  };

  const tradeColumns = useMemo(
    (): DataTableColumn<InvestmentTradeResponse>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.trade.date',
        format: 'date',
      },
      {
        accessor: 'side',
        title: 'investments.trade.side',
        render: ({ row }) => (
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
        render: ({ value }) => formatNumber(parseFloat(String(value))),
      },
      {
        accessor: 'price',
        title: 'investments.trade.price',
        render: ({ value }) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'amount',
        title: 'investments.trade.amount',
        render: ({ value }) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'fee',
        title: 'investments.trade.fee',
        render: ({ value }) => formatCurrency(parseFloat(String(value))),
      },
      {
        title: 'common.actions',
        textAlign: 'center',
        width: '8rem',
        render: ({ row }: { row: InvestmentTradeResponse }) => (
          <Group justify="center" gap="xs">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTrade(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ),
      },
    ],
    [formatCurrency, formatNumber, t, handleDeleteTrade],
  );

  const contributionColumns = useMemo(
    (): DataTableColumn<InvestmentContributionResponse>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.contribution.date',
        format: 'date',
      },
      {
        accessor: 'type',
        title: 'investments.contribution.type',
        render: ({ row }: { row: InvestmentContributionResponse }) => (
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
        render: ({ value }) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: (row: InvestmentContributionResponse) => row.account?.name,
        title: 'investments.contribution.account',
        render: ({ value }: { value: string | undefined }) =>
          value ? String(value) : '--',
      },
      {
        accessor: 'note',
        title: 'investments.contribution.note',
        ellipsis: true,
      },
      {
        title: 'common.actions',
        textAlign: 'center',
        width: '8rem',
        render: ({ row }: { row: InvestmentContributionResponse }) => (
          <Group justify="center" gap="xs">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteContribution(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ),
      },
    ],
    [formatCurrency, t, handleDeleteContribution],
  );

  const valuationColumns = useMemo(
    (): DataTableColumn<InvestmentValuationResponse>[] => [
      {
        accessor: 'timestamp',
        title: 'investments.valuation.date',
        format: 'date',
      },
      {
        accessor: 'price',
        title: 'investments.valuation.price',
        render: ({ value }) => formatCurrency(parseFloat(String(value))),
      },
      {
        accessor: 'source',
        title: 'investments.valuation.source',
        ellipsis: true,
      },
      {
        title: 'common.actions',
        textAlign: 'center',
        width: '8rem',
        render: ({ row }: { row: InvestmentValuationResponse }) => (
          <Group justify="center" gap="xs">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteValuation(row);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ),
      },
    ],
    [formatCurrency, handleDeleteValuation],
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
    valuationMutation.isPending ||
    deleteManyTradesMutation.isPending ||
    deleteManyContributionsMutation.isPending ||
    deleteManyValuationsMutation.isPending;

  return (
    <Container fluid py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate('/investments')}
            >
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Stack gap="xs">
              <Title order={2}>
                {investment?.name ??
                  t('investments.detailTitle', {
                    defaultValue: 'Investment detail',
                  })}
              </Title>
              <Text size="sm" c="dimmed">
                {investment?.symbol && (
                  <Text component="span" mr="xs">
                    {investment.symbol}
                  </Text>
                )}
                {investment?.assetType.toString().toUpperCase()}
              </Text>
            </Stack>
          </Group>
          <Group gap="xs">
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
          </Group>
        </Group>

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
            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <StatCard
                label={t('investments.position.quantity', {
                  defaultValue: 'Quantity',
                })}
                value={formatNumber(position?.quantity)}
              />
              <StatCard
                label={t('investments.position.avgCost', {
                  defaultValue: 'Average cost',
                })}
                value={formatCurrency(position?.avgCost ?? null)}
              />
              <StatCard
                label={t('investments.position.realizedPnl', {
                  defaultValue: 'Realized PnL',
                })}
                value={formatCurrency(position?.realizedPnl ?? 0)}
                color={(position?.realizedPnl ?? 0) >= 0 ? 'green.6' : 'red.6'}
              />
              <StatCard
                label={t('investments.position.unrealizedPnl', {
                  defaultValue: 'Unrealized PnL',
                })}
                value={formatCurrency(position?.unrealizedPnl ?? 0)}
                color={
                  (position?.unrealizedPnl ?? 0) >= 0 ? 'green.6' : 'red.6'
                }
              />
            </SimpleGrid>

            {investment?.baseCurrencyId && position && (
              <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md" mt="md">
                <StatCard
                  label={t('investments.position.costBasisInBaseCurrency', {
                    defaultValue: 'Cost Basis (Base Currency)',
                  })}
                  value={
                    position.costBasisInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.costBasisInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'
                  }
                />
                <StatCard
                  label={t('investments.position.realizedPnlInBaseCurrency', {
                    defaultValue: 'Realized PnL (Base Currency)',
                  })}
                  value={
                    position.realizedPnlInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.realizedPnlInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'
                  }
                  color={
                    (position.realizedPnlInBaseCurrency ?? 0) >= 0
                      ? 'green.6'
                      : 'red.6'
                  }
                />
                <StatCard
                  label={t('investments.position.unrealizedPnlInBaseCurrency', {
                    defaultValue: 'Unrealized PnL (Base Currency)',
                  })}
                  value={
                    position.unrealizedPnlInBaseCurrency !== undefined
                      ? formatCurrency(
                          position.unrealizedPnlInBaseCurrency,
                          baseCurrencySymbol,
                        )
                      : '--'
                  }
                  color={
                    (position.unrealizedPnlInBaseCurrency ?? 0) >= 0
                      ? 'green.6'
                      : 'red.6'
                  }
                />
                <StatCard
                  label={t('investments.position.exchangeRateGainLoss', {
                    defaultValue: 'Exchange Rate Impact',
                  })}
                  value={
                    position.exchangeRateGainLoss !== undefined
                      ? formatCurrency(
                          position.exchangeRateGainLoss,
                          baseCurrencySymbol,
                        )
                      : '--'
                  }
                  color={
                    (position.exchangeRateGainLoss ?? 0) >= 0
                      ? 'green.6'
                      : 'red.6'
                  }
                />
              </SimpleGrid>
            )}

            {investment?.baseCurrencyId &&
              position?.lastValueInBaseCurrency !== undefined && (
                <Card shadow="sm" padding="lg" withBorder mt="md">
                  <Group justify="space-between">
                    <Stack gap="xs">
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
                    </Stack>
                    {position.currentExchangeRate !== undefined && (
                      <Stack gap="xs">
                        <Text size="sm" c="dimmed">
                          {t('investments.position.currentExchangeRate', {
                            defaultValue: 'Current Exchange Rate',
                          })}
                        </Text>
                        <Text size="lg" fw={600}>
                          {position.currentExchangeRate?.toFixed(6) ?? '--'}
                        </Text>
                      </Stack>
                    )}
                  </Group>
                </Card>
              )}

            <Card shadow="sm" padding="lg" withBorder mt="md">
              <Group justify="space-between">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    {t('investments.position.lastValue', {
                      defaultValue: 'Market value',
                    })}
                  </Text>
                  <Text size="xl" fw={600}>
                    {formatCurrency(position?.lastValue ?? null)}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    {t('investments.position.netContribution', {
                      defaultValue: 'Net contributions',
                    })}
                  </Text>
                  <Text size="lg" fw={600}>
                    {formatCurrency(position?.netContributions ?? 0)}
                  </Text>
                </Stack>
                <Stack gap="xs">
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
                </Stack>
              </Group>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="trades" pt="md">
            <DataTable
              data={tradesData?.trades || []}
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
              data={contributionsData?.contributions || []}
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
              data={valuationsData?.valuations || []}
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
      </Stack>

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

      {tradeToDelete && (
        <Modal
          opened={!!tradeToDelete}
          onClose={() => setTradeToDelete(null)}
          title={t('investments.trade.deleteConfirmTitle', {
            defaultValue: 'Delete Trade',
          })}
          size="md"
        >
          <Text mb="md">
            {t('investments.trade.deleteConfirmMessage', {
              defaultValue: 'Are you sure you want to delete this trade?',
            })}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setTradeToDelete(null)}
              disabled={isMutationPending}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDeleteTrade}
              disabled={isMutationPending}
            >
              {isMutationPending
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </Group>
        </Modal>
      )}

      {contributionToDelete && (
        <Modal
          opened={!!contributionToDelete}
          onClose={() => setContributionToDelete(null)}
          title={t('investments.contribution.deleteConfirmTitle', {
            defaultValue: 'Delete Contribution',
          })}
          size="md"
        >
          <Text mb="md">
            {t('investments.contribution.deleteConfirmMessage', {
              defaultValue:
                'Are you sure you want to delete this contribution?',
            })}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setContributionToDelete(null)}
              disabled={isMutationPending}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDeleteContribution}
              disabled={isMutationPending}
            >
              {isMutationPending
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </Group>
        </Modal>
      )}

      {valuationToDelete && (
        <Modal
          opened={!!valuationToDelete}
          onClose={() => setValuationToDelete(null)}
          title={t('investments.valuation.deleteConfirmTitle', {
            defaultValue: 'Delete Valuation',
          })}
          size="md"
        >
          <Text mb="md">
            {t('investments.valuation.deleteConfirmMessage', {
              defaultValue: 'Are you sure you want to delete this valuation?',
            })}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => setValuationToDelete(null)}
              disabled={isMutationPending}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDeleteValuation}
              disabled={isMutationPending}
            >
              {isMutationPending
                ? t('common.deleting', { defaultValue: 'Deleting...' })
                : t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </Group>
        </Modal>
      )}
    </Container>
  );
};

export default InvestmentDetailPage;
