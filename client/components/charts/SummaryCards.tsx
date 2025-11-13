import { useReportSummary } from '@client/hooks/queries/useReportSummary';
import { formatDecimal } from '@client/utils/format';
import {
  IconArrowDown,
  IconArrowUp,
  IconTrendingUp,
  IconWallet,
} from '@tabler/icons-react';

interface SummaryCardsProps {
  dateFrom?: string;
  dateTo?: string;
}

export const SummaryCards = ({ dateFrom, dateTo }: SummaryCardsProps) => {
  const { data, isLoading, error } = useReportSummary({ dateFrom, dateTo });

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
          Failed to load summary data
        </p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Balance',
      value: data.totalBalance,
      icon: IconWallet,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Total Investments',
      value: data.totalInvestments,
      icon: IconTrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Total Income',
      value: data.totalIncome,
      icon: IconArrowUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: 'Total Expense',
      value: data.totalExpense,
      icon: IconArrowDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
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
              {formatDecimal(card.value)}
            </p>
          </div>
        );
      })}
    </div>
  );
};
