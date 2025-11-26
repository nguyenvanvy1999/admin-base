import { Decimal } from 'decimal.js';
import { BadReqErr, ErrCode } from 'src/share';

export class AmountValidator {
  static validatePositive(
    amount: number | Decimal,
    errorMessage = 'Amount must be positive',
  ): Decimal {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.isNegative() || decimalAmount.isZero()) {
      throw new BadReqErr(ErrCode.InvalidAmount, {
        errors: errorMessage,
      });
    }

    return decimalAmount;
  }

  static validateSufficientBalance(
    balance: Decimal,
    required: Decimal,
    errorMessage = 'Insufficient funds',
  ): void {
    if (balance.lessThan(required)) {
      throw new BadReqErr(ErrCode.InvalidAmount, {
        errors: errorMessage,
      });
    }
  }

  static validateNotSameAccount(
    accountId1: string,
    accountId2: string,
    errorMessage = 'From and To accounts cannot be the same',
  ): void {
    if (accountId1 === accountId2) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: errorMessage,
      });
    }
  }
}
