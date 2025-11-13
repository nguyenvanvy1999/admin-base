import { useDebtStatistics } from '@client/hooks/queries/useDebtStatistics';
import { formatDecimal } from '@client/utils/format';
import {
  IconArrowDown,
  IconArrowUp,
  IconCurrencyDollar,
  IconUsers,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface DebtOverviewProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    entityId?: string;
  };
}

export const DebtOverview = ({ queryParams }: DebtOverviewProps) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDebtStatistics(queryParams);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">
          Failed to load overview data
        </p>
      </div>
    );
  }

  const { summary } = data;

  const cards = [
    {
      title: t('statistics.debt.totalLoanGiven'),
      value: summary.totalLoanGiven,
      icon: IconArrowDown,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: t('statistics.debt.totalLoanReceived'),
      value: summary.totalLoanReceived,
      icon: IconArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: t('statistics.debt.netDebt'),
      value: summary.netDebt,
      icon: IconCurrencyDollar,
      color:
        summary.netDebt >= 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-green-600 dark:text-green-400',
      bgColor:
        summary.netDebt >= 0
          ? 'bg-red-100 dark:bg-red-900'
          : 'bg-green-100 dark:bg-green-900',
    },
    {
      title: t('statistics.debt.entityCount', {
        defaultValue: 'Total Entities',
      }),
      value: summary.entityCount,
      icon: IconUsers,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </h3>
              <div className={`${card.bgColor} ${card.color} p-2 rounded-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {typeof card.value === 'number'
                ? formatDecimal(card.value)
                : card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};
