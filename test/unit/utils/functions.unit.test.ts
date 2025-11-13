import { describe, expect, it } from 'bun:test';
import { ArrayUtil, IdUtil, TimeUtil } from 'src/share/utils';
import { DB_PREFIX } from 'src/share/utils/id.util';

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
        const prefix = DB_PREFIX.USER;
        const id = IdUtil.dbId(prefix);
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

  describe('Date Utilities', () => {
    describe('isExpired', () => {
      it('should return true for past dates', () => {
        const pastDate = new Date(Date.now() - 86400000);
        expect(TimeUtil.isExpired(pastDate)).toBe(true);
      });
      it('should return true for past timestamps', () => {
        const pastTimestamp = Date.now() - 86400000;
        expect(TimeUtil.isExpired(pastTimestamp)).toBe(true);
      });
      it('should return false for future dates', () => {
        const futureDate = new Date(Date.now() + 86400000);
        expect(TimeUtil.isExpired(futureDate)).toBe(false);
      });
      it('should return false for future timestamps', () => {
        const futureTimestamp = Date.now() + 86400000;
        expect(TimeUtil.isExpired(futureTimestamp)).toBe(false);
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
