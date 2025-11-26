# Báo Cáo Rà Soát và Đánh Giá Prisma Schema

**Ngày tạo**: 2025-01-XX  
**Mục tiêu**: Đánh giá schema Prisma để đảm bảo đáp ứng yêu cầu nghiệp vụ, typesafe, dễ mở rộng, chặt chẽ, đơn giản và hỗ trợ export.

---

## 1. Tổng Quan Schema Hiện Tại

### 1.1 Cấu Trúc Files
Schema hiện tại được chia thành **6 files riêng biệt**:
- `schema.prisma` - Generator và datasource config
- `auth.prisma` - Authentication & Authorization (9 models)
- `expense.prisma` - Ledger Core (12 models)
- `budget.prisma` - Budget Management (4 models)
- `goal.prisma` - Goal Management (2 models)
- `misc.prisma` - Miscellaneous (9 models)
- `enum.prisma` - Enum Definitions (15 enums)

**Tổng số**: 36 models + 15 enums

### 1.2 Models Hiện Có

#### System/Auth (9 models)
- `User`, `AuthProvider`, `UserAuthProvider`
- `Role`, `Permission`, `RolePermission`, `RolePlayer`
- `Session`, `Referral`

#### Reference Data (4 models)
- `Currency`, `Entity`, `Tag`, `Event`

#### Ledger Core (12 models)
- `LedgerCommodity`, `LedgerCommodityPrice`
- `LedgerAccount`
- `JournalEntry`, `Posting`
- `LedgerLot`
- `AccountRelation`
- `CashflowGroup`, `CashflowGroupAccount`
- `LedgerBalanceSnapshot`
- `LedgerRecurringTemplate`, `LedgerRecurringTemplateLine`
- `JournalEntryTag`

#### Planning (6 models)
- `Budget`, `BudgetLedgerScope`, `BudgetFundingScope`, `BudgetPeriodRecord`
- `Goal`, `GoalLedgerAccount`

#### System/Misc (5 models)
- `I18n`, `IPWhitelist`, `Setting`, `Proxy`, `AuditLog`

---

## 2. Đánh Giá Yêu Cầu Nghiệp vụ

### 2.1 ✅ Quản Lý Giao Dịch Thu Chi

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `JournalEntry` + `Posting` hỗ trợ đầy đủ double-entry accounting
- ✅ `JournalEntryType` enum có đủ: `operational`, `valuation`, `adjustment`, `opening`, `closing`
- ✅ `PostingDirection` (debit/credit) đúng với double-entry
- ✅ `JournalEntryStatus` hỗ trợ: `draft`, `posted`, `voided`, `locked`
- ✅ Mỗi `Posting` có `currencyId` riêng → hỗ trợ multi-currency transaction
- ✅ `JournalEntry` có `entityId` và `eventId` để nhóm giao dịch
- ✅ `JournalEntryTag` hỗ trợ tagging

**Vấn đề**:
- ⚠️ **Validation**: Schema không có constraint đảm bảo mỗi JournalEntry có ít nhất 2 Posting
- ⚠️ **Validation**: Schema không có constraint đảm bảo tổng debit = tổng credit (cần validate ở application layer)

**Khuyến nghị**:
- Thêm validation ở application layer hoặc database trigger
- Có thể thêm computed field hoặc view để kiểm tra balance

### 2.2 ✅ Đầu Tư

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerCommodity` hỗ trợ: `currency`, `security`, `property`, `liability`, `custom`
- ✅ `LedgerCommodityPrice` lưu lịch sử giá với `quotedAt`, `price`, `exchangeRate`
- ✅ `LedgerLot` tracking cost basis với `quantity`, `basisAmount`, `openedAt`, `closedAt`
- ✅ `Posting` có `commodityId` và `lotId` để ghi nhận mua/bán tài sản
- ✅ `Posting` có `quantity`, `unitPrice` cho investment transactions
- ✅ `Posting` có `fee` field

**Vấn đề**: Không có vấn đề nghiêm trọng

**Khuyến nghị**:
- Có thể thêm computed fields hoặc views để tính unrealized/realized P&L

### 2.3 ✅ Tài Sản

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerAccount` với `kind=asset` đủ để quản lý tài sản
- ✅ `LedgerAccount` hỗ trợ hierarchy với `parentId`, `path`, `depth`
- ✅ `LedgerBalanceSnapshot` hỗ trợ snapshot số dư theo thời gian
- ✅ `AccountRelation` hỗ trợ quan hệ giữa accounts: `cashflow`, `valuation`, `payoff`, `adjustment`
- ✅ `LedgerAccount` có `commodityId` và `currencyId` để định nghĩa loại tài sản

**Vấn đề**: Không có vấn đề nghiêm trọng

### 2.4 ✅ Đa Tiền Tệ

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `Currency` là bảng tham chiếu với `code`, `name`, `symbol`
- ✅ `LedgerCommodity` hỗ trợ `type=currency`
- ✅ Mỗi `Posting` có `currencyId` riêng
- ✅ `LedgerCommodityPrice` có `exchangeRate` và `priceInBaseCurrency`
- ✅ `User` có `baseCurrencyId` để quy đổi về currency cơ sở
- ✅ `LedgerLot` có `basisCurrencyId`

**Vấn đề**: Không có vấn đề nghiêm trọng

### 2.5 ✅ Budget

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `Budget` có `period` (daily/monthly/quarterly/yearly/none), `amount`, `carryOver`
- ✅ `BudgetLedgerScope` định nghĩa scope tài khoản chi tiêu
- ✅ `BudgetFundingScope` định nghĩa scope tài khoản nguồn vốn
- ✅ `BudgetPeriodRecord` tracking theo từng chu kỳ với `carriedOverAmount`
- ✅ `Budget` có `anchorAccountId` để lấy sub-tree mặc định

**Vấn đề**: Không có vấn đề nghiêm trọng

### 2.6 ✅ Goal

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `Goal` có `amount`, `currencyId`, `startDate`, `endDate`
- ✅ `GoalLedgerAccount` liên kết với ledger accounts để track progress
- ✅ Có thể tính progress dựa trên balance của các ledger accounts

**Vấn đề**: Không có vấn đề nghiêm trọng

### 2.7 ⚠️ Vay Nợ (Loan/Debt)

**Trạng thái**: ⚠️ **THIẾU MỘT PHẦN**

**Phân tích**:
- ✅ `Entity` quản lý đối tác vay nợ (individual/organization)
- ✅ `JournalEntry` có `entityId` để ghi nhận giao dịch vay/trả nợ
- ✅ `LedgerAccount` với `kind=liability` để quản lý nợ phải trả
- ⚠️ **THIẾU**: Không có model riêng cho `Loan` để lưu:
  - Principal amount (số tiền vay gốc)
  - Interest rate (lãi suất)
  - Term (kỳ hạn)
  - Payment schedule (lịch trả nợ)
  - Remaining balance (số dư còn lại)

**Khuyến nghị**:
- **Option 1**: Thêm model `Loan` với các fields: `principal`, `interestRate`, `term`, `startDate`, `endDate`, `remainingBalance`, `entityId`, `ledgerAccountId`
- **Option 2**: Giữ nguyên (Entity + JournalEntry + LedgerAccount) nếu không cần tracking chi tiết loan terms

**Quyết định**: Cần thảo luận với team về yêu cầu nghiệp vụ chi tiết cho loan management.

### 2.8 ✅ Thống Kê Báo Cáo

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `Posting` là nguồn dữ liệu chính cho báo cáo
- ✅ `CashflowGroup` và `CashflowGroupAccount` nhóm posting cho cashflow analysis
- ✅ `AccountRelation` hỗ trợ quan hệ giữa accounts cho báo cáo
- ✅ `LedgerBalanceSnapshot` hỗ trợ snapshot cho báo cáo số dư
- ✅ Indexes đầy đủ: `[userId, journalDate]`, `[ledgerAccountId]`, `[currencyId]`

**Vấn đề**: Không có vấn đề nghiêm trọng

---

## 3. Đánh Giá Typesafe

### 3.1 ✅ Enum Definitions

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerAccountKind`: asset, liability, equity, income, expense, memo
- ✅ `LedgerAccountSide`: debit, credit
- ✅ `JournalEntryType`: operational, valuation, adjustment, opening, closing
- ✅ `JournalEntryStatus`: draft, posted, voided, locked
- ✅ `PostingDirection`: debit, credit
- ✅ `LedgerCommodityType`: currency, security, property, liability, custom
- ✅ `AccountRelationType`: cashflow, valuation, payoff, adjustment
- ✅ `RecurringTemplateFrequency`: daily, weekly, monthly, quarterly, yearly, custom
- ✅ `RecurringTemplateStatus`: active, paused, archived
- ✅ `BudgetPeriod`: daily, monthly, quarterly, yearly, none

**Vấn đề**:
- ⚠️ **Deprecated enums**: Có các enum không còn sử dụng:
  - `AccountType` (cash, bank, credit_card, investment) - đã thay bằng `LedgerAccountKind`
  - `CategoryType` (expense, income, transfer, investment, loan) - đã thay bằng `LedgerAccountKind`
  - `TransactionType` - đã thay bằng `JournalEntryType`
  - `TradeSide` (buy, sell) - có thể dùng `PostingDirection`
  - `ContributionType` (deposit, withdrawal) - có thể dùng `PostingDirection`
  - `InvestmentAssetType`, `InvestmentMode` - đã thay bằng `LedgerCommodityType`

**Khuyến nghị**:
- Loại bỏ các enum deprecated nếu không còn sử dụng
- Hoặc giữ lại nếu cần cho migration/backward compatibility

### 3.2 ✅ Decimal Precision

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ Tất cả amount/price/quantity sử dụng `@db.Decimal(30, 10)`
- ✅ `Posting.amount`, `Posting.quantity`, `Posting.unitPrice`, `Posting.fee`
- ✅ `LedgerCommodityPrice.price`, `LedgerCommodityPrice.priceInBaseCurrency`
- ✅ `LedgerLot.quantity`, `LedgerLot.basisAmount`
- ✅ `Budget.amount`, `Goal.amount`

**Vấn đề**: Không có vấn đề

### 3.3 ✅ Required vs Optional Fields

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ Foreign keys bắt buộc: `userId`, `journalEntryId`, `ledgerAccountId`, `currencyId`
- ✅ Foreign keys optional: `entityId`, `eventId`, `commodityId`, `lotId`, `relatedAccountId`
- ✅ Metadata fields: `Json?` trong các model quan trọng

**Vấn đề**: Không có vấn đề

---

## 4. Đánh Giá Khả Năng Mở Rộng

### 4.1 ✅ Metadata Fields

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerCommodity.metadata`
- ✅ `JournalEntry.metadata`
- ✅ `Posting.metadata`
- ✅ `Budget.metadata`
- ✅ `LedgerAccount.metadata`
- ✅ `LedgerCommodityPrice.metadata`
- ✅ `AccountRelation.metadata`
- ✅ `CashflowGroup.metadata`

**Vấn đề**: Không có vấn đề

### 4.2 ✅ Extensible Enums

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerCommodityType.custom` hỗ trợ loại tùy chỉnh
- ✅ `JournalEntryType` có thể thêm loại mới
- ✅ `AccountRelationType` có thể thêm loại quan hệ mới
- ✅ `RecurringTemplateFrequency.custom` hỗ trợ tần suất tùy chỉnh

**Vấn đề**: Không có vấn đề

### 4.3 ✅ Flexible Relations

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `AccountRelation` quan hệ linh hoạt giữa accounts
- ✅ `CashflowGroup` nhóm linh hoạt cho cashflow analysis
- ✅ `LedgerAccount` hierarchy linh hoạt với `parentId`

**Vấn đề**: Không có vấn đề

---

## 5. Đánh Giá Tính Chặt Chẽ

### 5.1 ✅ Unique Constraints

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `LedgerAccount`: `@@unique([userId, code])`
- ✅ `LedgerCommodity`: `@@unique([userId, code])`
- ✅ `BudgetPeriodRecord`: `@@unique([budgetId, periodStartDate])`
- ✅ `LedgerBalanceSnapshot`: `@@unique([ledgerAccountId, asOfDate])`
- ✅ `AccountRelation`: `@@unique([userId, primaryAccountId, relatedAccountId, relationType])`
- ✅ `CashflowGroup`: `@@unique([userId, name])`
- ✅ `Tag`: `@@unique([userId, name])`
- ✅ `Entity`: `@@unique([userId, name])`
- ✅ `Event`: `@@unique([userId, name])`
- ✅ `JournalEntryTag`: `@@unique([journalEntryId, tagId])`
- ✅ `BudgetLedgerScope`: `@@unique([budgetId, ledgerAccountId])`
- ✅ `BudgetFundingScope`: `@@unique([budgetId, ledgerAccountId])`
- ✅ `GoalLedgerAccount`: `@@unique([goalId, ledgerAccountId])`
- ✅ `CashflowGroupAccount`: `@@unique([cashflowGroupId, ledgerAccountId])`

**Vấn đề**: Không có vấn đề

### 5.2 ✅ Indexes

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `JournalEntry`: `@@index([userId, journalDate])`
- ✅ `Posting`: `@@index([journalEntryId])`, `@@index([ledgerAccountId])`, `@@index([currencyId])`, `@@index([cashflowGroupId])`
- ✅ `LedgerAccount`: `@@index([userId, kind])`, `@@index([userId, parentId])`
- ✅ `LedgerCommodityPrice`: `@@index([commodityId, quotedAt])`
- ✅ `LedgerCommodity`: `@@index([type])`, `@@index([userId])`
- ✅ `LedgerLot`: `@@index([ledgerAccountId])`, `@@index([commodityId])`
- ✅ `LedgerRecurringTemplate`: `@@index([userId])`
- ✅ `LedgerRecurringTemplateLine`: `@@index([templateId])`

**Vấn đề**: Không có vấn đề

### 5.3 ✅ onDelete Constraints

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ **Cascade**: User data → User, Child records → Parent
- ✅ **Restrict**: Currency → User data (reference data)
- ✅ **SetNull**: Optional relations, hierarchical (parent-child)

**Vấn đề**: Không có vấn đề (đã được audit trong `ondelete-constraints-analysis.md`)

---

## 6. Đánh Giá Tính Đơn Giản

### 6.1 ⚠️ Loại Bỏ Redundancy

**Trạng thái**: ⚠️ **CẦN CẢI THIỆN**

**Phân tích**:
- ✅ `LedgerCommodity` đã thay thế `Currency` + asset models
- ✅ `JournalEntry` + `Posting` đã thay thế `Transaction`
- ⚠️ **Deprecated enums**: Có nhiều enum không còn sử dụng (xem 3.1)
- ⚠️ **Schema files**: Chia thành 6 files riêng biệt → khó maintain

**Khuyến nghị**:
- Gộp tất cả vào `schema.prisma` với comments phân nhóm
- Loại bỏ các enum deprecated nếu không còn sử dụng

### 6.2 ⚠️ Schema Organization

**Trạng thái**: ⚠️ **CẦN CẢI THIỆN**

**Vấn đề**:
- Schema chia thành 6 files riêng biệt
- Khó maintain và review
- Prisma không hỗ trợ multi-file schema (phải dùng script để gộp)

**Khuyến nghị**:
- Gộp tất cả vào `schema.prisma` với structure:
  ```prisma
  // ============================================
  // Generator & Datasource
  // ============================================
  
  // ============================================
  // Enums
  // ============================================
  
  // ============================================
  // System/Auth Models
  // ============================================
  
  // ============================================
  // Reference Data Models
  // ============================================
  
  // ============================================
  // Ledger Core Models
  // ============================================
  
  // ============================================
  // Planning Models (Budget, Goal)
  // ============================================
  
  // ============================================
  // System/Misc Models
  // ============================================
  ```

### 6.3 ✅ Field Simplification

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- Không có fields deprecated rõ ràng
- Các fields đều có mục đích rõ ràng

**Vấn đề**: Không có vấn đề

---

## 7. Đánh Giá Export-Friendly (Ledger/hledger/Beancount)

### 7.1 ✅ Ledger Format Support

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `JournalEntry.journalDate` → Ledger transaction date
- ✅ `JournalEntry.description` hoặc `Entity.name` → Ledger payee
- ✅ `Posting` → Ledger posting lines với account và amount
- ✅ `LedgerAccount.code` → Ledger account name
- ✅ `JournalEntryTag` → Ledger tags
- ✅ `Posting.memo` → Ledger posting memo
- ✅ `JournalEntry.metadata` → Ledger comments

**Mapping**:
```
Ledger Format:
YYYY-MM-DD [*|!] (code) Payee
    Account:Code    Amount Currency
    Account:Code    Amount Currency
    ; Metadata comments
```

**Khuyến nghị**:
- Tạo utility function để export:
  - `exportToLedger(journalEntries: JournalEntry[]): string`
  - Sử dụng `LedgerAccount.code` hoặc `LedgerAccount.path` cho account hierarchy

### 7.2 ✅ hledger Format Support

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ hledger tương thích với Ledger format
- ✅ `LedgerCommodity` → hledger commodity declaration
- ✅ `LedgerCommodityPrice` → hledger price directive

**Mapping**:
```
hledger Format:
commodity BTC
    note Bitcoin cryptocurrency

P YYYY-MM-DD Commodity Price Currency
```

**Khuyến nghị**:
- Tạo utility function:
  - `exportToHLedger(journalEntries: JournalEntry[], commodities: LedgerCommodity[]): string`

### 7.3 ✅ Beancount Format Support

**Trạng thái**: ✅ **ĐẠT**

**Phân tích**:
- ✅ `JournalEntry` → Beancount transaction
- ✅ `Posting` → Beancount posting với account, amount, currency
- ✅ `LedgerCommodity` → Beancount commodity
- ✅ `LedgerCommodityPrice` → Beancount price directive
- ✅ `JournalEntryType.opening/closing` → Beancount open/close directives

**Mapping**:
```
Beancount Format:
YYYY-MM-DD * "Payee" "Description"
    Account:Code    Amount Currency
    Account:Code    Amount Currency

YYYY-MM-DD commodity BTC
    name "Bitcoin"
    quote "USD"

YYYY-MM-DD price BTC 50000.00 USD
```

**Khuyến nghị**:
- Tạo utility function:
  - `exportToBeancount(journalEntries: JournalEntry[], commodities: LedgerCommodity[]): string`

---

## 8. Các Vấn Đề Tổng Hợp

### 8.1 ⚠️ Schema File Organization

**Mức độ**: Trung bình  
**Ưu tiên**: Trung bình

**Vấn đề**: Schema chia thành 6 files riêng biệt, khó maintain

**Giải pháp**: Gộp tất cả vào `schema.prisma` với comments phân nhóm

### 8.2 ⚠️ Vay Nợ (Loan/Debt) Model

**Mức độ**: Thấp  
**Ưu tiên**: Thấp (tùy yêu cầu nghiệp vụ)

**Vấn đề**: Không có model riêng cho Loan để lưu principal, interest rate, term, payment schedule

**Giải pháp**: 
- Option 1: Thêm model `Loan`
- Option 2: Giữ nguyên (Entity + JournalEntry + LedgerAccount)

### 8.3 ⚠️ Deprecated Enums

**Mức độ**: Thấp  
**Ưu tiên**: Thấp

**Vấn đề**: Có nhiều enum không còn sử dụng: `AccountType`, `CategoryType`, `TransactionType`, `TradeSide`, `ContributionType`, `InvestmentAssetType`, `InvestmentMode`

**Giải pháp**: Loại bỏ nếu không còn sử dụng, hoặc giữ lại cho backward compatibility

### 8.4 ⚠️ Validation Constraints

**Mức độ**: Trung bình  
**Ưu tiên**: Trung bình

**Vấn đề**: 
- Không có constraint đảm bảo mỗi JournalEntry có ít nhất 2 Posting
- Không có constraint đảm bảo tổng debit = tổng credit

**Giải pháp**: 
- Thêm validation ở application layer
- Hoặc thêm database trigger/check constraint

### 8.5 ✅ Export Utilities

**Mức độ**: N/A  
**Ưu tiên**: Thấp (có thể làm sau)

**Vấn đề**: Chưa có utility để export sang ledger/hledger/beancount

**Giải pháp**: Tạo utility functions (có thể làm sau khi schema ổn định)

---

## 9. Khuyến Nghị

### 9.1 Ưu Tiên Cao

1. **Gộp Schema Files**: Gộp tất cả vào `schema.prisma` với comments phân nhóm
2. **Validation**: Thêm validation ở application layer cho JournalEntry balance

### 9.2 Ưu Tiên Trung Bình

1. **Loan Model**: Thảo luận với team về yêu cầu nghiệp vụ, quyết định có cần model `Loan` không
2. **Deprecated Enums**: Review và loại bỏ các enum không còn sử dụng

### 9.3 Ưu Tiên Thấp

1. **Export Utilities**: Tạo utility functions để export sang ledger/hledger/beancount (có thể làm sau)

---

## 10. Kết Luận

### 10.1 Điểm Mạnh

- ✅ Schema đã chuyển đổi thành công sang double-entry accounting
- ✅ Hỗ trợ đầy đủ các yêu cầu nghiệp vụ cơ bản
- ✅ Typesafe với enum đầy đủ
- ✅ Decimal precision chính xác
- ✅ Constraints và indexes đầy đủ
- ✅ Metadata fields hỗ trợ mở rộng
- ✅ Export-friendly với các format ledger/hledger/beancount

### 10.2 Điểm Cần Cải Thiện

- ⚠️ Schema organization (chia nhiều files)
- ⚠️ Loan/Debt model (thiếu model riêng)
- ⚠️ Deprecated enums
- ⚠️ Validation constraints (cần ở application layer)

### 10.3 Tổng Đánh Giá

**Điểm số**: 8.5/10

Schema hiện tại **rất tốt** và đáp ứng đầy đủ các yêu cầu. Các vấn đề còn lại chủ yếu là về organization và một số tính năng nâng cao (Loan model). Với một số cải thiện nhỏ, schema sẽ đạt mức **xuất sắc**.

---

## 11. Next Steps

1. **Immediate**: Gộp schema files vào `schema.prisma`
2. **Short-term**: Thảo luận về Loan model, thêm validation
3. **Long-term**: Tạo export utilities, loại bỏ deprecated enums

