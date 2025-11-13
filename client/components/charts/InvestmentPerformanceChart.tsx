import { useReportInvestments } from '@client/hooks/queries/useReportInvestments';
import { formatDecimal } from '@client/utils/format';
import { BarChart } from '@mantine/charts';

interface InvestmentPerformanceChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export const InvestmentPerformanceChart = ({
  dateFrom,
  dateTo,
}: InvestmentPerformanceChartProps) => {
  const { data, isLoading, error } = useReportInvestments({
    dateFrom,
    dateTo,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error
              ? 'Failed to load investment data'
              : 'No investment data available'}
          </p>
        </div>
      </div>
    );
  }

  const { performance } = data;

  const chartData = [
    {
      name: 'Realized P&L',
      realizedPnl: performance.realizedPnl,
      unrealizedPnl: null,
      totalPnl: null,
    },
    {
      name: 'Unrealized P&L',
      realizedPnl: null,
      unrealizedPnl: performance.unrealizedPnl,
      totalPnl: null,
    },
    {
      name: 'Total P&L',
      realizedPnl: null,
      unrealizedPnl: null,
      totalPnl: performance.totalPnl,
    },
  ];

  const getBarColor = (value: number) => {
    return value >= 0 ? '#10b981' : '#ef4444';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Performance
      </h3>
      <BarChart
        h={300}
        data={chartData}
        dataKey="name"
        series={[
          {
            name: 'realizedPnl',
            label: 'Realized P&L',
            color: getBarColor(performance.realizedPnl),
          },
          {
            name: 'unrealizedPnl',
            label: 'Unrealized P&L',
            color: getBarColor(performance.unrealizedPnl),
          },
          {
            name: 'totalPnl',
            label: 'Total P&L',
            color: getBarColor(performance.totalPnl),
          },
        ]}
        withLegend
        yAxisProps={{
          tickFormatter: (value) => formatDecimal(value, 0),
        }}
        tooltipProps={{
          formatter: (value) => formatDecimal(value as number),
        }}
      />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Invested
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatDecimal(performance.totalInvested)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Value
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatDecimal(performance.totalValue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">ROI</p>
          <p
            className={`text-lg font-semibold ${
              performance.roi >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatDecimal(performance.roi)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Trades
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {performance.totalTrades}
          </p>
        </div>
      </div>
    </div>
  );
};
