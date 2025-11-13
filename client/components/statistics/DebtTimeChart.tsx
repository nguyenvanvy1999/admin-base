import { useDebtStatistics } from '@client/hooks/queries/useDebtStatistics';
import { formatDecimal } from '@client/utils/format';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DebtTimeChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    entityId?: string;
  };
}

export const DebtTimeChart = ({ queryParams }: DebtTimeChartProps) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDebtStatistics(queryParams);

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
    loanGiven: item.totalLoanGiven,
    loanReceived: item.totalLoanReceived,
    netDebt: item.netDebt,
    cumulativeNetDebt: item.cumulativeNetDebt,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('statistics.debt.timeSeries')}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="colorLoanGiven" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLoanReceived" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNetDebt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Legend />
          <Line
            type="monotone"
            dataKey="loanGiven"
            stroke="#3b82f6"
            strokeWidth={2}
            name={t('statistics.debt.totalLoanGiven')}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="loanReceived"
            stroke="#10b981"
            strokeWidth={2}
            name={t('statistics.debt.totalLoanReceived')}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cumulativeNetDebt"
            stroke="#ef4444"
            strokeWidth={2}
            name={t('statistics.debt.netDebt')}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
