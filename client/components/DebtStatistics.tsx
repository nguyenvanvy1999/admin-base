import { useDebtStatistics } from '@client/hooks/queries/useDebtQueries';
import { formatCurrency } from '@client/lib/format';
import { Card, Group, SimpleGrid, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowDown,
  IconArrowUp,
  IconCash,
  IconCoin,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DebtStatisticsProps {
  onDateRangeChange?: (dateRange: {
    from: Date | null;
    to: Date | null;
  }) => void;
}

export const DebtStatistics = ({ onDateRangeChange }: DebtStatisticsProps) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  }>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().toDate(),
  });

  const { data } = useDebtStatistics(dateRange);

  const handleDateRangeChange = (value: [Date | null, Date | null]) => {
    const [from, to] = value;
    const newRange = { from, to };
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  const stats = [
    {
      title: t('debts.totalLoanGiven'),
      value: formatCurrency(data?.totalLoanGiven || 0, data?.currency || 'VND'),
      icon: <IconArrowUp size="1.5rem" color="red" />,
      color: 'red',
    },
    {
      title: t('debts.totalLoanReceived'),
      value: formatCurrency(
        data?.totalLoanReceived || 0,
        data?.currency || 'VND',
      ),
      icon: <IconArrowDown size="1.5rem" color="blue" />,
      color: 'blue',
    },
    {
      title: t('debts.totalReceived'),
      value: formatCurrency(data?.totalReceived || 0, data?.currency || 'VND'),
      icon: <IconCash size="1.5rem" color="green" />,
      color: 'green',
    },
    {
      title: t('debts.totalPaid'),
      value: formatCurrency(data?.totalPaid || 0, data?.currency || 'VND'),
      icon: <IconCoin size="1.5rem" color="orange" />,
      color: 'orange',
    },
  ];

  return (
    <Card withBorder p="md" radius="md">
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>
          {t('debts.statistics')}
        </Text>
        <DatePickerInput
          type="range"
          placeholder={t('common.dateRange')}
          value={
            dateRange.from && dateRange.to
              ? [dateRange.from, dateRange.to]
              : undefined
          }
          onChange={(value) => {
            if (value && value[0] && value[1]) {
              const fromValue: unknown = value[0];
              const toValue: unknown = value[1];
              const from =
                fromValue &&
                typeof fromValue === 'object' &&
                'getTime' in fromValue
                  ? (fromValue as Date)
                  : new Date(String(fromValue));
              const to =
                toValue && typeof toValue === 'object' && 'getTime' in toValue
                  ? (toValue as Date)
                  : new Date(String(toValue));
              handleDateRangeChange([from, to]);
            } else {
              handleDateRangeChange([null, null]);
            }
          }}
          clearable={false}
          maxDate={new Date()}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        {stats.map((stat) => (
          <Card key={stat.title} withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" className="uppercase font-bold">
                {stat.title}
              </Text>
              {stat.icon}
            </Group>
            <Group align="flex-end" gap="xs" mt={10}>
              <Text size="lg" fw={700} c={stat.color}>
                {stat.value}
              </Text>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  );
};
