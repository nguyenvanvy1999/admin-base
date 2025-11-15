import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import { logger } from '@server/configs/logger';
import { TransactionType } from '@server/generated';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import type {
  DebtStatisticsResponse,
  IDebtStatisticsQueryDto,
  IIncomeExpenseDetailedQueryDto,
  IInvestmentContributionsDetailedQueryDto,
  IInvestmentFeesDetailedQueryDto,
  IInvestmentPerformanceDetailedQueryDto,
  IInvestmentTradesDetailedQueryDto,
  IncomeExpenseDetailedResponse,
  InvestmentContributionsDetailedResponse,
  InvestmentFeesDetailedResponse,
  InvestmentPerformanceDetailedResponse,
  InvestmentTradesDetailedResponse,
  IReportInvestmentsQueryDto,
  IReportSummaryQueryDto,
  IReportTransactionsQueryDto,
  ReportInvestmentsResponse,
  ReportSummaryResponse,
  ReportTransactionsResponse,
} from '../dto/report.dto';
import {
  type ExchangeRateService,
  exchangeRateService,
} from './exchange-rate.service';

const safeNumber = (value: unknown) =>
  value && typeof value === 'object' && 'toNumber' in value
    ? (value as any).toNumber()
    : Number(value ?? 0);

export class ReportService {
  constructor(
    private readonly deps: {
      db: IDb;
      exchangeRateService: ExchangeRateService;
    } = {
      db: prisma,
      exchangeRateService: exchangeRateService,
    },
  ) {}

  private async getUserBaseCurrencyId(userId: string): Promise<string> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { baseCurrencyId: true },
    });
    if (!user) {
      throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
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
      this.deps.db.account.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          balance: true,
          currencyId: true,
        },
      }),
      this.deps.db.transaction.findMany({
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
      this.deps.db.investment.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      this.deps.db.holding.findMany({
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
        const accountCurrency = await this.deps.db.currency.findUnique({
          where: { id: account.currencyId },
          select: { code: true },
        });
        const baseCurrency = await this.deps.db.currency.findUnique({
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
          const transactionCurrency = await this.deps.db.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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
        const investment = await this.deps.db.investment.findUnique({
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
            const investmentCurrency = await this.deps.db.currency.findUnique({
              where: { id: investment.currencyId },
              select: { code: true },
            });
            const baseCurrency = await this.deps.db.currency.findUnique({
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

    const totalTrades = await this.deps.db.investmentTrade.count({
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

    const transactions = await this.deps.db.transaction.findMany({
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
        fee: true,
        currencyId: true,
        priceInBaseCurrency: true,
        feeInBaseCurrency: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const statsMap = new Map<
      string,
      { income: number; expense: number; fee: number; count: number }
    >();

    for (const transaction of transactions) {
      const amount = safeNumber(transaction.amount);
      const fee = safeNumber(transaction.fee);
      const amountInBase =
        transaction.priceInBaseCurrency !== null
          ? safeNumber(transaction.priceInBaseCurrency)
          : null;
      const feeInBase =
        transaction.feeInBaseCurrency !== null
          ? safeNumber(transaction.feeInBaseCurrency)
          : null;

      let amountToUse = amount;
      let feeToUse = fee;
      if (transaction.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const transactionCurrency = await this.deps.db.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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
        if (feeInBase !== null) {
          feeToUse = feeInBase;
        } else {
          const transactionCurrency = await this.deps.db.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (transactionCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              transactionCurrency.code,
              baseCurrency.code,
            );
            feeToUse = fee * rate;
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
        statsMap.set(dateKey, { income: 0, expense: 0, fee: 0, count: 0 });
      }

      const stats = statsMap.get(dateKey)!;
      stats.count++;
      stats.fee += feeToUse;
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
        fee: Number(data.fee.toFixed(2)),
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

  async getIncomeExpenseDetailed(
    userId: string,
    query: IIncomeExpenseDetailedQueryDto,
  ): Promise<IncomeExpenseDetailedResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const transactions = await this.deps.db.transaction.findMany({
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
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      select: {
        id: true,
        date: true,
        type: true,
        amount: true,
        fee: true,
        currencyId: true,
        priceInBaseCurrency: true,
        feeInBaseCurrency: true,
        categoryId: true,
        accountId: true,
        entityId: true,
        category: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const timeStatsMap = new Map<
      string,
      { income: number; expense: number; fee: number; count: number }
    >();
    const categoryStatsMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        parentId: string | null;
        income: number;
        expense: number;
        fee: number;
        count: number;
      }
    >();
    const accountStatsMap = new Map<
      string,
      {
        accountId: string;
        accountName: string;
        income: number;
        expense: number;
        fee: number;
        count: number;
      }
    >();
    const entityStatsMap = new Map<
      string,
      {
        entityId: string;
        entityName: string;
        income: number;
        expense: number;
        fee: number;
        count: number;
      }
    >();

    let totalFee = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
      const amount = safeNumber(transaction.amount);
      const fee = safeNumber(transaction.fee);
      const amountInBase =
        transaction.priceInBaseCurrency !== null
          ? safeNumber(transaction.priceInBaseCurrency)
          : null;
      const feeInBase =
        transaction.feeInBaseCurrency !== null
          ? safeNumber(transaction.feeInBaseCurrency)
          : null;

      let amountToUse = amount;
      let feeToUse = fee;
      if (transaction.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const transactionCurrency = await this.deps.db.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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
        if (feeInBase !== null) {
          feeToUse = feeInBase;
        } else {
          const transactionCurrency = await this.deps.db.currency.findUnique({
            where: { id: transaction.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (transactionCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              transactionCurrency.code,
              baseCurrency.code,
            );
            feeToUse = fee * rate;
          }
        }
      }

      totalFee += feeToUse;

      const date = new Date(transaction.date);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeStatsMap.has(dateKey)) {
        timeStatsMap.set(dateKey, {
          income: 0,
          expense: 0,
          fee: 0,
          count: 0,
        });
      }
      const timeStats = timeStatsMap.get(dateKey)!;
      timeStats.count++;
      timeStats.fee += feeToUse;
      if (transaction.type === TransactionType.income) {
        timeStats.income += amountToUse;
        totalIncome += amountToUse;
      } else {
        timeStats.expense += amountToUse;
        totalExpense += amountToUse;
      }

      if (transaction.categoryId && transaction.category) {
        const catKey = transaction.categoryId;
        if (!categoryStatsMap.has(catKey)) {
          categoryStatsMap.set(catKey, {
            categoryId: transaction.category.id,
            categoryName: transaction.category.name,
            parentId: transaction.category.parentId,
            income: 0,
            expense: 0,
            fee: 0,
            count: 0,
          });
        }
        const catStats = categoryStatsMap.get(catKey)!;
        catStats.count++;
        catStats.fee += feeToUse;
        if (transaction.type === TransactionType.income) {
          catStats.income += amountToUse;
        } else {
          catStats.expense += amountToUse;
        }
      }

      if (transaction.accountId && transaction.account) {
        const accKey = transaction.accountId;
        if (!accountStatsMap.has(accKey)) {
          accountStatsMap.set(accKey, {
            accountId: transaction.account.id,
            accountName: transaction.account.name,
            income: 0,
            expense: 0,
            fee: 0,
            count: 0,
          });
        }
        const accStats = accountStatsMap.get(accKey)!;
        accStats.count++;
        accStats.fee += feeToUse;
        if (transaction.type === TransactionType.income) {
          accStats.income += amountToUse;
        } else {
          accStats.expense += amountToUse;
        }
      }

      if (transaction.entityId && transaction.entity) {
        const entKey = transaction.entityId;
        if (!entityStatsMap.has(entKey)) {
          entityStatsMap.set(entKey, {
            entityId: transaction.entity.id,
            entityName: transaction.entity.name,
            income: 0,
            expense: 0,
            fee: 0,
            count: 0,
          });
        }
        const entStats = entityStatsMap.get(entKey)!;
        entStats.count++;
        entStats.fee += feeToUse;
        if (transaction.type === TransactionType.income) {
          entStats.income += amountToUse;
        } else {
          entStats.expense += amountToUse;
        }
      }
    }

    const timeStats = Array.from(timeStatsMap.entries())
      .map(([date, data]) => ({
        date,
        income: Number(data.income.toFixed(2)),
        expense: Number(data.expense.toFixed(2)),
        net: Number((data.income - data.expense).toFixed(2)),
        fee: Number(data.fee.toFixed(2)),
        transactionCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const categoryStats = Array.from(categoryStatsMap.values()).map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      parentId: cat.parentId,
      income: Number(cat.income.toFixed(2)),
      expense: Number(cat.expense.toFixed(2)),
      net: Number((cat.income - cat.expense).toFixed(2)),
      transactionCount: cat.count,
      fee: Number(cat.fee.toFixed(2)),
    }));

    const accountStats = Array.from(accountStatsMap.values()).map((acc) => ({
      accountId: acc.accountId,
      accountName: acc.accountName,
      income: Number(acc.income.toFixed(2)),
      expense: Number(acc.expense.toFixed(2)),
      net: Number((acc.income - acc.expense).toFixed(2)),
      transactionCount: acc.count,
      fee: Number(acc.fee.toFixed(2)),
    }));

    const entityStats = Array.from(entityStatsMap.values()).map((ent) => ({
      entityId: ent.entityId,
      entityName: ent.entityName,
      income: Number(ent.income.toFixed(2)),
      expense: Number(ent.expense.toFixed(2)),
      net: Number((ent.income - ent.expense).toFixed(2)),
      transactionCount: ent.count,
      fee: Number(ent.fee.toFixed(2)),
    }));

    const daysDiff =
      dateFrom && dateTo
        ? Math.ceil(
            (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 30;
    const monthsDiff = daysDiff / 30;

    const feeByCategory = categoryStats
      .filter((cat) => cat.fee > 0)
      .map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        fee: cat.fee,
      }))
      .sort((a, b) => b.fee - a.fee);

    const feeByAccount = accountStats
      .filter((acc) => acc.fee > 0)
      .map((acc) => ({
        accountId: acc.accountId,
        accountName: acc.accountName,
        fee: acc.fee,
      }))
      .sort((a, b) => b.fee - a.fee);

    return {
      timeStats,
      categoryStats,
      accountStats,
      entityStats,
      feeStats: {
        totalFee: Number(totalFee.toFixed(2)),
        averageFeePerTransaction:
          transactions.length > 0
            ? Number((totalFee / transactions.length).toFixed(2))
            : 0,
        feeByCategory,
        feeByAccount,
      },
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        totalNet: Number((totalIncome - totalExpense).toFixed(2)),
        totalFee: Number(totalFee.toFixed(2)),
        totalTransactions: transactions.length,
        averageDailyIncome:
          daysDiff > 0 ? Number((totalIncome / daysDiff).toFixed(2)) : 0,
        averageDailyExpense:
          daysDiff > 0 ? Number((totalExpense / daysDiff).toFixed(2)) : 0,
        averageMonthlyIncome:
          monthsDiff > 0 ? Number((totalIncome / monthsDiff).toFixed(2)) : 0,
        averageMonthlyExpense:
          monthsDiff > 0 ? Number((totalExpense / monthsDiff).toFixed(2)) : 0,
      },
    };
  }

  async getInvestments(
    userId: string,
    query: IReportInvestmentsQueryDto,
  ): Promise<ReportInvestmentsResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);

    const investments = await this.deps.db.investment.findMany({
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

    const holdings = await this.deps.db.holding.findMany({
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

    const trades = await this.deps.db.investmentTrade.findMany({
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
        const investmentCurrency = await this.deps.db.currency.findUnique({
          where: { id: investment.currencyId },
          select: { code: true },
        });
        const baseCurrency = await this.deps.db.currency.findUnique({
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
          const tradeCurrency = await this.deps.db.currency.findUnique({
            where: { id: trade.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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

  async getInvestmentPerformanceDetailed(
    userId: string,
    query: IInvestmentPerformanceDetailedQueryDto,
  ): Promise<InvestmentPerformanceDetailedResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const investments = await this.deps.db.investment.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.investmentId ? { id: query.investmentId } : {}),
        ...(query.assetType ? { assetType: query.assetType as any } : {}),
      },
      select: {
        id: true,
        symbol: true,
        name: true,
        currencyId: true,
        baseCurrencyId: true,
      },
    });

    const investmentIds = investments.map((inv) => inv.id);

    const trades = await this.deps.db.investmentTrade.findMany({
      where: {
        userId,
        investmentId: { in: investmentIds },
        deletedAt: null,
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        timestamp: true,
        side: true,
        amount: true,
        amountInBaseCurrency: true,
        currencyId: true,
        investmentId: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const holdings = await this.deps.db.holding.findMany({
      where: {
        userId,
        investmentId: { in: investmentIds },
      },
      select: {
        investmentId: true,
        quantity: true,
        avgCost: true,
        unrealizedPnl: true,
        lastPrice: true,
      },
    });

    const timeSeriesMap = new Map<
      string,
      {
        totalInvested: number;
        totalValue: number;
        realizedPnl: number;
        unrealizedPnl: number;
      }
    >();

    const investmentInvestedMap = new Map<string, number>();

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
          const tradeCurrency = await this.deps.db.currency.findUnique({
            where: { id: trade.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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

      const date = new Date(trade.timestamp);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeSeriesMap.has(dateKey)) {
        timeSeriesMap.set(dateKey, {
          totalInvested: 0,
          totalValue: 0,
          realizedPnl: 0,
          unrealizedPnl: 0,
        });
      }

      if (trade.side === 'buy') {
        const current = investmentInvestedMap.get(trade.investmentId) || 0;
        investmentInvestedMap.set(trade.investmentId, current + amountToUse);
      }
    }

    const currentHoldings = new Map<
      string,
      {
        quantity: number;
        avgCost: number;
        lastPrice: number | null;
        unrealizedPnl: number;
      }
    >();
    for (const holding of holdings) {
      currentHoldings.set(holding.investmentId, {
        quantity: safeNumber(holding.quantity),
        avgCost: safeNumber(holding.avgCost),
        lastPrice: holding.lastPrice ? safeNumber(holding.lastPrice) : null,
        unrealizedPnl: holding.unrealizedPnl
          ? safeNumber(holding.unrealizedPnl)
          : 0,
      });
    }

    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => {
        let totalValue = 0;
        let totalUnrealizedPnl = 0;
        let totalInvested = 0;

        for (const inv of investments) {
          const invested = investmentInvestedMap.get(inv.id) || 0;
          totalInvested += invested;
          const holding = currentHoldings.get(inv.id);
          if (holding && holding.lastPrice !== null) {
            const value = holding.quantity * holding.lastPrice;
            totalValue += value;
            totalUnrealizedPnl += holding.unrealizedPnl;
          }
        }

        const totalPnl = data.realizedPnl + totalUnrealizedPnl;
        const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

        return {
          date,
          totalInvested: Number(totalInvested.toFixed(2)),
          totalValue: Number(totalValue.toFixed(2)),
          realizedPnl: Number(data.realizedPnl.toFixed(2)),
          unrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
          totalPnl: Number(totalPnl.toFixed(2)),
          roi: Number(roi.toFixed(2)),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    let finalTotalInvested = 0;
    let finalTotalValue = 0;
    const finalRealizedPnl = 0;
    let finalUnrealizedPnl = 0;

    for (const inv of investments) {
      const invested = investmentInvestedMap.get(inv.id) || 0;
      finalTotalInvested += invested;
      const holding = currentHoldings.get(inv.id);
      if (holding && holding.lastPrice !== null) {
        const value = holding.quantity * holding.lastPrice;
        finalTotalValue += value;
        finalUnrealizedPnl += holding.unrealizedPnl;
      }
    }

    const finalTotalPnl = finalRealizedPnl + finalUnrealizedPnl;
    const finalRoi =
      finalTotalInvested > 0 ? (finalTotalPnl / finalTotalInvested) * 100 : 0;

    return {
      timeSeries,
      summary: {
        totalInvested: Number(finalTotalInvested.toFixed(2)),
        currentValue: Number(finalTotalValue.toFixed(2)),
        totalPnl: Number(finalTotalPnl.toFixed(2)),
        realizedPnl: Number(finalRealizedPnl.toFixed(2)),
        unrealizedPnl: Number(finalUnrealizedPnl.toFixed(2)),
        roi: Number(finalRoi.toFixed(2)),
      },
    };
  }

  async getInvestmentTradesDetailed(
    userId: string,
    query: IInvestmentTradesDetailedQueryDto,
  ): Promise<InvestmentTradesDetailedResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const trades = await this.deps.db.investmentTrade.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.investmentId ? { investmentId: query.investmentId } : {}),
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        timestamp: true,
        side: true,
        amount: true,
        amountInBaseCurrency: true,
        currencyId: true,
        quantity: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const statsMap = new Map<
      string,
      {
        buyCount: number;
        sellCount: number;
        buyVolume: number;
        sellVolume: number;
        totalVolume: number;
        tradeCount: number;
      }
    >();

    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalBuyTrades = 0;
    let totalSellTrades = 0;

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
          const tradeCurrency = await this.deps.db.currency.findUnique({
            where: { id: trade.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
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

      const date = new Date(trade.timestamp);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, {
          buyCount: 0,
          sellCount: 0,
          buyVolume: 0,
          sellVolume: 0,
          totalVolume: 0,
          tradeCount: 0,
        });
      }

      const stats = statsMap.get(dateKey)!;
      stats.tradeCount++;

      if (trade.side === 'buy') {
        stats.buyCount++;
        stats.buyVolume += amountToUse;
        totalBuyVolume += amountToUse;
        totalBuyTrades++;
      } else {
        stats.sellCount++;
        stats.sellVolume += amountToUse;
        totalSellVolume += amountToUse;
        totalSellTrades++;
      }
      stats.totalVolume += amountToUse;
    }

    const stats = Array.from(statsMap.entries())
      .map(([date, data]) => ({
        date,
        buyCount: data.buyCount,
        sellCount: data.sellCount,
        buyVolume: Number(data.buyVolume.toFixed(2)),
        sellVolume: Number(data.sellVolume.toFixed(2)),
        totalVolume: Number(data.totalVolume.toFixed(2)),
        averageTradeSize:
          data.tradeCount > 0
            ? Number((data.totalVolume / data.tradeCount).toFixed(2))
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const averageTradeSize =
      trades.length > 0
        ? Number(
            ((totalBuyVolume + totalSellVolume) / trades.length).toFixed(2),
          )
        : 0;

    return {
      stats,
      summary: {
        totalBuyTrades,
        totalSellTrades,
        totalBuyVolume: Number(totalBuyVolume.toFixed(2)),
        totalSellVolume: Number(totalSellVolume.toFixed(2)),
        averageTradeSize,
        totalTrades: trades.length,
      },
    };
  }

  async getInvestmentFeesDetailed(
    userId: string,
    query: IInvestmentFeesDetailedQueryDto,
  ): Promise<InvestmentFeesDetailedResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const trades = await this.deps.db.investmentTrade.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.investmentId ? { investmentId: query.investmentId } : {}),
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        timestamp: true,
        fee: true,
        currencyId: true,
        investmentId: true,
        investment: {
          select: {
            id: true,
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const timeStatsMap = new Map<
      string,
      { totalFee: number; transactionCount: number }
    >();
    const feeByInvestmentMap = new Map<
      string,
      {
        investmentId: string;
        investmentName: string;
        investmentSymbol: string;
        fee: number;
      }
    >();

    let totalFee = 0;

    for (const trade of trades) {
      const fee = safeNumber(trade.fee);
      let feeToUse = fee;

      if (trade.currencyId !== baseCurrencyId) {
        const tradeCurrency = await this.deps.db.currency.findUnique({
          where: { id: trade.currencyId },
          select: { code: true },
        });
        const baseCurrency = await this.deps.db.currency.findUnique({
          where: { id: baseCurrencyId },
          select: { code: true },
        });
        if (tradeCurrency && baseCurrency) {
          const rate = await this.getExchangeRate(
            tradeCurrency.code,
            baseCurrency.code,
          );
          feeToUse = fee * rate;
        }
      }

      totalFee += feeToUse;

      const date = new Date(trade.timestamp);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeStatsMap.has(dateKey)) {
        timeStatsMap.set(dateKey, { totalFee: 0, transactionCount: 0 });
      }
      const timeStats = timeStatsMap.get(dateKey)!;
      timeStats.totalFee += feeToUse;
      timeStats.transactionCount++;

      if (trade.investmentId && trade.investment) {
        const invKey = trade.investmentId;
        if (!feeByInvestmentMap.has(invKey)) {
          feeByInvestmentMap.set(invKey, {
            investmentId: trade.investment.id,
            investmentName: trade.investment.name,
            investmentSymbol: trade.investment.symbol,
            fee: 0,
          });
        }
        const invStats = feeByInvestmentMap.get(invKey)!;
        invStats.fee += feeToUse;
      }
    }

    const timeStats = Array.from(timeStatsMap.entries())
      .map(([date, data]) => ({
        date,
        totalFee: Number(data.totalFee.toFixed(2)),
        transactionCount: data.transactionCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const feeByInvestment = Array.from(feeByInvestmentMap.values())
      .map((inv) => ({
        investmentId: inv.investmentId,
        investmentName: inv.investmentName,
        investmentSymbol: inv.investmentSymbol,
        fee: Number(inv.fee.toFixed(2)),
      }))
      .sort((a, b) => b.fee - a.fee);

    const holdings = await this.deps.db.holding.findMany({
      where: {
        userId,
        ...(query.investmentId ? { investmentId: query.investmentId } : {}),
      },
      select: {
        unrealizedPnl: true,
      },
    });

    let totalReturns = 0;
    for (const holding of holdings) {
      const pnl = holding.unrealizedPnl ? safeNumber(holding.unrealizedPnl) : 0;
      totalReturns += pnl;
    }

    const feePercentageOfReturns =
      totalReturns > 0 ? (totalFee / totalReturns) * 100 : 0;

    return {
      timeStats,
      feeByInvestment,
      summary: {
        totalFee: Number(totalFee.toFixed(2)),
        averageFeePerTrade:
          trades.length > 0 ? Number((totalFee / trades.length).toFixed(2)) : 0,
        feePercentageOfReturns: Number(feePercentageOfReturns.toFixed(2)),
      },
    };
  }

  async getInvestmentContributionsDetailed(
    userId: string,
    query: IInvestmentContributionsDetailedQueryDto,
  ): Promise<InvestmentContributionsDetailedResponse> {
    const baseCurrencyId = await this.getUserBaseCurrencyId(userId);
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const contributions = await this.deps.db.investmentContribution.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(query.investmentId ? { investmentId: query.investmentId } : {}),
        ...(dateFrom || dateTo
          ? {
              timestamp: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      select: {
        timestamp: true,
        type: true,
        amount: true,
        amountInBaseCurrency: true,
        currencyId: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const statsMap = new Map<
      string,
      { deposits: number; withdrawals: number }
    >();

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    for (const contribution of contributions) {
      const amount = safeNumber(contribution.amount);
      const amountInBase = contribution.amountInBaseCurrency
        ? safeNumber(contribution.amountInBaseCurrency)
        : null;

      let amountToUse = amount;
      if (contribution.currencyId !== baseCurrencyId) {
        if (amountInBase !== null) {
          amountToUse = amountInBase;
        } else {
          const contributionCurrency = await this.deps.db.currency.findUnique({
            where: { id: contribution.currencyId },
            select: { code: true },
          });
          const baseCurrency = await this.deps.db.currency.findUnique({
            where: { id: baseCurrencyId },
            select: { code: true },
          });
          if (contributionCurrency && baseCurrency) {
            const rate = await this.getExchangeRate(
              contributionCurrency.code,
              baseCurrency.code,
            );
            amountToUse = amount * rate;
          }
        }
      }

      const date = new Date(contribution.timestamp);
      let dateKey: string;
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!statsMap.has(dateKey)) {
        statsMap.set(dateKey, { deposits: 0, withdrawals: 0 });
      }

      const stats = statsMap.get(dateKey)!;
      if (contribution.type === 'deposit') {
        stats.deposits += amountToUse;
        totalDeposits += amountToUse;
      } else {
        stats.withdrawals += amountToUse;
        totalWithdrawals += amountToUse;
      }
    }

    let runningCumulative = 0;
    const stats = Array.from(statsMap.entries())
      .map(([date, data]) => {
        runningCumulative += data.deposits - data.withdrawals;
        return {
          date,
          deposits: Number(data.deposits.toFixed(2)),
          withdrawals: Number(data.withdrawals.toFixed(2)),
          net: Number((data.deposits - data.withdrawals).toFixed(2)),
          cumulative: Number(runningCumulative.toFixed(2)),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      stats,
      summary: {
        totalDeposits: Number(totalDeposits.toFixed(2)),
        totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
        netContributions: Number((totalDeposits - totalWithdrawals).toFixed(2)),
      },
    };
  }

  async getDebtStatistics(
    userId: string,
    query: IDebtStatisticsQueryDto,
  ): Promise<DebtStatisticsResponse> {
    const groupBy = query.groupBy || 'month';

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    const transactions = await this.deps.db.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: {
          in: [TransactionType.loan_given, TransactionType.loan_received],
        },
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      select: {
        id: true,
        type: true,
        amount: true,
        currencyId: true,
        date: true,
        entityId: true,
        accountId: true,
        note: true,
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const entityDebtsMap = new Map<
      string,
      {
        entityId: string;
        entityName: string;
        totalLoanGiven: number;
        totalLoanReceived: number;
        currencyId: string;
        currency: {
          id: string;
          code: string;
          name: string;
          symbol: string | null;
        };
        transactionCount: number;
      }
    >();

    const timeSeriesMap = new Map<
      string,
      {
        totalLoanGiven: number;
        totalLoanReceived: number;
        transactionCount: number;
      }
    >();

    let totalLoanGiven = 0;
    let totalLoanReceived = 0;

    for (const transaction of transactions) {
      const amount = safeNumber(transaction.amount);
      const currency = transaction.currency;

      if (transaction.type === TransactionType.loan_given) {
        totalLoanGiven += amount;
      } else {
        totalLoanReceived += amount;
      }

      if (transaction.entityId && transaction.entity) {
        const entityKey = transaction.entityId;
        if (!entityDebtsMap.has(entityKey)) {
          entityDebtsMap.set(entityKey, {
            entityId: transaction.entity.id,
            entityName: transaction.entity.name,
            totalLoanGiven: 0,
            totalLoanReceived: 0,
            currencyId: currency.id,
            currency: {
              id: currency.id,
              code: currency.code,
              name: currency.name,
              symbol: currency.symbol,
            },
            transactionCount: 0,
          });
        }

        const entityDebt = entityDebtsMap.get(entityKey)!;
        entityDebt.transactionCount++;
        if (transaction.type === TransactionType.loan_given) {
          entityDebt.totalLoanGiven += amount;
        } else {
          entityDebt.totalLoanReceived += amount;
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
      } else if (groupBy === 'year') {
        dateKey = String(date.getFullYear());
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeSeriesMap.has(dateKey)) {
        timeSeriesMap.set(dateKey, {
          totalLoanGiven: 0,
          totalLoanReceived: 0,
          transactionCount: 0,
        });
      }

      const timeStats = timeSeriesMap.get(dateKey)!;
      timeStats.transactionCount++;
      if (transaction.type === TransactionType.loan_given) {
        timeStats.totalLoanGiven += amount;
      } else {
        timeStats.totalLoanReceived += amount;
      }
    }

    const entityDebts = Array.from(entityDebtsMap.values()).map((debt) => ({
      entityId: debt.entityId,
      entityName: debt.entityName,
      totalLoanGiven: Number(debt.totalLoanGiven.toFixed(2)),
      totalLoanReceived: Number(debt.totalLoanReceived.toFixed(2)),
      netDebt: Number(
        (debt.totalLoanGiven - debt.totalLoanReceived).toFixed(2),
      ),
      currencyId: debt.currencyId,
      currency: debt.currency,
      transactionCount: debt.transactionCount,
    }));

    const loanHistory = transactions.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString(),
      type: tx.type,
      amount: Number(safeNumber(tx.amount).toFixed(2)),
      currencyId: tx.currency.id,
      currency: {
        id: tx.currency.id,
        code: tx.currency.code,
        name: tx.currency.name,
        symbol: tx.currency.symbol,
      },
      entityId: tx.entityId || '',
      entityName: tx.entity?.name || '',
      accountId: tx.accountId,
      accountName: tx.account?.name || '',
      note: tx.note,
    }));

    let cumulativeNetDebt = 0;
    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => {
        const netDebt = data.totalLoanGiven - data.totalLoanReceived;
        cumulativeNetDebt += netDebt;
        return {
          date,
          totalLoanGiven: Number(data.totalLoanGiven.toFixed(2)),
          totalLoanReceived: Number(data.totalLoanReceived.toFixed(2)),
          netDebt: Number(netDebt.toFixed(2)),
          cumulativeNetDebt: Number(cumulativeNetDebt.toFixed(2)),
          transactionCount: data.transactionCount,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const netDebt = totalLoanGiven - totalLoanReceived;

    return {
      entityDebts,
      loanHistory,
      timeSeries,
      summary: {
        totalLoanGiven: Number(totalLoanGiven.toFixed(2)),
        totalLoanReceived: Number(totalLoanReceived.toFixed(2)),
        netDebt: Number(netDebt.toFixed(2)),
        totalTransactions: transactions.length,
        entityCount: entityDebts.length,
      },
    };
  }

  private async getExchangeRate(
    fromCode: string,
    toCode: string,
  ): Promise<number> {
    if (fromCode === toCode) return 1;

    try {
      return await this.deps.exchangeRateService.getRate(fromCode, toCode);
    } catch (error) {
      logger.error('Failed to get exchange rate', { error });
      return 1;
    }
  }
}

export const reportService = new ReportService();
