import { useInvestmentPerformanceDetailed } from '@client/hooks/queries/useInvestmentPerformanceDetailed';
import { formatDecimal } from '@client/utils/format';
import { AreaChart, LineChart } from '@mantine/charts';

interface InvestmentPerformanceChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
    accountId?: string;
    assetType?: string;
  };
}

export const InvestmentPerformanceChart = ({
  queryParams,
}: InvestmentPerformanceChartProps) => {
  const { data, isLoading, error } =
    useInvestmentPerformanceDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data || data.timeSeries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load chart data' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.timeSeries.map((item) => ({
    date: item.date,
    totalInvested: item.totalInvested,
    totalValue: item.totalValue,
    realizedPnl: item.realizedPnl,
    unrealizedPnl: item.unrealizedPnl,
    totalPnl: item.totalPnl,
    roi: item.roi,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Performance
      </h3>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Portfolio Value Over Time
          </h4>
          <LineChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              {
                name: 'totalInvested',
                label: 'Total Invested',
                color: '#3b82f6',
              },
              {
                name: 'totalValue',
                label: 'Current Value',
                color: '#10b981',
              },
            ]}
            curveType="natural"
            withLegend
            withDots={false}
            yAxisProps={{
              tickFormatter: (value) => formatDecimal(value, 0),
            }}
            tooltipProps={{
              formatter: (value) => formatDecimal(value as number),
            }}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            P&L Over Time
          </h4>
          <AreaChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              {
                name: 'realizedPnl',
                label: 'Realized P&L',
                color: '#10b981',
              },
              {
                name: 'unrealizedPnl',
                label: 'Unrealized P&L',
                color: '#3b82f6',
              },
            ]}
            curveType="natural"
            withLegend
            withGradient
            withDots={false}
            yAxisProps={{
              tickFormatter: (value) => formatDecimal(value, 0),
            }}
            tooltipProps={{
              formatter: (value) => formatDecimal(value as number),
            }}
          />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ROI Over Time
          </h4>
          <LineChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              {
                name: 'roi',
                label: 'ROI (%)',
                color: '#8b5cf6',
              },
            ]}
            curveType="natural"
            withLegend
            withDots={false}
            yAxisProps={{
              tickFormatter: (value) => `${value}%`,
            }}
            tooltipProps={{
              formatter: (value) => `${formatDecimal(value as number)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
