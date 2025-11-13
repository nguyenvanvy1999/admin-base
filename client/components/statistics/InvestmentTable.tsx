import { useReportInvestments } from '@client/hooks/queries/useReportInvestments';
import { formatDecimal } from '@client/utils/format';

interface InvestmentTableProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    investmentId?: string;
    accountId?: string;
    assetType?: string;
  };
}

export const InvestmentTable = ({ queryParams }: InvestmentTableProps) => {
  const { data, isLoading, error } = useReportInvestments({
    dateFrom: queryParams.dateFrom,
    dateTo: queryParams.dateTo,
  });

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
          {error ? 'Failed to load investment data' : 'No data available'}
        </p>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ['Symbol', 'Name', 'Asset Type', 'Value', 'Percentage'];
    const rows = data.allocation.map((item) => [
      item.investmentSymbol,
      item.investmentName,
      item.assetType,
      item.value.toString(),
      `${item.percentage}%`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Investment Allocation
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
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Asset Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.allocation.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.investmentSymbol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.investmentName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.assetType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatDecimal(item.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                  {formatDecimal(item.percentage)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
