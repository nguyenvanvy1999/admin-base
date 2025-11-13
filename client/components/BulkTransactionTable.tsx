import { useAccountsOptionsQuery } from '@client/hooks/queries/useAccountQueries';
import { useCategoriesQuery } from '@client/hooks/queries/useCategoryQueries';
import { useEntitiesOptionsQuery } from '@client/hooks/queries/useEntityQueries';
import {
  ActionIcon,
  Select as MantineSelect,
  NumberInput,
  Table,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { TransactionType } from '@server/generated/prisma/enums';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CategorySelect from './CategorySelect';
import EventSelect from './EventSelect';
import { Select } from './Select';

export type BulkTransactionRow = {
  id: string;
  type: 'income' | 'expense';
  accountId: string;
  amount: number;
  categoryId: string;
  fee?: number;
  entityId?: string | null;
  eventId?: string | null;
  date: string;
};

type BulkTransactionTableProps = {
  rows: BulkTransactionRow[];
  onRowsChange: (rows: BulkTransactionRow[]) => void;
  defaultDate?: string;
  errors?: Record<string, Record<string, string>>;
};

const BulkTransactionTable = ({
  rows,
  onRowsChange,
  defaultDate,
  errors = {},
}: BulkTransactionTableProps) => {
  const { t } = useTranslation();
  const { data: accountsData } = useAccountsOptionsQuery();
  const { data: categoriesData } = useCategoriesQuery({});
  const { data: entitiesData } = useEntitiesOptionsQuery();

  const accounts = accountsData?.accounts || [];
  const categories = categoriesData?.categories || [];
  const entities = entitiesData?.entities || [];

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency.code})`,
    }));
  }, [accounts]);

  const entityOptions = useMemo(() => {
    return entities.map((entity) => ({
      value: entity.id,
      label: entity.name,
    }));
  }, [entities]);

  const handleAddRow = () => {
    const newRow: BulkTransactionRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      type: TransactionType.expense,
      accountId: '',
      amount: 0,
      categoryId: '',
      fee: 0,
      entityId: null,
      eventId: null,
      date: defaultDate || new Date().toISOString(),
    };
    onRowsChange([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    onRowsChange(rows.filter((row) => row.id !== id));
  };

  const handleRowChange = (
    id: string,
    field: keyof BulkTransactionRow,
    value: unknown,
  ) => {
    onRowsChange(
      rows.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'date' && !updatedRow.date) {
            updatedRow.date = defaultDate || new Date().toISOString();
          }
          return updatedRow;
        }
        return row;
      }),
    );
  };

  const getAccountCurrency = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.currency.symbol || '';
  };

  return (
    <div>
      <Table.ScrollContainer minWidth={1400}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '50px' }}></Table.Th>
              <Table.Th style={{ width: '120px' }}>
                {t('transactions.type', { defaultValue: 'Type' })}
              </Table.Th>
              <Table.Th style={{ width: '180px' }}>
                {t('transactions.account', { defaultValue: 'Account' })}
              </Table.Th>
              <Table.Th style={{ width: '120px' }}>
                {t('transactions.amount', { defaultValue: 'Amount' })}
              </Table.Th>
              <Table.Th style={{ width: '200px' }}>
                {t('transactions.category', { defaultValue: 'Category' })}
              </Table.Th>
              <Table.Th style={{ width: '120px' }}>
                {t('transactions.fee', { defaultValue: 'Fee' })}
              </Table.Th>
              <Table.Th style={{ width: '150px' }}>
                {t('transactions.spendFor', { defaultValue: 'Entity' })}
              </Table.Th>
              <Table.Th style={{ width: '150px' }}>
                {t('transactions.event', { defaultValue: 'Event' })}
              </Table.Th>
              <Table.Th style={{ width: '180px' }}>
                {t('transactions.date', { defaultValue: 'Date' })}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: '2rem' }}
                >
                  {t('transactions.noRows', {
                    defaultValue: 'No transactions. Click + to add.',
                  })}
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((row) => {
                const rowErrors = errors[row.id] || {};
                const currencySymbol = getAccountCurrency(row.accountId);

                return (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        <IconMinus size={16} />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <MantineSelect
                        data={[
                          {
                            value: TransactionType.income,
                            label: t('transactions.income', {
                              defaultValue: 'Income',
                            }),
                          },
                          {
                            value: TransactionType.expense,
                            label: t('transactions.expense', {
                              defaultValue: 'Expense',
                            }),
                          },
                        ]}
                        value={row.type}
                        onChange={(value) => {
                          if (value) {
                            handleRowChange(
                              row.id,
                              'type',
                              value as 'income' | 'expense',
                            );
                            handleRowChange(row.id, 'categoryId', '');
                          }
                        }}
                        error={rowErrors.type}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        items={accountOptions}
                        value={row.accountId || null}
                        onChange={(value) =>
                          handleRowChange(row.id, 'accountId', value || '')
                        }
                        placeholder={t('transactions.selectAccount', {
                          defaultValue: 'Select account',
                        })}
                        searchable
                        error={rowErrors.accountId}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={row.amount}
                        onChange={(value) =>
                          handleRowChange(row.id, 'amount', Number(value) || 0)
                        }
                        placeholder={`0 ${currencySymbol}`}
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        prefix={currencySymbol ? `${currencySymbol} ` : ''}
                        error={rowErrors.amount}
                      />
                    </Table.Td>
                    <Table.Td>
                      <CategorySelect
                        value={row.categoryId || null}
                        onChange={(value) =>
                          handleRowChange(row.id, 'categoryId', value || '')
                        }
                        filterType={
                          row.type === TransactionType.income
                            ? 'income'
                            : 'expense'
                        }
                        categories={categories}
                        searchable
                        error={rowErrors.categoryId}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={row.fee || 0}
                        onChange={(value) =>
                          handleRowChange(row.id, 'fee', Number(value) || 0)
                        }
                        placeholder={`0 ${currencySymbol}`}
                        thousandSeparator=","
                        decimalScale={2}
                        min={0}
                        prefix={currencySymbol ? `${currencySymbol} ` : ''}
                        error={rowErrors.fee}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        items={entityOptions}
                        value={row.entityId || null}
                        onChange={(value) =>
                          handleRowChange(row.id, 'entityId', value)
                        }
                        placeholder={t('transactions.spendForPlaceholder', {
                          defaultValue: 'Select entity',
                        })}
                        searchable
                        clearable
                        error={rowErrors.entityId}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td>
                      <EventSelect
                        value={row.eventId || null}
                        onChange={(value) =>
                          handleRowChange(row.id, 'eventId', value)
                        }
                        clearable
                        error={rowErrors.eventId}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td>
                      <DateTimePicker
                        value={row.date ? new Date(row.date) : new Date()}
                        onChange={(value) => {
                          if (value) {
                            const dateValue =
                              typeof value === 'string'
                                ? new Date(value)
                                : value &&
                                    typeof value === 'object' &&
                                    'getTime' in value
                                  ? (value as Date)
                                  : new Date();
                            handleRowChange(
                              row.id,
                              'date',
                              dateValue.toISOString(),
                            );
                          }
                        }}
                        valueFormat="DD/MM/YYYY HH:mm"
                        error={rowErrors.date}
                        label=""
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <div style={{ marginTop: '1rem' }}>
        <ActionIcon
          color="blue"
          variant="filled"
          onClick={handleAddRow}
          size="lg"
        >
          <IconPlus size={20} />
        </ActionIcon>
      </div>
    </div>
  );
};

export default BulkTransactionTable;
