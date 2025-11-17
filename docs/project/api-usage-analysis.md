# Phân tích API Usage - Frontend vs Backend

## 📊 Tổng quan

Document này phân tích các API endpoints trong Backend và so sánh với việc sử dụng thực tế ở Frontend để xác định các API không được sử dụng.

## 🔍 Phương pháp phân tích

1. Scan tất cả service methods trong Frontend (`client/services/*.ts`)
2. So sánh với các endpoints trong Backend (`src/controllers/*.ts`)
3. Xác định các API không được gọi từ FE

## 📋 Chi tiết phân tích theo module

### 1. Category Module

#### Backend Endpoints
```typescript
GET    /api/categories          ✅ USED
GET    /api/categories/:id      ❌ NOT USED
POST   /api/categories          ✅ USED
PUT    /api/categories/:id      ✅ USED (via upsert)
POST   /api/categories/delete-many  ✅ USED
```

#### Frontend Service
```typescript
class CategoryService {
  listCategories()      // ✅ Calls GET /api/categories
  createCategory()      // ✅ Calls POST /api/categories
  updateCategory()      // ✅ Calls POST /api/categories (upsert)
  deleteManyCategories() // ✅ Calls POST /api/categories/delete-many
  
  // ❌ NO METHOD for GET /api/categories/:id
}
```

**Kết luận**: `GET /api/categories/:id` không được sử dụng

**Lý do**: 
- FE chỉ cần list categories dạng tree
- Không có trang detail cho category
- Update form lấy data từ list, không cần fetch riêng

**Khuyến nghị**: ❌ **XÓA** endpoint này

---

### 2. Account Module

#### Backend Endpoints
```typescript
GET    /api/accounts           ✅ USED
GET    /api/accounts/:id       ❌ NOT USED
POST   /api/accounts           ✅ USED
POST   /api/accounts/delete-many  ✅ USED
```

#### Frontend Service
```typescript
class AccountService {
  listAccounts()        // ✅ Calls GET /api/accounts
  createAccount()       // ✅ Calls POST /api/accounts
  updateAccount()       // ✅ Calls POST /api/accounts
  deleteManyAccounts()  // ✅ Calls POST /api/accounts/delete-many
  
  // ❌ NO METHOD for GET /api/accounts/:id
}
```

**Kết luận**: `GET /api/accounts/:id` không được sử dụng

**Lý do**:
- FE chỉ cần list accounts với pagination
- Update form lấy data từ list
- Không có trang detail riêng

**Khuyến nghị**: ❌ **XÓA** endpoint này

---

### 3. Tag Module

#### Backend Endpoints
```typescript
GET    /api/tags               ✅ USED
GET    /api/tags/:id           ❌ NOT USED
POST   /api/tags               ✅ USED
PATCH  /api/tags/:id           ✅ USED
POST   /api/tags/delete-many   ✅ USED
```

#### Frontend Service
```typescript
class TagService {
  listTags()           // ✅ Calls GET /api/tags
  createTag()          // ✅ Calls POST /api/tags
  updateTag()          // ✅ Calls PATCH /api/tags/:id
  deleteManyTags()     // ✅ Calls POST /api/tags/delete-many
  
  // ❌ NO METHOD for GET /api/tags/:id
}
```

**Kết luận**: `GET /api/tags/:id` không được sử dụng

**Lý do**:
- Update sử dụng PATCH với full data
- Không cần fetch trước khi update
- List đã cung cấp đủ thông tin

**Khuyến nghị**: ❌ **XÓA** endpoint này

---

### 4. Entity Module

#### Backend Endpoints
```typescript
GET    /api/entities           ✅ USED
GET    /api/entities/:id       ❌ NOT USED
POST   /api/entities           ✅ USED
POST   /api/entities/delete-many  ✅ USED
```

#### Frontend Service
```typescript
class EntityService {
  listEntities()       // ✅ Calls GET /api/entities
  createEntity()       // ✅ Calls POST /api/entities
  updateEntity()       // ✅ Calls POST /api/entities
  deleteManyEntities() // ✅ Calls POST /api/entities/delete-many
  
  // ❌ NO METHOD for GET /api/entities/:id
}
```

**Kết luận**: `GET /api/entities/:id` không được sử dụng

**Lý do**:
- Pattern giống Account và Category
- Update form lấy data từ list

**Khuyến nghị**: ❌ **XÓA** endpoint này

---

### 5. Event Module

#### Backend Endpoints
```typescript
GET    /api/events             ✅ USED
GET    /api/events/:id         ✅ USED (có thể)
POST   /api/events             ✅ USED
POST   /api/events/delete-many ✅ USED
```

#### Frontend Service
```typescript
class EventService {
  listEvents()         // ✅ Calls GET /api/events
  getEvent()           // ✅ Calls GET /api/events/:id
  createEvent()        // ✅ Calls POST /api/events
  updateEvent()        // ✅ Calls POST /api/events
  deleteManyEvents()   // ✅ Calls POST /api/events/delete-many
}
```

**Kết luận**: `GET /api/events/:id` **ĐƯỢC SỬ DỤNG**

**Lý do**:
- Event có trang detail riêng
- Cần fetch full data khi xem chi tiết

**Khuyến nghị**: ✅ **GIỮ LẠI** endpoint này

---

### 6. Budget Module

#### Backend Endpoints
```typescript
GET    /api/budgets            ✅ USED
GET    /api/budgets/:id        ✅ USED
POST   /api/budgets            ✅ USED
POST   /api/budgets/delete-many  ✅ USED
GET    /api/budgets/:id/periods  ✅ USED
GET    /api/budgets/:id/periods/:periodId  ✅ USED
```

#### Frontend Service
```typescript
class BudgetService {
  listBudgets()        // ✅ Calls GET /api/budgets
  getBudget()          // ✅ Calls GET /api/budgets/:id
  createBudget()       // ✅ Calls POST /api/budgets
  updateBudget()       // ✅ Calls POST /api/budgets
  deleteManyBudgets()  // ✅ Calls POST /api/budgets/delete-many
  getBudgetPeriods()   // ✅ Calls GET /api/budgets/:id/periods
  getBudgetPeriodDetail() // ✅ Calls GET /api/budgets/:id/periods/:periodId
}
```

**Kết luận**: Tất cả endpoints **ĐƯỢC SỬ DỤNG**

**Lý do**:
- Budget có trang detail phức tạp
- Có nested resources (periods)

**Khuyến nghị**: ✅ **GIỮ LẠI** tất cả

---

### 7. Investment Module

#### Backend Endpoints
```typescript
GET    /api/investments        ✅ USED
GET    /api/investments/:id    ✅ USED
GET    /api/investments/:id/holdings  ✅ USED
POST   /api/investments        ✅ USED
POST   /api/investments/delete-many  ✅ USED

GET    /api/investments/:id/trades  ✅ USED
POST   /api/investments/:id/trades  ✅ USED
POST   /api/investments/:id/trades/delete-many  ✅ USED

GET    /api/investments/:id/contributions  ✅ USED
POST   /api/investments/:id/contributions  ✅ USED
POST   /api/investments/:id/contributions/delete-many  ✅ USED

GET    /api/investments/:id/valuations  ✅ USED
GET    /api/investments/:id/valuations/latest  ✅ USED
POST   /api/investments/:id/valuations  ✅ USED
POST   /api/investments/:id/valuations/delete-many  ✅ USED
```

#### Frontend Service
```typescript
class InvestmentService {
  listInvestments()            // ✅ Used
  getInvestment()              // ✅ Used
  getInvestmentPosition()      // ✅ Used
  createInvestment()           // ✅ Used
  updateInvestment()           // ✅ Used
  deleteManyInvestments()      // ✅ Used
  
  listTrades()                 // ✅ Used
  createTrade()                // ✅ Used
  deleteManyTrades()           // ✅ Used
  
  listContributions()          // ✅ Used
  createContribution()         // ✅ Used
  deleteManyContributions()    // ✅ Used
  
  listValuations()             // ✅ Used
  getLatestValuation()         // ✅ Used
  upsertValuation()            // ✅ Used
  deleteManyValuations()       // ✅ Used
}
```

**Kết luận**: Tất cả endpoints **ĐƯỢC SỬ DỤNG**

**Lý do**:
- Investment là module phức tạp nhất
- Có nhiều nested resources
- Có trang detail với nhiều tabs

**Khuyến nghị**: ✅ **GIỮ LẠI** tất cả

---

### 8. Transaction Module

#### Backend Endpoints
```typescript
GET    /api/transactions       ✅ USED
GET    /api/transactions/:id   ⚠️ CẦN KIỂM TRA
POST   /api/transactions       ✅ USED
PUT    /api/transactions/:id   ✅ USED
POST   /api/transactions/delete-many  ✅ USED
GET    /api/transactions/bulk  ✅ USED
```

#### Frontend Service
```typescript
class TransactionService {
  listTransactions()           // ✅ Used
  createTransaction()          // ✅ Used
  updateTransaction()          // ✅ Used
  deleteTransaction()          // ✅ Used
  deleteManyTransactions()     // ✅ Used
  getBulkTransactions()        // ✅ Used
  
  // ⚠️ NEED TO CHECK: GET /api/transactions/:id
}
```

**Kết luận**: Cần kiểm tra `GET /api/transactions/:id`

**Khuyến nghị**: ⚠️ **KIỂM TRA** xem có component nào gọi trực tiếp không

---

### 9. Currency Module

#### Backend Endpoints
```typescript
GET    /api/currencies         ✅ USED
```

#### Frontend Service
```typescript
class CurrencyService {
  listCurrencies()  // ✅ Calls GET /api/currencies
}
```

**Kết luận**: Tất cả endpoints **ĐƯỢC SỬ DỤNG**

**Khuyến nghị**: ✅ **GIỮ LẠI**

---

### 10. Report Module

#### Backend Endpoints
```typescript
GET    /api/reports/net-worth              ✅ USED
GET    /api/reports/income-expense         ✅ USED
GET    /api/reports/cash-flow              ✅ USED
GET    /api/reports/category-breakdown     ✅ USED
GET    /api/reports/account-balance        ✅ USED
GET    /api/reports/investment-performance ✅ USED
GET    /api/reports/investment-allocation  ✅ USED
GET    /api/reports/debt-summary           ✅ USED
GET    /api/reports/budget-vs-actual       ✅ USED
```

#### Frontend Service
```typescript
class ReportService {
  getNetWorth()                // ✅ Used
  getIncomeExpense()           // ✅ Used
  getCashFlow()                // ✅ Used
  getCategoryBreakdown()       // ✅ Used
  getAccountBalance()          // ✅ Used
  getInvestmentPerformance()   // ✅ Used
  getInvestmentAllocation()    // ✅ Used
  getDebtSummary()             // ✅ Used
  getBudgetVsActual()          // ✅ Used
}
```

**Kết luận**: Tất cả endpoints **ĐƯỢC SỬ DỤNG**

**Khuyến nghị**: ✅ **GIỮ LẠI** tất cả

---

## [object Object]ổng kết

### API cần XÓA (4 endpoints)

| Module | Endpoint | Lý do |
|--------|----------|-------|
| Category | `GET /api/categories/:id` | FE không có method gọi, update lấy data từ list |
| Account | `GET /api/accounts/:id` | FE không có method gọi, update lấy data từ list |
| Tag | `GET /api/tags/:id` | FE không có method gọi, update dùng PATCH với full data |
| Entity | `GET /api/entities/:id` | FE không có method gọi, update lấy data từ list |

### API cần KIỂM TRA (1 endpoint)

| Module | Endpoint | Lý do |
|--------|----------|-------|
| Transaction | `GET /api/transactions/:id` | Service không có method nhưng có thể component gọi trực tiếp |

### API GIỮ LẠI (tất cả còn lại)

- Event: Có trang detail
- Budget: Có trang detail và nested resources
- Investment: Module phức tạp với nhiều nested resources
- Report: Tất cả được sử dụng
- Currency: Được sử dụng

## 🎯 Action Items

### Immediate Actions

1. **Xóa 4 endpoints không dùng**:
   ```typescript
   // Xóa trong controllers:
   - src/controllers/category.controller.ts: GET /:id
   - src/controllers/account.controller.ts: GET /:id
   - src/controllers/tag.controller.ts: GET /:id
   - src/controllers/entity.controller.ts: GET /:id
   
   // Xóa trong services:
   - src/services/category.service.ts: getCategoryById()
   - src/services/account.service.ts: getAccount()
   - src/services/tag.service.ts: getTag()
   - src/services/entity.service.ts: getEntity()
   ```

2. **Kiểm tra Transaction endpoint**:
   ```bash
   # Search trong FE code
   grep -r "transactions/" client/
   grep -r "getTransaction" client/
   ```

### Documentation Updates

1. Update API documentation
2. Update Swagger/OpenAPI specs
3. Update changelog

### Testing

1. Run full test suite
2. Test FE functionality
3. Check for any broken links

## 📈 Impact Analysis

### Benefits

1. **Code Cleanup**:
   - Giảm ~200-300 lines code
   - Giảm 4 endpoints không cần maintain

2. **Performance**:
   - Không impact (các endpoint không được gọi)

3. **Maintenance**:
   - Ít code hơn để maintain
   - Swagger docs gọn hơn

### Risks

1. **Low Risk**: Các endpoint không được FE sử dụng
2. **Mitigation**: 
   - Giữ code trong git history
   - Có thể restore nếu cần
   - Test kỹ trước khi deploy

## 🔄 Migration Plan

### Phase 1: Deprecation (1 sprint)
- Thêm deprecation warning vào endpoints
- Monitor logs xem có request nào không
- Thông báo cho team

### Phase 2: Removal (1 sprint sau)
- Xóa endpoints
- Update documentation
- Deploy

---

**Document version**: 1.0  
**Last updated**: 2025-11-17  
**Status**: Ready for Review

