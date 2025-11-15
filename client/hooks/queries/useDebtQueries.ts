import { transactionService } from '@client/services';
import type { TransactionDetail } from '@server/dto/transaction.dto';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export interface DebtStatistics {
  totalLoanGiven: number;
  totalLoanReceived: number;
  totalPaid: number;
  totalReceived: number;
  currency: string;
}

export const useDebtStatistics = (dateRange: {
  from: Date | null;
  to: Date | null;
}) => {
  return useQuery<DebtStatistics>({
    queryKey: ['debt-statistics', dateRange],
    queryFn: () => {
      const query: {
        from?: string;
        to?: string;
      } = {};
      if (dateRange.from) query.from = dateRange.from.toISOString();
      if (dateRange.to) query.to = dateRange.to.toISOString();

      return transactionService.getDebtStatistics(query);
    },
    placeholderData: keepPreviousData,
  });
};

export interface DebtTransaction extends TransactionDetail {
  remainingAmount: number;
  type: 'loan_given' | 'loan_received';
}

export const useDebtTransactions = (dateRange: {
  from: Date | null;
  to: Date | null;
}) => {
  return useQuery<DebtTransaction[]>({
    queryKey: ['debt-transactions', dateRange],
    queryFn: async () => {
      const query: {
        status?: string;
        from?: string;
        to?: string;
      } = {
        status: 'unpaid',
      };
      if (dateRange.from) query.from = dateRange.from.toISOString();
      if (dateRange.to) query.to = dateRange.to.toISOString();

      const data = await transactionService.getDebts(query);
      return data as DebtTransaction[];
    },
  });
};
