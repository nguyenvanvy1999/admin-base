export const ENCRYPTION_FIXTURES = {
  STRINGS: [
    'Hello World',
    '',
    'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
    'Unicode: 世界 🌍',
    'Numbers: 1234567890',
    'Mixed: Hello123!@#',
  ],

  // Test objects
  OBJECTS: [
    { name: 'Test', value: 123 },
    { nested: { data: [1, 2, 3], flag: true } },
    { empty: {} },
    { array: [1, 2, 3, 4, 5] },
    { complex: { a: { b: { c: 'deep' } } } },
  ],

  // Test arrays
  ARRAYS: [
    [1, 2, 3, 4, 5],
    ['a', 'b', 'c'],
    [{ id: 1 }, { id: 2 }],
    [],
    [null, null, 0, false, ''], // Note: undefined becomes null after JSON serialization
  ],

  // Large test data
  LARGE_OBJECT: {
    data: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: `item-${i}`,
      metadata: { created: new Date().toISOString() },
    })),
    metadata: {
      total: 1000,
      created: new Date().toISOString(),
      version: '1.0.0',
    },
  },
} as const;
