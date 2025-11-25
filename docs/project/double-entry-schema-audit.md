# Double-Entry Refactor – Schema Audit

Tổng hợp nhanh các thực thể hiện có trong Prisma trước khi chuyển sang sổ kép để nắm các ràng buộc quan trọng.

## Các bảng cốt lõi hiện hữu

- `Account` (`src/prisma/expense.prisma`): lưu tài khoản ví/bank/credit, tham chiếu `Currency`, `User`, được `BudgetAccount`, `GoalAccount`, `InvestmentContribution`, `Transaction`, `RecurringTransaction`, `InvestmentTrade` sử dụng.
- `Category`: cây phân loại expense/income/transfer, gắn trực tiếp với `Transaction`, `Budget`, `RecurringTransaction`.
- `Transaction`: bản ghi đơn dòng, gồm `accountId`, `toAccountId`, `categoryId`, `investmentId`, `entityId`, `date`, `amount`, `currencyId`; được phần lớn dịch vụ đọc (accounting, reports, analytics).
- `RecurringTransaction`: lịch định kỳ chỉ tham chiếu `Account`, `Category`, `Currency`.

## Module phụ thuộc

- Budget (`Budget`, `BudgetCategory`, `BudgetAccount`, `BudgetPeriodRecord`) gắn trực tiếp `Account`/`Category`.
- Goal (`Goal`, `GoalAccount`) gắn `Account`.
- Investment (`Investment`, `InvestmentTrade`, `InvestmentContribution`, `Holding`, `InvestmentValuation`) dựa trên `Account` để ghi nhận nạp/rút.
- Analytics/Reports (không phải bảng riêng, nhưng các services & views dựa trên `Transaction` để tính cashflow, debt, income/expense).

## Tác động chính khi thay thế bằng ledger

1. `Account` phải chuyển thành chart-of-accounts đa cấp: các module khác sẽ tham chiếu tài khoản ledger thay vì bảng cũ.
2. `Transaction` & `RecurringTransaction` sẽ bị thay bằng `JournalEntry` + `Posting`, do đó mọi foreign key (`investment_trades.transactionId`, `transactions.eventId`, `transactions.entityId`, …) cần map sang `JournalEntry` hoặc `Posting`.
3. Các bảng junction (`BudgetAccount`, `GoalAccount`) cần đổi khóa ngoại từ `account_id` sang ledger account hoặc category tree.
4. `InvestmentContribution` và các bảng holdings cần cơ chế lot/valuation mới để đồng bộ với postings.

Audit này dùng làm baseline cho bước thiết kế schema mới và migration.

