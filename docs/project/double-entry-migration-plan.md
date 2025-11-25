# Kế hoạch migration sang Ledger sổ kép

## Giai đoạn 0 – Chuẩn bị
- **Freeze schema**: chặn chỉnh sửa thêm vào các bảng `accounts`, `transactions`, `recurring_transactions`.
- **Seed cấu trúc chuẩn**: tạo script dựng chart-of-accounts gốc (Asset, Liability, Income, Expense, Equity) cho user mới + mapping mặc định từ account cũ → account ledger.
- **Bổ sung dual-write layer** trong service để khi tạo giao dịch mới sẽ sinh cả dữ liệu cũ và journal entry (để backfill realtime trước khi chuyển đổi hoàn toàn).

## Giai đoạn 1 – Tạo bảng mới
1. Tạo migration tạo tất cả bảng mới (`ledger_accounts`, `journal_entries`, `postings`, `ledger_lots`, `cashflow_groups`, `budget_*_scopes`, `goal_ledger_accounts`, các field mới trong investment...).
2. Giữ nguyên bảng cũ để hệ thống vẫn chạy.
3. Viết script `scripts/migrate/seed-ledger.ts`:
   - Với mỗi `accounts` hiện tại, tạo `ledger_accounts` tương ứng và lưu mapping vào bảng tạm `legacy_account_mapping`.
   - Với mỗi `categories`, tạo `ledger_accounts` con (Expense/Income) hoặc gắn thẳng vào tree tùy cấu hình.

## Giai đoạn 2 – Backfill dữ liệu lịch sử
1. Chạy batch chuyển `transactions` → `journal_entries` + `postings`.
   - Gom các bản ghi cùng `transfer_group_id` thành một journal entry với >=2 postings.
   - Đưa metadata cũ (`note`, `receipt_url`, `entity_id`, `event_id`, `investment_id`) vào `journal_entries.metadata`.
2. Tạo `ledger_lots` cho các khoản đầu tư/tiết kiệm có quantity > 0 dựa trên `investment_trades`.
3. Đồng bộ budgets/goals:
   - Với mỗi `budget_categories`/`budget_accounts` tạo bản ghi `budget_ledger_scopes`/`budget_funding_scopes` dựa theo mapping ledger account ở bước chuẩn bị.
   - Với mỗi `goal_accounts` tạo `goal_ledger_accounts`.
4. Gắn `investment_trades`, `investment_contributions`, `holdings` sang ledger account tương ứng.

## Giai đoạn 3 – Song song và kiểm thử
- Kích hoạt dual-read: báo cáo lấy dữ liệu từ cả postings (mặc định) nhưng có flag quay lại bảng cũ để đối chiếu.
- Viết test snapshot so sánh số dư theo `accounts.balance` và tổng postings theo `ledger_accounts`.
- Kiểm thử các case đặc biệt (loan, transfer đa tiền tệ, recurring templates).

## Giai đoạn 4 – Cutover
1. Tắt ghi nhận bảng cũ, bật hoàn toàn ledger (feature flag).
2. Chạy migration loại bỏ ràng buộc cũ trong code (xoá DTO/Service sử dụng `Account`/`Transaction`).
3. Đóng băng mapping `legacy_account_mapping` làm reference read-only.

## Giai đoạn 5 – Dọn dẹp & rollback
- Sau 1-2 chu kỳ release ổn định, drop bảng `accounts`, `transactions`, `recurring_transactions`, `budget_accounts`, `budget_categories`, `goal_accounts`.
- **Rollback strategy**: giữ nguyên snapshot DB trước Giai đoạn 4; nếu cần rollback, restore snapshot và bật lại flag dùng bảng cũ (vì dual-write đã đảm bảo dữ liệu không mất trước cutover).

## Công cụ hỗ trợ
- Script Prisma + Bun để migrate từng cụm bảng (sử dụng transaction per user để tránh lock lớn).
- Dashboard giám sát so sánh chênh lệch số dư (từ `ledger_balance_snapshots` vs legacy).

