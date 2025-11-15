import BudgetPeriodList from '@client/components/BudgetPeriodList';
import {
  useBudgetPeriodsQuery,
  useBudgetQuery,
} from '@client/hooks/queries/useBudgetQueries';
import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { BudgetPeriod } from '@server/generated';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

const BudgetDetailPage = () => {
  const { budgetId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!budgetId) {
    return (
      <Center h="100vh">
        <Text c="red">
          {t('budgets.invalidId', {
            defaultValue: 'Budget identifier is missing.',
          })}
        </Text>
      </Center>
    );
  }

  const { data: budget, isLoading: isBudgetLoading } = useBudgetQuery(budgetId);
  const { data: periodsData, isLoading: periodsLoading } =
    useBudgetPeriodsQuery(budgetId);

  const getPeriodLabel = (period: BudgetPeriod) => {
    switch (period) {
      case BudgetPeriod.daily:
        return t('budgets.periodOptions.daily', { defaultValue: 'Daily' });
      case BudgetPeriod.monthly:
        return t('budgets.periodOptions.monthly', { defaultValue: 'Monthly' });
      case BudgetPeriod.quarterly:
        return t('budgets.periodOptions.quarterly', {
          defaultValue: 'Quarterly',
        });
      case BudgetPeriod.yearly:
        return t('budgets.periodOptions.yearly', { defaultValue: 'Yearly' });
      case BudgetPeriod.none:
        return t('budgets.periodOptions.none', { defaultValue: 'None' });
      default:
        return period;
    }
  };

  const formatCurrency = (value: string) => {
    const amount = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isLoading = isBudgetLoading || periodsLoading;

  return (
    <Container fluid py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate('/budgets')}
            >
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
            <Stack gap="xs">
              <Title order={2}>
                {budget?.name ??
                  t('budgets.detailTitle', {
                    defaultValue: 'Budget detail',
                  })}
              </Title>
              {budget && (
                <Badge variant="light" color="blue">
                  {getPeriodLabel(budget.period)}
                </Badge>
              )}
            </Stack>
          </Group>
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Text c="dimmed">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </Text>
          </Center>
        ) : budget ? (
          <>
            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('budgets.amount', { defaultValue: 'Amount' })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatCurrency(budget.amount)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('budgets.startDate', { defaultValue: 'Start Date' })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatDate(budget.startDate)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('budgets.endDate', { defaultValue: 'End Date' })}
                </Text>
                <Text size="lg" fw={600}>
                  {formatDate(budget.endDate)}
                </Text>
              </Card>
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="sm" c="dimmed">
                  {t('budgets.carryOver', { defaultValue: 'Carry Over' })}
                </Text>
                <Text size="lg" fw={600}>
                  {budget.carryOver
                    ? t('common.yes', { defaultValue: 'Yes' })
                    : t('common.no', { defaultValue: 'No' })}
                </Text>
              </Card>
            </SimpleGrid>

            <Card shadow="sm" padding="lg" withBorder>
              <Title order={4} mb="md">
                {t('budgets.periods', { defaultValue: 'Budget Periods' })}
              </Title>
              <BudgetPeriodList
                periods={periodsData?.periods || []}
                isLoading={periodsLoading}
                budgetId={budgetId}
              />
            </Card>
          </>
        ) : (
          <Center py="xl">
            <Text c="red">
              {t('budgets.notFound', {
                defaultValue: 'Budget not found',
              })}
            </Text>
          </Center>
        )}
      </Stack>
    </Container>
  );
};

export default BudgetDetailPage;
