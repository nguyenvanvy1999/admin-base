import { Decimal } from 'decimal.js';

export const DECIMAL_FIXTURES = {
  // Test amounts for toBaseUnits/fromBaseUnits
  AMOUNTS: [
    { human: '0', base: '0', decimals: 2 },
    { human: '1', base: '100', decimals: 2 },
    { human: '123.45', base: '12345', decimals: 2 },
    { human: '0.01', base: '1', decimals: 2 },
    { human: '999999.99', base: '99999999', decimals: 2 },
    { human: '123456789.123456789', base: '123456789123456789', decimals: 9 },
  ],

  // Test amounts for multiplication
  MULTIPLICATION: [
    { a: '123.45', b: '2.5', result: '308.63', decimals: 2 },
    { a: '0', b: '123.45', result: '0.00', decimals: 2 },
    { a: '1', b: '123.45', result: '123.45', decimals: 2 },
    { a: '999999.99', b: '999999.99', result: '999999980000.00', decimals: 2 },
    { a: '123.456', b: '2.5', result: '308.6400', decimals: 4 },
  ],

  // Invalid amounts that should throw errors
  INVALID_AMOUNTS: [
    { amount: '-123.45', decimals: 2, error: 'Invalid amount' },
    {
      amount: '123.456',
      decimals: 2,
      error: 'Amount must align with decimals',
    },
    { amount: 'Infinity', decimals: 2, error: 'Invalid amount' },
    { amount: 'NaN', decimals: 2, error: 'Invalid amount' },
  ],

  // Decimal instances for testing
  DECIMAL_INSTANCES: [
    new Decimal('123.45'),
    new Decimal('0'),
    new Decimal('999999.99'),
    new Decimal('0.01'),
  ],
} as const;
