import { useReportInvestments } from '@client/hooks/queries/useReportInvestments';
import { formatDecimal } from '@client/utils/format';
import { DonutChart } from '@mantine/charts';

interface InvestmentAllocationChartProps {
  dateFrom?: string;
  dateTo?: string;
}

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

  const chartData = data.allocation.map((item, index) => ({
    name: item.investmentSymbol,
    value: item.value,
    percentage: item.percentage,
    fullName: item.investmentName,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Investment Allocation
      </h3>
      <DonutChart
        h={300}
        data={chartData}
        tooltipProps={{
          formatter: (value, payload) => [
            `${formatDecimal(value as number)} (${(payload as any).percentage.toFixed(2)}%)`,
            (payload as any).fullName,
          ],
        }}
        withLabelsLine
        labelsType="percent"
        strokeWidth={0}
      />
    </div>
  );
};
