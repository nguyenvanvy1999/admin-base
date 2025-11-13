import { TransactionType } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { Elysia } from 'elysia';
import type {
  IReportInvestmentsQueryDto,
  IReportSummaryQueryDto,
  IReportTransactionsQueryDto,
  ReportInvestmentsResponse,
  ReportSummaryResponse,
  ReportTransactionsResponse,
} from '../dto/report.dto';

const safeNumber = (value: unknown) =>
  value && typeof value === 'object' && 'toNumber' in value
    ? (value as any).toNumber()
    : Number(value ?? 0);

export class ReportService {
  private async getUserBaseCurrencyId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { baseCurrencyId: true },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user.baseCurrencyId;
  }

  async getSummary(
    userId: string,
    query: IReportSummaryQueryDto,
  ): Promise<ReportSummaryResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const [accounts, transactions, investments, holdings] = await Promise.all([
      prisma.account.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          balance: true,
          currencyId: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        select: {
          type: true,
          amount: true,
          currencyId: true,
          priceInBaseCurrency: true,
        },
      }),
      prisma.investment.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.holding.findMany({
        where: {
          userId,
        },
        select: {
          investmentId: true,
          quantity: true,
          avgCost: true,
          lastPrice: true,
          unrealizedPnl: true,
        },
      }),
    ]);

    let totalBalance = 0;
    for (const account of accounts) {
      const balance = safeNumber(account.balance);
      if (account.currencyId === baseCurrencyId) {
        totalBalance += balance;
      } else {
        const accountCurrency = await prisma.currency.findUnique({
          where: { id: account.currencyId },
          select: { code: true },
        });
        const baseCurrency = await prisma.currency.findUnique({
          where: { id: baseCurrencyId },
          select: { code: true },
        });
        if (accountCurrency && baseCurrency) {
          const rate = await this.getExchangeRate(
            accountCurrency.code,
            baseCurrency.code,
          );
          totalBalance += balance * rate;
        }
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const transaction of transactions) {
      const amount = safeNumber(transaction.amount);
      const amountInBase =
        transaction.priceInBaseCurrency !== null
          ? safeNumber(transaction.priceInBaseCurrency)
          : null;

      let amountToUse = amount;
      if (transaction.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const transactionCurrency = await prisma.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await prisma.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (transactionCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              transactionCurrency.code,
              baseCurrency.code,
            );
            amountToUse = amount * rate;
          }
        }
      }

      if (transaction.type === TransactionType.income) {
        totalIncome += amountToUse;
        incomeCount++;
      } else if (transaction.type === TransactionType.expense) {
        totalExpense += amountToUse;
        expenseCount++;
      }
    }

    let totalInvestments = 0;
    for (const holding of holdings) {
      const quantity = safeNumber(holding.quantity);
      const lastPrice = holding.lastPrice
        ? safeNumber(holding.lastPrice)
        : null;
      if (lastPrice !== null && quantity > 0) {
        const investment = await prisma.investment.findUnique({
          where: { id: holding.investmentId },
          select: {
            currencyId: true,
            baseCurrencyId: true,
          },
        });
        if (investment) {
          const value = quantity * lastPrice;
          if (investment.baseCurrencyId === baseCurrencyId) {
            totalInvestments += value;
          } else if (investment.currencyId === baseCurrencyId) {
            totalInvestments += value;
          } else {
            const investmentCurrency = await prisma.currency.findUnique({
              where: { id: investment.currencyId },
              select: { code: true },
            });
            const baseCurrency = await prisma.currency.findUnique({
              where: { id: baseCurrencyId },
              select: { code: true },
            });
            if (investmentCurrency && baseCurrency) {
              const rate = await this.getExchangeRate(
                investmentCurrency.code,
                baseCurrency.code,
              );
              totalInvestments += value * rate;
            }
          }
        }
      }
    }

    const totalTrades = await prisma.investmentTrade.count({
      where: {
        userId,
        deletedAt: null,
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
    });

    return {
      totalBalance: Number(totalBalance.toFixed(2)),
      totalInvestments: Number(totalInvestments.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      transactionCount: transactions.length,
      incomeCount,
      expenseCount,
      investmentCount: investments.length,
      totalTrades,
    };
  }

  async getTransactions(
    userId: string,
    query: IReportTransactionsQueryDto,
  ): Promise<ReportTransactionsResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: {
          in: [TransactionType.income, TransactionType.expense],
        },
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        date: true,
        type: true,
        amount: true,
        currencyId: true,
        priceInBaseCurrency: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const statsMap = new Map<
      string,
      { income: number; expense: number; count: number }
    >();

    for (const transaction of transactions) {
      const amount = safeNumber(transaction.amount);
      const amountInBase =
        transaction.priceInBaseCurrency !== null
          ? safeNumber(transaction.priceInBaseCurrency)
          : null;

      let amountToUse = amount;
      if (transaction.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const transactionCurrency = await prisma.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await prisma.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (transactionCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              transactionCurrency.code,
              baseCurrency.code,
            );
            amountToUse = amount * rate;
          }
        }
      }

      const date = new Date(transaction.date);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, { income: 0, expense: 0, count: 0 });
      }

      const stats = statsMap.get(dateKey)!;
      stats.count++;
      if (transaction.type === TransactionType.income) {
        stats.income += amountToUse;
      } else {
        stats.expense += amountToUse;
      }
    }

    const stats = Array.from(statsMap.entries())
      .map(([date, data]) => ({
        date,
        income: Number(data.income.toFixed(2)),
        expense: Number(data.expense.toFixed(2)),
        net: Number((data.income - data.expense).toFixed(2)),
        transactionCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalIncome = stats.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = stats.reduce((sum, item) => sum + item.expense, 0);
    const totalTransactions = transactions.length;

    return {
      stats,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      totalNet: Number((totalIncome - totalExpense).toFixed(2)),
      totalTransactions,
    };
  }

  async getInvestments(
    userId: string,
    query: IReportInvestmentsQueryDto,
  ): Promise<ReportInvestmentsResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const investments = await prisma.investment.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        symbol: true,
        name: true,
        assetType: true,
        currencyId: true,
        baseCurrencyId: true,
      },
    });

    const holdings = await prisma.holding.findMany({
      where: {
        userId,
        investmentId: {
          in: investments.map((inv) => inv.id),
        },
      },
      select: {
        investmentId: true,
        quantity: true,
        lastPrice: true,
        avgCost: true,
        unrealizedPnl: true,
      },
    });

    const trades = await prisma.investmentTrade.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        investmentId: true,
        side: true,
        amount: true,
        amountInBaseCurrency: true,
        currencyId: true,
      },
    });

    const allocation: Array<{
      investmentId: string;
      investmentName: string;
      investmentSymbol: string;
      assetType: string;
      value: number;
      percentage: number;
    }> = [];

    let totalValue = 0;

    for (const holding of holdings) {
      const investment = investments.find(
        (inv) => inv.id === holding.investmentId,
      );
      if (!investment) continue;

      const quantity = safeNumber(holding.quantity);
      const lastPrice = holding.lastPrice
        ? safeNumber(holding.lastPrice)
        : null;

      if (lastPrice === null || quantity === 0) continue;

      const value = quantity * lastPrice;
      let valueInBase = value;

      if (investment.baseCurrencyId === baseCurrencyId) {
        valueInBase = value;
      } else if (investment.currencyId === baseCurrencyId) {
        valueInBase = value;
      } else {
        const investmentCurrency = await prisma.currency.findUnique({
          where: { id: investment.currencyId },
          select: { code: true },
        });
        const baseCurrency = await prisma.currency.findUnique({
          where: { id: baseCurrencyId },
          select: { code: true },
        });
        if (investmentCurrency && baseCurrency) {
          const rate = await this.getExchangeRate(
            investmentCurrency.code,
            baseCurrency.code,
          );
          valueInBase = value * rate;
        }
      }

      totalValue += valueInBase;
      allocation.push({
        investmentId: investment.id,
        investmentName: investment.name,
        investmentSymbol: investment.symbol,
        assetType: investment.assetType,
        value: Number(valueInBase.toFixed(2)),
        percentage: 0,
      });
    }

    allocation.forEach((item) => {
      item.percentage =
        totalValue > 0
          ? Number(((item.value / totalValue) * 100).toFixed(2))
          : 0;
    });

    let totalInvested = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;
    let buyTrades = 0;
    let sellTrades = 0;

    for (const trade of trades) {
      const amount = safeNumber(trade.amount);
      const amountInBase = trade.amountInBaseCurrency
        ? safeNumber(trade.amountInBaseCurrency)
        : null;

      let amountToUse = amount;
      if (trade.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const tradeCurrency = await prisma.currency.findUnique({
            where: { id: trade.currencyId },
            select: { code: true },
          });
          const baseCurrency = await prisma.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (tradeCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              tradeCurrency.code,
              baseCurrency.code,
            );
            amountToUse = amount * rate;
          }
        }
      }

      if (trade.side === 'buy') {
        totalInvested += amountToUse;
        buyTrades++;
      } else {
        realizedPnl += amountToUse;
        sellTrades++;
      }
    }

    for (const holding of holdings) {
      const unrealizedPnlValue = holding.unrealizedPnl
        ? safeNumber(holding.unrealizedPnl)
        : 0;
      unrealizedPnl += unrealizedPnlValue;
    }

    const totalPnl = realizedPnl + unrealizedPnl;
    const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return {
      allocation: allocation.sort((a, b) => b.value - a.value),
      performance: {
        totalInvested: Number(totalInvested.toFixed(2)),
        totalValue: Number(totalValue.toFixed(2)),
        realizedPnl: Number(realizedPnl.toFixed(2)),
        unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
        totalPnl: Number(totalPnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        totalTrades: trades.length,
        buyTrades,
        sellTrades,
      },
    };
  }

  private async getExchangeRate(
    fromCode: string,
    toCode: string,
  ): Promise<number> {
    if (fromCode === toCode) return await Promise.resolve(1);

    const rates: Record<string, Record<string, number>> = {
      VND: { USD: 1 / 25000 },
      USD: { VND: 25000 },
    };

    return rates[fromCode]?.[toCode] ?? 1;
  }
}

export const reportServiceInstance = new ReportService();

export default new Elysia().decorate('reportService', reportServiceInstance);
