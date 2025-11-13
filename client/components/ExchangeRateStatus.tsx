import { useRefreshExchangeRateMutation } from '@client/hooks/mutations/useExchangeRateMutations';
import { useExchangeRateHealthQuery } from '@client/hooks/queries/useExchangeRateQueries';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';

dayjs.extend(relativeTime);

const ExchangeRateStatus = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const { data: health, isLoading } = useExchangeRateHealthQuery();
  const refreshMutation = useRefreshExchangeRateMutation();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const formatTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Never';
    return dayjs(timestamp).fromNow();
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-gray-400';
    if (health?.status === 'healthy') return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (health?.status === 'healthy') return 'Healthy';
    return 'Stale';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsTooltipOpen(!isTooltipOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--color-primary))] hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        aria-label="Exchange rate status"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
          {getStatusText()}
        </span>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isTooltipOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsTooltipOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-3 z-20 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Exchange Rate Status
              </h3>
            </div>

            <div className="px-4 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Status:
                </span>
                <span
                  className={`text-xs font-medium ${
                    health?.status === 'healthy'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  {getStatusText()}
                </span>
              </div>

              {health?.lastFetch && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated:
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {formatTime(health.lastFetch)}
                  </span>
                </div>
              )}

              {health?.cacheDate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Rate date:
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {health.cacheDate}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Cache valid:
                </span>
                <span
                  className={`text-xs font-medium ${
                    health?.isCacheValid
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  {health?.isCacheValid ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh Rates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExchangeRateStatus;
