import { useInvestmentFeesDetailed } from '@client/hooks/queries/useInvestmentFeesDetailed';
import { formatDecimal } from '@client/utils/format';
import { BarChart, PieChart } from '@mantine/charts';

interface InvestmentFeesChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
  };
}

export const InvestmentFeesChart = ({
  queryParams,
}: InvestmentFeesChartProps) => {
  const { data, isLoading, error } = useInvestmentFeesDetailed(queryParams);

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
            {error ? 'Failed to load fee data' : 'No fee data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.timeStats.map((item) => ({
    date: item.date,
    totalFee: item.totalFee,
  }));

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];

  const pieData = data.feeByInvestment.slice(0, 8).map((inv, index) => ({
    name: inv.investmentSymbol,
    value: inv.fee,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Fees
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Fee</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.totalFee)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Avg Fee per Trade
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.averageFeePerTrade)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fee % of Returns
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDecimal(data.summary.feePercentageOfReturns)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fees Over Time
          </h4>
          <BarChart
            h={300}
            data={chartData}
            dataKey="date"
            series={[
              {
                name: 'totalFee',
                label: 'Total Fee',
                color: '#f59e0b',
              },
            ]}
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
            Fees by Investment
          </h4>
          <PieChart
            h={300}
            data={pieData}
            tooltipProps={{
              formatter: (value) => formatDecimal(value as number),
            }}
            withLabelsLine
            labelsType="percent"
          />
        </div>
      </div>
    </div>
  );
};
