import { Decimal } from 'decimal.js';

export class AmountUtil {
  static toBaseUnits(
    human: Decimal | string | number,
    decimals: number,
  ): Decimal {
    const d = new Decimal(human);
    if (d.isNegative() || !d.isFinite()) throw new Error('Invalid amount');
    const scaled = d.mul(new Decimal(10).pow(decimals));
    if (!scaled.isInteger()) throw new Error('Amount must align with decimals');
    return scaled;
  }

  static fromBaseUnits(
    base: Decimal | string | number,
    decimals: number,
  ): string {
    const d = new Decimal(base);
    const scaled = d.div(new Decimal(10).pow(decimals));
    return scaled
      .toFixed(decimals)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?)0+$/, '$1');
  }

  static multiplyHuman(
    a: Decimal | string | number,
    b: Decimal | string | number,
    outputDecimals: number,
  ): string {
    const da = new Decimal(a);
    const db = new Decimal(b);
    const product = da.mul(db);
    return product.toFixed(outputDecimals);
  }
}
