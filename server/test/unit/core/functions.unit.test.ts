import { describe, expect, it } from 'bun:test';
import { ArrayUtil, idUtil, isExpired, ValueUtil } from 'src/share';

describe('Functions Utils', () => {
  describe('Token Generation', () => {
    describe('token8', () => {
      it('should generate an 8-character token', () => {
        const token = idUtil.token8();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(8);
      });
      it('should generate token with prefix', () => {
        const prefix = 'TEST';
        const token = idUtil.token8(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 8);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(idUtil.token8());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token12', () => {
      it('should generate a 12-character token', () => {
        const token = idUtil.token12();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(12);
      });
      it('should generate token with prefix', () => {
        const prefix = 'USER';
        const token = idUtil.token12(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 12);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(idUtil.token12());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token16', () => {
      it('should generate a 16-character token', () => {
        const token = idUtil.token16();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(16);
      });
      it('should generate token with prefix', () => {
        const prefix = 'ORDER';
        const token = idUtil.token16(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 16);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(idUtil.token16());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('token32', () => {
      it('should generate a 32-character token', () => {
        const token = idUtil.token32();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(32);
      });
      it('should generate token with prefix', () => {
        const prefix = 'SESSION';
        const token = idUtil.token32(prefix);
        expect(token).toBeDefined();
        expect(token.startsWith(`${prefix}_`)).toBe(true);
        expect(token.length).toBe(prefix.length + 1 + 32);
      });
      it('should generate unique tokens', () => {
        const tokens = new Set();
        for (let i = 0; i < 100; i++) {
          tokens.add(idUtil.token32());
        }
        expect(tokens.size).toBe(100);
      });
    });
    describe('dbId', () => {
      it('should generate a 16-character ID', () => {
        const id = idUtil.dbId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(id.length).toBe(16);
      });
      it('should generate ID with DB prefix', () => {
        const prefix = 'user';
        const id = idUtil.dbId(prefix as any);
        expect(id).toBeDefined();
        expect(id.startsWith(`${prefix}_`)).toBe(true);
        expect(id.length).toBe(prefix.length + 1 + 16);
      });
      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(idUtil.dbId());
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
        expect(isExpired(pastDate)).toBe(true);
      });
      it('should return true for past timestamps', () => {
        const pastTimestamp = Date.now() - 86400000; // 1 day ago
        expect(isExpired(pastTimestamp)).toBe(true);
      });
      it('should return false for future dates', () => {
        const futureDate = new Date(Date.now() + 86400000); // 1 day from now
        expect(isExpired(futureDate)).toBe(false);
      });
      it('should return false for future timestamps', () => {
        const futureTimestamp = Date.now() + 86400000; // 1 day from now
        expect(isExpired(futureTimestamp)).toBe(false);
      });
    });
  });

  describe('Snowflake ID Generation', () => {
    describe('snowflakeId', () => {
      it('should generate a bigint ID', () => {
        const id = idUtil.snowflakeId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('bigint');
        expect(id > 0n).toBe(true);
      });
      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(idUtil.snowflakeId().toString());
        }
        expect(ids.size).toBe(100);
      });
      it('should generate increasing IDs', () => {
        const id1 = idUtil.snowflakeId();
        const id2 = idUtil.snowflakeId();
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
});
