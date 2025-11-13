import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';
import { BarChart, PieChart } from '@mantine/charts';

interface CategoryBreakdownChartProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const CategoryBreakdownChart = ({
  queryParams,
}: CategoryBreakdownChartProps) => {
  const { data, isLoading, error } = useIncomeExpenseDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !data || data.categoryStats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ? 'Failed to load chart data' : 'No category data available'}
          </p>
        </div>
      </div>
    );
  }

  const expenseCategories = data.categoryStats
    .filter((cat) => cat.expense > 0)
    .sort((a, b) => b.expense - a.expense)
    .slice(0, 10);

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

  const pieData = expenseCategories.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.expense,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Category Breakdown
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expenses by Category
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
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Top Expense Categories
          </h4>
          <BarChart
            h={300}
            data={expenseCategories}
            dataKey="categoryName"
            series={[
              {
                name: 'expense',
                label: 'Expense',
                color: '#ef4444',
              },
            ]}
            xAxisProps={{
              angle: -45,
              textAnchor: 'end',
              height: 100,
            }}
            yAxisProps={{
              tickFormatter: (value) => formatDecimal(value, 0),
            }}
            tooltipProps={{
              formatter: (value) => formatDecimal(value as number),
            }}
          />
        </div>
      </div>
    </div>
  );
};
