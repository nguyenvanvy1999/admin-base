import { useReportInvestments } from '@client/hooks/queries/useReportInvestments';
import { formatDecimal } from '@client/utils/format';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface InvestmentAllocationChartProps {
  dateFrom?: string;
  dateTo?: string;
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

export const InvestmentAllocationChart = ({
  dateFrom,
  dateTo,
}: InvestmentAllocationChartProps) => {
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

  if (error || !data || data.allocation.length === 0) {
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

  const chartData = data.allocation.map((item) => ({
    name: item.investmentSymbol,
    value: item.value,
    percentage: item.percentage,
    fullName: item.investmentName,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Allocation
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ payload }) => `${payload.percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${formatDecimal(value)} (${props.payload.percentage.toFixed(2)}%)`,
              props.payload.fullName,
            ]}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Legend
            formatter={(value, entry: any) =>
              `${entry.payload.fullName} (${entry.payload.percentage.toFixed(1)}%)`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
