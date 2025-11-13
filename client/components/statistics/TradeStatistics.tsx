import { useInvestmentTradesDetailed } from '@client/hooks/queries/useInvestmentTradesDetailed';
import { formatDecimal } from '@client/utils/format';
import { BarChart } from '@mantine/charts';

interface TradeStatisticsProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
    accountId?: string;
  };
}

export const TradeStatistics = ({ queryParams }: TradeStatisticsProps) => {
  const { data, isLoading, error } = useInvestmentTradesDetailed(queryParams);

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
            {error ? 'Failed to load trade data' : 'No trade data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.stats.map((item) => ({
    date: item.date,
    buyCount: item.buyCount,
    sellCount: item.sellCount,
    buyVolume: item.buyVolume,
    sellVolume: item.sellVolume,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Trade Statistics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Buy Trades
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.summary.totalBuyTrades}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Sell Trades
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.summary.totalSellTrades}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Avg Trade Size
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.averageTradeSize)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Trades
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.summary.totalTrades}
          </p>
        </div>
      </div>
      <BarChart
        h={300}
        data={chartData}
        dataKey="date"
        series={[
          {
            name: 'buyVolume',
            label: 'Buy Volume',
            color: '#10b981',
          },
          {
            name: 'sellVolume',
            label: 'Sell Volume',
            color: '#ef4444',
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
    </div>
  );
};
