import { useReportInvestments } from '@client/hooks/queries/useReportInvestments';
import { formatDecimal } from '@client/utils/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
      value: performance.realizedPnl,
    },
    {
      name: 'Unrealized P&L',
      value: performance.unrealizedPnl,
    },
    {
      name: 'Total P&L',
      value: performance.totalPnl,
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
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-gray-300 dark:stroke-gray-700"
          />
          <XAxis
            dataKey="name"
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
          <Legend />
          <Bar dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
