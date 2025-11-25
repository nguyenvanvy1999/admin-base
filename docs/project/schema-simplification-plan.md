# Schema Simplification Plan

## Goals
- Gom toàn bộ định nghĩa Prisma vào `src/prisma/schema.prisma` để dễ đọc.
- Tối giản số bảng tài chính, chỉ giữ những bảng cần thiết để vận hành multi-currency double-entry, budgets, goals, recurring, loans/investments.

## Target Model Set
1. **System/Auth**: `User`, `AuthProvider`, `UserAuthProvider`, `Role`, `Permission`, `Session`, `Setting`, `Proxy`, `AuditLog`, `I18n`, `IPWhitelist`.
2. **Reference**: `Commodity` (thay `Currency` + asset security), `Entity`, `Event`, `Tag`.
3. **Ledger Core**: `LedgerAccount`, `JournalEntry`, `Posting`, `LedgerLot`, `AccountRelation`, `CashflowGroup`, `CashflowGroupAccount`.
4. **Automation**: `RecurringTemplate`, `RecurringTemplateLine`.
5. **Planning**: `Budget`, `BudgetScope` (chi tiêu + funding trong 1 bảng), `Goal`, `GoalScope`.

Các cấu trúc như `Investment`, `InvestmentTrade`, `InvestmentContribution`, `Holding`, `BudgetAccount`, `GoalAccount`, `Transaction`, `RecurringTransaction` bị loại bỏ. Đầu tư chỉ là ledger account + postings + lot.

## Implementation Steps
1. **Design schema**: cập nhật enum duy nhất (LedgerAccountKind, JournalEntryType, PostingDirection, CommodityType, RecurringFrequency, RecurringStatus, GoalStatus…) trực tiếp trong `schema.prisma`.
2. **Unify file**: di chuyển toàn bộ model vào `schema.prisma`, xoá các file `auth.prisma`, `expense.prisma`, `budget.prisma`… để Prisma chỉ dùng một schema.
3. **Docs**: cập nhật `docs/project/double-entry-module-alignment.md` + `double-entry-migration-plan.md` mô tả mô hình mới và chiến lược chuyển đổi (dual-write không còn investment tables).
4. **Follow-up**: Sau khi schema cố định, regenerate Prisma Client và lên kế hoạch refactor service/DTO tương ứng.

