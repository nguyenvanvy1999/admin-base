import { useInvestmentPerformanceDetailed } from '@client/hooks/queries/useInvestmentPerformanceDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  IconChartLine,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
} from '@tabler/icons-react';

interface InvestmentOverviewProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
    accountId?: string;
    assetType?: string;
  };
}

export const InvestmentOverview = ({
  queryParams,
}: InvestmentOverviewProps) => {
  const { data, isLoading, error } =
    useInvestmentPerformanceDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      title: 'Total Invested',
      value: summary.totalInvested,
      icon: IconCurrencyDollar,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Current Value',
      value: summary.currentValue,
      icon: IconChartLine,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Total P&L',
      value: summary.totalPnl,
      icon: IconTrendingUp,
      color:
        summary.totalPnl >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        summary.totalPnl >= 0
          ? 'bg-green-100 dark:bg-green-900'
          : 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'Realized P&L',
      value: summary.realizedPnl,
      icon: IconTrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    },
    {
      title: 'Unrealized P&L',
      value: summary.unrealizedPnl,
      icon: IconTrendingUp,
      color:
        summary.unrealizedPnl >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        summary.unrealizedPnl >= 0
          ? 'bg-green-100 dark:bg-green-900'
          : 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'ROI',
      value: summary.roi,
      icon: IconReceipt,
      color:
        summary.roi >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        summary.roi >= 0
          ? 'bg-green-100 dark:bg-green-900'
          : 'bg-red-100 dark:bg-red-900',
      suffix: '%',
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
              {card.suffix}
            </p>
          </div>
        );
      })}
    </div>
  );
};
