import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  IconArrowDown,
  IconArrowUp,
  IconCurrencyDollar,
  IconReceipt,
} from '@tabler/icons-react';

interface IncomeExpenseOverviewProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const IncomeExpenseOverview = ({
  queryParams,
}: IncomeExpenseOverviewProps) => {
  const { data, isLoading, error } = useIncomeExpenseDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
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
      title: 'Total Income',
      value: summary.totalIncome,
      icon: IconArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: 'Total Expense',
      value: summary.totalExpense,
      icon: IconArrowDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'Net',
      value: summary.totalNet,
      icon: IconCurrencyDollar,
      color:
        summary.totalNet >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        summary.totalNet >= 0
          ? 'bg-green-100 dark:bg-green-900'
          : 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'Total Fee',
      value: summary.totalFee,
      icon: IconReceipt,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
    {
      title: 'Avg Daily Income',
      value: summary.averageDailyIncome,
      icon: IconArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: 'Avg Daily Expense',
      value: summary.averageDailyExpense,
      icon: IconArrowDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              {formatDecimal(card.value)}
            </p>
          </div>
        );
      })}
    </div>
  );
};
