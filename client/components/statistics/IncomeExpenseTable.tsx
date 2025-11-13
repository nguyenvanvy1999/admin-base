import { useIncomeExpenseDetailed } from '@client/hooks/queries/useIncomeExpenseDetailed';
import { formatDecimal } from '@client/utils/format';

interface IncomeExpenseTableProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    categoryId?: string;
    accountId?: string;
    entityId?: string;
  };
}

export const IncomeExpenseTable = ({
  queryParams,
}: IncomeExpenseTableProps) => {
  const { data, isLoading, error } = useIncomeExpenseDetailed(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-red-600 dark:text-red-400">
          {error ? 'Failed to load table data' : 'No data available'}
        </p>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Income', 'Expense', 'Net', 'Fee', 'Transactions'];
    const rows = data.timeStats.map((item) => [
      item.date,
      item.income.toString(),
      item.expense.toString(),
      item.net.toString(),
      item.fee.toString(),
      item.transactionCount.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-expense-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Detailed Statistics
        </h3>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Expense
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Net
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fee
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.timeStats.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 dark:text-emerald-400">
                  {formatDecimal(item.income)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                  {formatDecimal(Math.abs(item.expense))}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                    item.net >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatDecimal(item.net)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 dark:text-orange-400">
                  {formatDecimal(item.fee)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {item.transactionCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
