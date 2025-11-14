import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import Decimal from 'decimal.js';
import {
  type ExchangeRateService,
  exchangeRateService,
} from './exchange-rate.service';
import { CURRENCY_SELECT_BASIC } from './selects';

export class CurrencyConversionService {
  constructor(
    private readonly deps: {
      db: IDb;
      exchangeRateService: ExchangeRateService;
    } = {
      db: prisma,
      exchangeRateService: exchangeRateService,
    },
  ) {}

  async convertCurrency(
    amount: Decimal | number,
    fromCurrencyId: string,
    toCurrencyId: string,
  ): Promise<Decimal> {
    if (!fromCurrencyId || !toCurrencyId) {
      throwAppError(
        ErrorCode.VALIDATION_ERROR,
        'Currency IDs are required for conversion',
      );
    }

    if (fromCurrencyId === toCurrencyId) {
      return new Decimal(amount);
    }

    const fromCurrency = await this.deps.db.currency.findUnique({
      where: { id: fromCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });
    const toCurrency = await this.deps.db.currency.findUnique({
      where: { id: toCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });

    if (!fromCurrency || !toCurrency) {
      throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
    }

    try {
      const rate = await this.deps.exchangeRateService.getRateDecimal(
        fromCurrency.code,
        toCurrency.code,
      );
      return new Decimal(amount).mul(rate);
    } catch (error) {
      throwAppError(
        ErrorCode.EXCHANGE_RATE_ERROR,
        `Currency conversion failed: ${fromCurrency.code} to ${toCurrency.code}. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async convertToAccountCurrency(
    amount: Decimal | number,
    fee: Decimal | number,
    currencyId: string,
    accountCurrencyId: string,
  ): Promise<{
    amountInAccountCurrency: Decimal;
    feeInAccountCurrency: Decimal;
  }> {
    const amountDecimal = new Decimal(amount);
    const feeDecimal = new Decimal(fee);

    let amountInAccountCurrency = amountDecimal;
    if (currencyId !== accountCurrencyId) {
      amountInAccountCurrency = await this.convertCurrency(
        amountDecimal,
        currencyId,
        accountCurrencyId,
      );
    }

    let feeInAccountCurrency = feeDecimal;
    if (currencyId !== accountCurrencyId) {
      feeInAccountCurrency = await this.convertCurrency(
        feeDecimal,
        currencyId,
        accountCurrencyId,
      );
    }

    return { amountInAccountCurrency, feeInAccountCurrency };
  }

  async convertToToAccountCurrency(
    amount: Decimal | number,
    currencyId: string,
    toAccountCurrencyId?: string,
  ): Promise<Decimal> {
    if (!toAccountCurrencyId || currencyId === toAccountCurrencyId) {
      return new Decimal(amount);
    }
    return await this.convertCurrency(amount, currencyId, toAccountCurrencyId);
  }

  async convertToBaseCurrency(
    amount: Decimal | number,
    currencyId: string,
    baseCurrencyId: string,
  ): Promise<Decimal> {
    if (!baseCurrencyId) {
      throwAppError(ErrorCode.VALIDATION_ERROR, 'Base currency ID is required');
    }
    if (currencyId === baseCurrencyId) {
      return new Decimal(amount);
    }
    return await this.convertCurrency(amount, currencyId, baseCurrencyId);
  }
}

export const currencyConversionService = new CurrencyConversionService();
