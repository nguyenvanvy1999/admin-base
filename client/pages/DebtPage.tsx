import { DebtStatistics } from '@client/components/DebtStatistics';
import { DebtPaymentModal } from '@client/components/dialogs/DebtPaymentModal';
import { PageContainer } from '@client/components/PageContainer';
import { DebtTransactionTable } from '@client/components/tables/DebtTransactionTable';
import { useDebtTransactions } from '@client/hooks/queries/useDebtQueries';
import { Stack, Text, Title } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

const DebtPage = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().toDate(),
  });
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  const { refetch } = useDebtTransactions(dateRange);

  const handlePay = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsPayModalOpen(true);
  };

  const handleReceive = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsReceiveModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    refetch();
  };

  return (
    <PageContainer>
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={2}>{t('debts.title')}</Title>
          <Text c="dimmed">{t('debts.subtitle')}</Text>
        </Stack>

        <DebtStatistics onDateRangeChange={setDateRange} />

        <Stack gap="md">
          <Title order={3}>{t('debts.debtList')}</Title>
          <DebtTransactionTable
            dateRange={dateRange}
            onPay={handlePay}
            onReceive={handleReceive}
          />
        </Stack>
      </Stack>

      <DebtPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        type="pay"
        onSuccess={handlePaymentSuccess}
      />

      <DebtPaymentModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        type="receive"
        onSuccess={handlePaymentSuccess}
      />
    </PageContainer>
  );
};

export default DebtPage;
