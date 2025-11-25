# Double-Entry – Module Alignment

## Budgets

- `Budget` now có `anchor_account_id` trỏ tới `ledger_accounts` để lấy sub-tree mặc định.
- Hai bảng mới:
  - `budget_ledger_scopes`: xác định các tài khoản chi tiêu (Expense/Income) mà ngân sách sẽ track.
  - `budget_funding_scopes`: xác định nguồn nạp (thường là Asset/Liability) để tính dòng tiền cover budget.
- Mọi phép tính ngân sách sử dụng postings từ các ledger account nằm trong scope thay vì dựa vào `transaction.category_id`.

## Goals

- `goal_ledger_accounts` thay cho `goal_accounts`, cho phép một mục tiêu gom nhiều tài khoản ledger (tiết kiệm, đầu tư) và tận dụng số dư của chúng.

## Investments

- `investments.ledger_account_id` trỏ tới account tài sản đại diện vị thế.
- `investment_trades` liên kết trực tiếp `journal_entry_id` để biết bút toán kép của giao dịch; đồng thời lưu `asset_account_id` và `settlement_account_id` để phân tách cổ phiếu và tiền mặt.
- `investment_contributions` và `holdings` liên kết với ledger account, đảm bảo mỗi nạp/rút được phản ánh bằng postings.

## Analytics & Cashflow

- `journal_entries` + `postings` là nguồn dữ liệu duy nhất cho báo cáo income/expense, cashflow, debt.
- `cashflow_groups` cho phép gom các posting hoặc ledger account liên quan (ví dụ lãi FD) để phục vụ tính XIRR hay báo cáo tuỳ chỉnh.
- `account_relations` dùng để khai báo các liên hệ như `Asset:FD` nhận dòng tiền từ `Income:FD Interest`, hỗ trợ gom cashflow chính xác theo hướng dẫn double-entry.

