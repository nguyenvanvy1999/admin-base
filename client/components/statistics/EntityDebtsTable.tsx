import { useDebtStatistics } from '@client/hooks/queries/useDebtStatistics';
import { NumberFormatter } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface EntityDebtsTableProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    entityId?: string;
  };
}

export const EntityDebtsTable = ({ queryParams }: EntityDebtsTableProps) => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useDebtStatistics(queryParams);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
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
          Failed to load entity debts
        </p>
      </div>
    );
  }

  const { entityDebts } = data;

  if (entityDebts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('statistics.debt.entityDebts')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('common.noData', { defaultValue: 'No data available' })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('statistics.debt.entityDebts')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.entityName')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.totalGiven')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.totalReceived')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.netBalance')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.transactionCount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entityDebts.map((debt) => (
              <tr
                key={debt.entityId}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  {debt.entityName}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                  <NumberFormatter
                    value={debt.totalLoanGiven}
                    prefix={
                      debt.currency.symbol ? `${debt.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                  <NumberFormatter
                    value={debt.totalLoanReceived}
                    prefix={
                      debt.currency.symbol ? `${debt.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </td>
                <td
                  className={`py-3 px-4 text-sm text-right font-medium ${
                    debt.netDebt >= 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  <NumberFormatter
                    value={Math.abs(debt.netDebt)}
                    prefix={
                      debt.currency.symbol ? `${debt.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                  {debt.transactionCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
