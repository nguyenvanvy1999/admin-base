import { prisma } from '@server/libs/db';
import Decimal from 'decimal.js';
import { CURRENCY_SELECT_BASIC } from './selects';

export class CurrencyConversionService {
  private exchangeRates: Record<string, Record<string, Decimal>> = {
    VND: { USD: new Decimal(1).div(25000) },
    USD: { VND: new Decimal(25000) },
  };

  async convertCurrency(
    amount: Decimal | number,
    fromCurrencyId: string,
    toCurrencyId: string,
  ): Promise<Decimal> {
    if (fromCurrencyId === toCurrencyId) {
      return new Decimal(amount);
    }

    const fromCurrency = await prisma.currency.findUnique({
      where: { id: fromCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });
    const toCurrency = await prisma.currency.findUnique({
      where: { id: toCurrencyId },
      select: CURRENCY_SELECT_BASIC,
    });

    if (!fromCurrency || !toCurrency) {
      throw new Error('Currency not found');
    }

    const rate = this.exchangeRates[fromCurrency.code]?.[toCurrency.code];
    if (!rate) {
      throw new Error(
        `Currency conversion not supported: ${fromCurrency.code} to ${toCurrency.code}`,
      );
    }

    return new Decimal(amount).mul(rate);
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
    if (currencyId === baseCurrencyId) {
      return new Decimal(amount);
    }
    return await this.convertCurrency(amount, currencyId, baseCurrencyId);
  }
}

export const currencyConversionServiceInstance =
  new CurrencyConversionService();
