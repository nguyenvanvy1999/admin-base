# Repository Layer

This directory contains repository classes that extract database queries from services, improving testability and maintainability.

## Query Optimization Notes

### Current Optimizations
- Services use `Promise.all` for parallel queries
- Proper `select` statements to fetch only needed fields
- Repository layer extracts queries for better testability

### Recommended Database Indexes
Based on common query patterns, ensure these indexes exist:

1. **Account**
   - `userId` (already indexed)
   - `userId, currencyId` (composite for filtering)
   - `userId, type` (composite for filtering)

2. **Transaction**
   - `userId, date` (composite for date range queries)
   - `userId, type` (composite for type filtering)
   - `userId, accountId` (composite for account filtering)
   - `transferGroupId` (for transfer mirror lookups)
   - `userId, entityId` (for debt calculations)

3. **Category**
   - `userId, type` (composite for filtering)
   - `parentId` (for tree queries)

4. **Entity**
   - `userId, type` (composite for filtering)

### N+1 Query Prevention
- All list queries use proper `include`/`select` to fetch related data in single queries
- Currency lookups are batched using `findMany` with `in` clause
- No loops with database queries inside

