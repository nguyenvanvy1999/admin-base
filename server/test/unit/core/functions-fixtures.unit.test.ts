import { describe, expect, it } from 'bun:test';
import { AmountUtil } from 'src/share';
import { DECIMAL_FIXTURES } from 'test/fixtures';

describe('Functions Utils - Extended Tests with Fixtures', () => {
  describe('Decimal Utilities - Fixture Tests', () => {
    describe('toBaseUnits with fixtures', () => {
      it('should convert all test amounts to base units', () => {
        DECIMAL_FIXTURES.AMOUNTS.forEach(({ human, base, decimals }) => {
          const result = AmountUtil.toBaseUnits(human, decimals);
          expect(result.toString()).toBe(base);
        });
      });
      it('should convert Decimal instances to base units', () => {
        DECIMAL_FIXTURES.DECIMAL_INSTANCES.forEach((decimal) => {
          const result = AmountUtil.toBaseUnits(decimal, 2);
          expect(result.toString()).toBe(decimal.mul(100).toString());
        });
      });
    });
    describe('fromBaseUnits with fixtures', () => {
      it('should convert all test base units to human amounts', () => {
        DECIMAL_FIXTURES.AMOUNTS.forEach(({ human, base, decimals }) => {
          const result = AmountUtil.fromBaseUnits(base, decimals);
          expect(result).toBe(human);
        });
      });
      it('should convert Decimal base units to human amounts', () => {
        DECIMAL_FIXTURES.DECIMAL_INSTANCES.forEach((decimal) => {
          const baseUnits = decimal.mul(100);
          const result = AmountUtil.fromBaseUnits(baseUnits, 2);
          expect(result).toBe(decimal.toString());
        });
      });
    });
    describe('multiplyHuman with fixtures', () => {
      it('should multiply all test amounts correctly', () => {
        DECIMAL_FIXTURES.MULTIPLICATION.forEach(
          ({ a, b, result, decimals }) => {
            const actualResult = AmountUtil.multiplyHuman(a, b, decimals);
            expect(actualResult).toBe(result);
          },
        );
      });
    });
    describe('Error handling with invalid fixtures', () => {
      it('should throw appropriate errors for invalid amounts', () => {
        DECIMAL_FIXTURES.INVALID_AMOUNTS.forEach(
          ({ amount, decimals, error }) => {
            expect(() => {
              AmountUtil.toBaseUnits(amount, decimals);
            }).toThrow(error);
          },
        );
      });
    });
  });
});
