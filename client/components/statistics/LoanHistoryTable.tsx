import { useDebtStatistics } from '@client/hooks/queries/useDebtStatistics';
import { NumberFormatter } from '@mantine/core';
import { TransactionType } from '@server/generated/prisma/enums';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

interface LoanHistoryTableProps {
  queryParams: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
    entityId?: string;
  };
}

export const LoanHistoryTable = ({ queryParams }: LoanHistoryTableProps) => {
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
          Failed to load loan history
        </p>
      </div>
    );
  }

  const { loanHistory } = data;

  if (loanHistory.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('statistics.debt.loanHistory')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('common.noData', { defaultValue: 'No data available' })}
        </p>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    if (type === TransactionType.loan_given) {
      return t('transactions.loanGiven', { defaultValue: 'Loan Given' });
    }
    return t('transactions.loanReceived', { defaultValue: 'Loan Received' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('statistics.debt.loanHistory')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.date')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.type')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.entityName')}
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.amount')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.account')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('statistics.debt.note')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loanHistory.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  {dayjs(item.date).format('DD/MM/YYYY')}
                </td>
                <td className="py-3 px-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === TransactionType.loan_given
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {getTypeLabel(item.type)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  {item.entityName}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                  <NumberFormatter
                    value={item.amount}
                    prefix={
                      item.currency.symbol ? `${item.currency.symbol} ` : ''
                    }
                    thousandSeparator=","
                    decimalScale={2}
                  />
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {item.accountName}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  {item.note || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
