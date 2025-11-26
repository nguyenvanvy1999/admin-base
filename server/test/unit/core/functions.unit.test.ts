import { describe, expect, it } from 'bun:test';
import { Decimal } from 'decimal.js';
import { AmountUtil, ArrayUtil, IdUtil, TimeUtil, ValueUtil } from 'src/share';

describe('Functions Utils', () => {
  describe('Token Generation', () => {
    describe('token8', () => {
      it('should generate an 8-character token', () => {
        const token = IdUtil.token8();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(8);
      });
      it('should generate token with prefix', () => {
        const prefix = 'TEST';
        const token = IdUtil.token8(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 8);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(IdUtil.token8());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token12', () => {
      it('should generate a 12-character token', () => {
        const token = IdUtil.token12();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(12);
      });
      it('should generate token with prefix', () => {
        const prefix = 'USER';
        const token = IdUtil.token12(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 12);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(IdUtil.token12());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token16', () => {
      it('should generate a 16-character token', () => {
        const token = IdUtil.token16();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(16);
      });
      it('should generate token with prefix', () => {
        const prefix = 'ORDER';
        const token = IdUtil.token16(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 16);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(IdUtil.token16());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token32', () => {
      it('should generate a 32-character token', () => {
        const token = IdUtil.token32();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(32);
      });
      it('should generate token with prefix', () => {
        const prefix = 'SESSION';
        const token = IdUtil.token32(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 32);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(IdUtil.token32());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('dbId', () => {
      it('should generate a 16-character ID', () => {
        const id = IdUtil.dbId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBe(16);
      });
      it('should generate ID with DB prefix', () => {
        const prefix = 'user';
        const id = IdUtil.dbId(prefix as any);
        expect(id).toBeDefined();
        expect(id.startsWith(`${prefix}_`)).toBe(true);
        expect(id.length).toBe(prefix.length + 1 + 16);
      });
      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(IdUtil.dbId());
        }
        expect(ids.size).toBe(100);
      });
    });
  });

  describe('Type Guards', () => {
    describe('isNil', () => {
      it('should return true for null', () => {
        expect(ValueUtil.isNil(null)).toBe(true);
      });
      it('should return true for undefined', () => {
        expect(ValueUtil.isNil(undefined)).toBe(true);
      });
      it('should return false for other values', () => {
        expect(ValueUtil.isNil(0)).toBe(false);
        expect(ValueUtil.isNil('')).toBe(false);
        expect(ValueUtil.isNil(false)).toBe(false);
        expect(ValueUtil.isNil([])).toBe(false);
        expect(ValueUtil.isNil({})).toBe(false);
        expect(ValueUtil.isNil('hello')).toBe(false);
        expect(ValueUtil.isNil(42)).toBe(false);
      });
    });
    describe('notNil', () => {
      it('should return false for null', () => {
        expect(ValueUtil.notNil(null)).toBe(false);
      });
      it('should return false for undefined', () => {
        expect(ValueUtil.notNil(undefined)).toBe(false);
      });
      it('should return true for other values', () => {
        expect(ValueUtil.notNil(0)).toBe(true);
        expect(ValueUtil.notNil('')).toBe(true);
        expect(ValueUtil.notNil(false)).toBe(true);
        expect(ValueUtil.notNil([])).toBe(true);
        expect(ValueUtil.notNil({})).toBe(true);
        expect(ValueUtil.notNil('hello')).toBe(true);
        expect(ValueUtil.notNil(42)).toBe(true);
      });
    });
  });

  describe('Date Utilities', () => {
    describe('isExpired', () => {
      it('should return true for past dates', () => {
        const pastDate = new Date(Date.now() - 86400000); // 1 day ago
        expect(TimeUtil.isExpired(pastDate)).toBe(true);
      });
      it('should return true for past timestamps', () => {
        const pastTimestamp = Date.now() - 86400000; // 1 day ago
        expect(TimeUtil.isExpired(pastTimestamp)).toBe(true);
      });
      it('should return false for future dates', () => {
        const futureDate = new Date(Date.now() + 86400000); // 1 day from now
        expect(TimeUtil.isExpired(futureDate)).toBe(false);
      });
      it('should return false for future timestamps', () => {
        const futureTimestamp = Date.now() + 86400000; // 1 day from now
        expect(TimeUtil.isExpired(futureTimestamp)).toBe(false);
      });
    });
  });

  describe('Snowflake ID Generation', () => {
    describe('snowflakeId', () => {
      it('should generate a bigint ID', () => {
        const id = IdUtil.snowflakeId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('bigint');
        expect(id > 0n).toBe(true);
      });
      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(IdUtil.snowflakeId().toString());
        }
        expect(ids.size).toBe(100);
      });
      it('should generate increasing IDs', () => {
        const id1 = IdUtil.snowflakeId();
        const id2 = IdUtil.snowflakeId();
        expect(id2 > id1).toBe(true);
      });
    });
  });

  describe('Array Utilities', () => {
    describe('uniq', () => {
      it('should remove duplicates from array of primitives', () => {
        const input = [1, 2, 2, 3, 3, 3, 4];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual([1, 2, 3, 4]);
      });
      it('should remove duplicates from array of strings', () => {
        const input = ['a', 'b', 'b', 'c', 'c', 'c', 'd'];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual(['a', 'b', 'c', 'd']);
      });
      it('should handle empty array', () => {
        const input: number[] = [];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual([]);
      });
      it('should handle array with no duplicates', () => {
        const input = [1, 2, 3, 4, 5];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual([1, 2, 3, 4, 5]);
      });
      it('should handle array with all same elements', () => {
        const input = [1, 1, 1, 1, 1];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual([1]);
      });
      it('should preserve order of first occurrence', () => {
        const input = [3, 1, 2, 1, 3, 2, 1];
        const result = ArrayUtil.uniq(input);
        expect(result).toEqual([3, 1, 2]);
      });
    });
  });

  describe('Decimal Utilities', () => {
    describe('toBaseUnits', () => {
      it('should convert human amount to base units', () => {
        const result = AmountUtil.toBaseUnits('123.45', 2);
        expect(result.toString()).toBe('12345');
      });
      it('should convert Decimal to base units', () => {
        const decimal = new Decimal('123.45');
        const result = AmountUtil.toBaseUnits(decimal, 2);
        expect(result.toString()).toBe('12345');
      });
      it('should convert number to base units', () => {
        const result = AmountUtil.toBaseUnits(123.45, 2);
        expect(result.toString()).toBe('12345');
      });
      it('should handle zero amount', () => {
        const result = AmountUtil.toBaseUnits('0', 2);
        expect(result.toString()).toBe('0');
      });
      it('should handle large decimals', () => {
        const result = AmountUtil.toBaseUnits('123456789.123456789', 9);
        expect(result.toString()).toBe('123456789123456789');
      });
      it('should throw error for negative amount', () => {
        expect(() => {
          AmountUtil.toBaseUnits('-123.45', 2);
        }).toThrow('Invalid amount');
      });
      it('should throw error for non-finite amount', () => {
        expect(() => {
          AmountUtil.toBaseUnits(Infinity, 2);
        }).toThrow('Invalid amount');
      });
      it('should throw error for non-integer result', () => {
        expect(() => {
          AmountUtil.toBaseUnits('123.456', 2);
        }).toThrow('Amount must align with decimals');
      });
    });
    describe('fromBaseUnits', () => {
      it('should convert base units to human amount', () => {
        const result = AmountUtil.fromBaseUnits('12345', 2);
        expect(result).toBe('123.45');
      });
      it('should convert Decimal base units to human amount', () => {
        const decimal = new Decimal('12345');
        const result = AmountUtil.fromBaseUnits(decimal, 2);
        expect(result).toBe('123.45');
      });
      it('should convert number base units to human amount', () => {
        const result = AmountUtil.fromBaseUnits(12345, 2);
        expect(result).toBe('123.45');
      });
      it('should handle zero base units', () => {
        const result = AmountUtil.fromBaseUnits('0', 2);
        expect(result).toBe('0');
      });
      it('should handle large base units', () => {
        const result = AmountUtil.fromBaseUnits('123456789123456789', 9);
        expect(result).toBe('123456789.123456789');
      });
      it('should remove trailing zeros', () => {
        const result = AmountUtil.fromBaseUnits('12300', 2);
        expect(result).toBe('123');
      });
      it('should handle single decimal place', () => {
        const result = AmountUtil.fromBaseUnits('12340', 2);
        expect(result).toBe('123.4');
      });
    });
    describe('multiplyHuman', () => {
      it('should multiply two human amounts', () => {
        const result = AmountUtil.multiplyHuman('123.45', '2.5', 2);
        expect(result).toBe('308.63');
      });
      it('should multiply Decimal amounts', () => {
        const a = new Decimal('123.45');
        const b = new Decimal('2.5');
        const result = AmountUtil.multiplyHuman(a, b, 2);
        expect(result).toBe('308.63');
      });
      it('should multiply number amounts', () => {
        const result = AmountUtil.multiplyHuman(123.45, 2.5, 2);
        expect(result).toBe('308.63');
      });
      it('should handle zero multiplication', () => {
        const result = AmountUtil.multiplyHuman('123.45', '0', 2);
        expect(result).toBe('0.00');
      });
      it('should handle one multiplication', () => {
        const result = AmountUtil.multiplyHuman('123.45', '1', 2);
        expect(result).toBe('123.45');
      });
      it('should handle large numbers', () => {
        const result = AmountUtil.multiplyHuman('999999.99', '999999.99', 2);
        expect(result).toBe('999999980000.00');
      });
      it('should respect output decimals', () => {
        const result = AmountUtil.multiplyHuman('123.456', '2.5', 4);
        expect(result).toBe('308.6400');
      });
    });
  });
});
