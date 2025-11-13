import {
  ContributionType,
  TradeSide,
  TransactionType,
} from '@server/generated/prisma/enums';
import type { prisma } from '@server/libs/db';
import Decimal from 'decimal.js';
import { currencyConversionServiceInstance } from './currency-conversion.service';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class AccountBalanceService {
  constructor(private currencyConverter = currencyConversionServiceInstance) {}

  async applyTransactionBalance(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
    toAmount?: Decimal | number,
  ) {
    await tx.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { id: true },
    });

    const { amountInAccountCurrency, feeInAccountCurrency } =
      await this.currencyConverter.convertToAccountCurrency(
        amount,
        fee,
        currencyId,
        accountCurrencyId,
      );

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
      case TransactionType.collect_debt:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: amountInAccountCurrency
                .minus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
      case TransactionType.repay_debt:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: amountInAccountCurrency
                .plus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.transfer: {
        if (!toAccountId) {
          throw new Error('To account is required for transfer');
        }
        await tx.account.findUniqueOrThrow({
          where: { id: toAccountId },
          select: { id: true },
        });

        const amountInToAccountCurrency = toAmount
          ? new Decimal(toAmount)
          : await this.currencyConverter.convertToToAccountCurrency(
              amount,
              currencyId,
              toAccountCurrencyId,
            );

        await this.updateTransferBalance(
          tx,
          accountId,
          toAccountId,
          amountInAccountCurrency,
          feeInAccountCurrency,
          amountInToAccountCurrency,
          false,
        );
        break;
      }
    }
  }

  async revertTransactionBalance(
    tx: PrismaTx,
    transactionType: TransactionType,
    accountId: string,
    toAccountId: string | null | undefined,
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
    toAccountCurrencyId?: string,
    toAmount?: Decimal | number,
  ) {
    const { amountInAccountCurrency, feeInAccountCurrency } =
      await this.currencyConverter.convertToAccountCurrency(
        amount,
        fee,
        currencyId,
        accountCurrencyId,
      );

    switch (transactionType) {
      case TransactionType.income:
      case TransactionType.loan_received:
      case TransactionType.collect_debt:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: amountInAccountCurrency
                .minus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.expense:
      case TransactionType.loan_given:
      case TransactionType.repay_debt:
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: amountInAccountCurrency
                .plus(feeInAccountCurrency)
                .toNumber(),
            },
          },
        });
        break;

      case TransactionType.transfer: {
        if (!toAccountId) {
          throw new Error('To account is required for transfer');
        }

        const amountInToAccountCurrency = toAmount
          ? new Decimal(toAmount)
          : await this.currencyConverter.convertToToAccountCurrency(
              amount,
              currencyId,
              toAccountCurrencyId,
            );

        await this.updateTransferBalance(
          tx,
          accountId,
          toAccountId,
          amountInAccountCurrency,
          feeInAccountCurrency,
          amountInToAccountCurrency,
          true,
        );
        break;
      }
    }
  }

  async applyTradeBalance(
    tx: PrismaTx,
    side: TradeSide,
    accountId: string,
    amount: Decimal | number,
    fee: Decimal | number,
  ) {
    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    if (side === TradeSide.buy) {
      const totalCost = amountDecimal.plus(feeDecimal);
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: totalCost.toNumber(),
          },
        },
      });
    } else {
      const proceeds = amountDecimal.minus(feeDecimal);
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: proceeds.toNumber(),
          },
        },
      });
    }
  }

  async revertTradeBalance(
    tx: PrismaTx,
    side: TradeSide,
    accountId: string,
    amount: Decimal | number,
    fee: Decimal | number,
  ) {
    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    if (side === TradeSide.buy) {
      const totalCost = amountDecimal.plus(feeDecimal);
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: totalCost.toNumber(),
          },
        },
      });
    } else {
      const proceeds = amountDecimal.minus(feeDecimal);
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: proceeds.toNumber(),
          },
        },
      });
    }
  }

  async applyContributionBalance(
    tx: PrismaTx,
    type: ContributionType,
    accountId: string,
    amount: Decimal | number,
  ) {
    const amountDecimal = new Decimal(amount);

    if (type === ContributionType.deposit) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: amountDecimal.toNumber(),
          },
        },
      });
    } else {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: amountDecimal.toNumber(),
          },
        },
      });
    }
  }

  async revertContributionBalance(
    tx: PrismaTx,
    type: ContributionType,
    accountId: string,
    amount: Decimal | number,
  ) {
    const amountDecimal = new Decimal(amount);

    if (type === ContributionType.deposit) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: amountDecimal.toNumber(),
          },
        },
      });
    } else {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: amountDecimal.toNumber(),
          },
        },
      });
    }
  }

  private async updateTransferBalance(
    tx: PrismaTx,
    accountId: string,
    toAccountId: string,
    amountInAccountCurrency: Decimal,
    feeInAccountCurrency: Decimal,
    amountInToAccountCurrency: Decimal,
    isRevert: boolean,
  ) {
    const fromAccountOperation = isRevert ? 'increment' : 'decrement';
    const toAccountOperation = isRevert ? 'decrement' : 'increment';

    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          [fromAccountOperation]: amountInAccountCurrency
            .plus(feeInAccountCurrency)
            .toNumber(),
        },
      },
    });

    await tx.account.update({
      where: { id: toAccountId },
      data: {
        balance: {
          [toAccountOperation]: amountInToAccountCurrency.toNumber(),
        },
      },
    });
  }
}

export const accountBalanceServiceInstance = new AccountBalanceService();
