import { useInvestmentFeesDetailed } from '@client/hooks/queries/useInvestmentFeesDetailed';
import { formatDecimal } from '@client/utils/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface InvestmentFeesChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
  };
}

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

  const pieData = data.feeByInvestment.slice(0, 8).map((inv) => ({
    name: inv.investmentSymbol,
    value: inv.fee,
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-300 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="date"
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => formatDecimal(value, 0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatDecimal(value)}
                labelStyle={{ color: 'var(--color-text)' }}
              />
              <Bar dataKey="totalFee" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fees by Investment
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatDecimal(value)}
                contentStyle={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
